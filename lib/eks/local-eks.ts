import { randomUUID } from "crypto";
import { access, mkdir, readdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import {
  DescribeImagesCommand,
  DescribeInstancesCommand,
  RunInstancesCommand,
  TerminateInstancesCommand,
} from "@aws-sdk/client-ec2";
import { ec2Client } from "@/lib/aws-config";

export const DEFAULT_K3S_IMAGE = "rancher/k3s:v1.30.6-k3s1";
export const DEFAULT_KUBERNETES_VERSION = "1.30";
const DEFAULT_NODEPORT = 30080;
const DEFAULT_LOCAL_REGISTRY_HOST = "host.docker.internal";
const DEFAULT_LOCAL_REGISTRY_PORT = 5100;
const DEFAULT_ECR_REGISTRY_ACCOUNT = "000000000000";
const K3S_PRIVATE_REGISTRY_PATH = "/etc/rancher/k3s/registries.yaml";

const EKS_ROOT = path.join(process.cwd(), ".localstack-ui", "eks");
const CLUSTER_STATE_DIR = path.join(EKS_ROOT, "clusters");
const DEFAULT_EC2_AMI_CANDIDATES = [
  "ami-12345678",
  "ami-0abcdef1234567890",
  "ami-0c55b159cbfafe1f0",
];
const MAX_DISCOVERED_AMIS = 10;

let cachedEc2AmiId: string | null = null;

type NodeStatus = "running" | "stopped" | "error" | "terminated";

export interface LocalEksNode {
  nodeId: string;
  index: number;
  instanceId: string;
  containerId: string;
  containerName: string;
  hostNodePort: number;
  status: NodeStatus;
  createdAt: string;
}

export interface LocalEksSampleApp {
  namespace: string;
  appName: string;
  serviceName: string;
  image: string;
  nodePort: number;
  deployedAt: string;
}

export interface LocalEksApiGatewayExposure {
  restApiId: string;
  stageName: string;
  pathPart: string;
  invokeUrl: string;
  emulatorInvokeUrl?: string;
  backendUrl: string;
  createdAt: string;
}

export interface LocalEksCluster {
  clusterId: string;
  name: string;
  kubernetesVersion: string;
  networkName: string;
  controlPlane: {
    containerId: string;
    containerName: string;
    apiServerHostPort: number;
    status: NodeStatus;
  };
  nodeGroup: {
    nodeImage: string;
    minNodes: number;
    maxNodes: number;
    desiredNodes: number;
    targetCpuUtilization: number;
  };
  nodes: LocalEksNode[];
  sampleApp?: LocalEksSampleApp;
  apiGateway?: LocalEksApiGatewayExposure;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLocalEksClusterInput {
  name: string;
  kubernetesVersion?: string;
  nodeImage?: string;
  minNodes?: number;
  maxNodes?: number;
  desiredNodes?: number;
  targetCpuUtilization?: number;
}

interface RunDockerOptions {
  timeoutMs?: number;
  stdin?: string;
  acceptExitCodes?: number[];
}

function sanitizeName(name: string | undefined): string {
  return (name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureStateDir() {
  await mkdir(CLUSTER_STATE_DIR, { recursive: true });
}

function clusterStatePath(clusterId: string): string {
  return path.join(CLUSTER_STATE_DIR, `${clusterId}.json`);
}

function parseCpuPercent(value: string): number {
  const match = value.match(/([\d.,]+)/);
  if (!match) return 0;
  return Number.parseFloat(match[1].replace(",", ".")) || 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveLocalRegistryHost(): string {
  const host = (process.env.EKS_LOCAL_REGISTRY_HOST || "").trim();
  return host || DEFAULT_LOCAL_REGISTRY_HOST;
}

function resolveLocalRegistryPort(): number {
  const envValue =
    process.env.EKS_LOCAL_REGISTRY_PORT ||
    process.env.FLOCI_SERVICES_ECR_REGISTRY_BASE_PORT;
  const parsed = Number.parseInt(String(envValue || ""), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_LOCAL_REGISTRY_PORT;
  }
  return parsed;
}

function buildK3sRegistryConfigYaml(): string {
  const registryHost = resolveLocalRegistryHost();
  const registryPort = resolveLocalRegistryPort();
  const region = (process.env.AWS_REGION || "us-east-1").trim() || "us-east-1";
  const account =
    (process.env.AWS_ACCOUNT_ID || DEFAULT_ECR_REGISTRY_ACCOUNT).trim() ||
    DEFAULT_ECR_REGISTRY_ACCOUNT;
  const localRegistry = `${registryHost}:${registryPort}`;
  const ecrDomainRegistry = `${account}.dkr.ecr.${region}.localhost:${registryPort}`;

  return [
    "mirrors:",
    `  "${localRegistry}":`,
    "    endpoint:",
    `      - "http://${localRegistry}"`,
    `  "${ecrDomainRegistry}":`,
    "    endpoint:",
    `      - "http://${localRegistry}"`,
    "configs:",
    `  "${localRegistry}":`,
    "    tls:",
    "      insecure_skip_verify: true",
    `  "${ecrDomainRegistry}":`,
    "    tls:",
    "      insecure_skip_verify: true",
    "",
  ].join("\n");
}

function buildK3sBootstrapScript(role: "server" | "agent"): string {
  const registryConfig = buildK3sRegistryConfigYaml().replace(/\r/g, "");
  const launchCommand =
    role === "server"
      ? `exec k3s server --disable traefik --write-kubeconfig-mode=644 --private-registry ${K3S_PRIVATE_REGISTRY_PATH}`
      : `exec k3s agent --private-registry ${K3S_PRIVATE_REGISTRY_PATH}`;

  return [
    "set -eu",
    "mkdir -p /etc/rancher/k3s",
    `cat <<'EOF' > ${K3S_PRIVATE_REGISTRY_PATH}`,
    registryConfig,
    "EOF",
    launchCommand,
  ].join("\n");
}

async function runDocker(
  args: string[],
  options: RunDockerOptions = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const {
    timeoutMs = 60_000,
    stdin,
    acceptExitCodes = [0],
  } = options;

  return await new Promise((resolve, reject) => {
    const proc = spawn("docker", args, {
      shell: process.platform === "win32",
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(
        new Error(
          `Docker command timed out (${timeoutMs}ms): docker ${args.join(" ")}`,
        ),
      );
    }, timeoutMs);

    proc.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      const exitCode = code ?? -1;
      if (!acceptExitCodes.includes(exitCode)) {
        reject(
          new Error(
            stderr.trim() ||
              `Docker command failed (${exitCode}): docker ${args.join(" ")}`,
          ),
        );
        return;
      }
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode,
      });
    });

    if (stdin && proc.stdin) {
      proc.stdin.write(stdin);
      proc.stdin.end();
    }
  });
}

async function inspectContainerStatus(containerName: string): Promise<NodeStatus> {
  try {
    const result = await runDocker([
      "inspect",
      "-f",
      "{{.State.Status}}",
      containerName,
    ]);
    const status = result.stdout.toLowerCase();
    if (status === "running") return "running";
    if (status === "exited" || status === "created") return "stopped";
    return "error";
  } catch {
    return "terminated";
  }
}

async function ensureDockerAvailable() {
  await runDocker(["ps", "--format", "{{.ID}}"], { timeoutMs: 8_000 });
}

function uniqueNonEmpty(values: (string | undefined | null)[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = (value || "").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function splitEnvList(value: string | undefined): string[] {
  return uniqueNonEmpty((value || "").split(","));
}

function isImageNotFoundError(error: unknown): boolean {
  const err = error as {
    name?: string;
    code?: string;
    Code?: string;
    message?: string;
  };
  const raw = `${err?.name || ""} ${err?.code || ""} ${err?.Code || ""} ${
    err?.message || ""
  }`.toLowerCase();
  return (
    raw.includes("invalidamiid") ||
    raw.includes("invalidami") ||
    (raw.includes("image id") && raw.includes("does not exist"))
  );
}

async function discoverAmiIdsFromInstances(): Promise<string[]> {
  try {
    const response = await ec2Client.send(new DescribeInstancesCommand({}));
    const imageIds =
      response.Reservations?.flatMap((reservation) =>
        (reservation.Instances || [])
          .filter((instance) => instance.State?.Name !== "terminated")
          .map((instance) => instance.ImageId || ""),
      ) || [];
    return uniqueNonEmpty(imageIds).slice(0, MAX_DISCOVERED_AMIS);
  } catch {
    return [];
  }
}

async function discoverAmiIdsFromCatalog(): Promise<string[]> {
  try {
    const response = await ec2Client.send(new DescribeImagesCommand({}));
    const imageIds = (response.Images || []).map((image) => image.ImageId || "");
    return uniqueNonEmpty(imageIds).slice(0, MAX_DISCOVERED_AMIS);
  } catch {
    return [];
  }
}

async function resolveAmiCandidates(): Promise<string[]> {
  const [fromInstances, fromCatalog] = await Promise.all([
    discoverAmiIdsFromInstances(),
    discoverAmiIdsFromCatalog(),
  ]);

  const fromEnv = uniqueNonEmpty([
    process.env.EKS_NODE_AMI_ID,
    process.env.EC2_DEFAULT_AMI_ID,
    process.env.LOCALSTACK_UI_EC2_AMI_ID,
  ]);
  const fromEnvList = splitEnvList(process.env.EC2_AMI_CANDIDATES);

  return uniqueNonEmpty([
    cachedEc2AmiId,
    ...fromEnv,
    ...fromEnvList,
    ...fromInstances,
    ...fromCatalog,
    ...DEFAULT_EC2_AMI_CANDIDATES,
  ]);
}

async function getMappedHostPort(
  containerName: string,
  containerPort: number,
): Promise<number> {
  const result = await runDocker(["port", containerName, `${containerPort}/tcp`]);
  const line = result.stdout.split("\n").find((entry) => entry.includes(":"));
  if (!line) {
    throw new Error(
      `No se encontro mapeo de puerto para ${containerName}:${containerPort}`,
    );
  }
  const hostPort = Number.parseInt(line.split(":").pop() || "", 10);
  if (!hostPort || Number.isNaN(hostPort)) {
    throw new Error(`Puerto invalido para ${containerName}: ${line}`);
  }
  return hostPort;
}

async function waitForK3sToken(controlPlaneContainerName: string): Promise<string> {
  const tokenPath = "/var/lib/rancher/k3s/server/node-token";
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const tokenResult = await runDocker([
        "exec",
        controlPlaneContainerName,
        "cat",
        tokenPath,
      ]);
      const token = tokenResult.stdout.trim();
      if (token) {
        return token;
      }
    } catch {
      // waiting for control plane bootstrap
    }
    await sleep(2_000);
  }
  throw new Error(
    "No se pudo obtener el token del control plane k3s. Revisa logs del contenedor.",
  );
}

async function createEc2NodeInstanceTags(clusterName: string, index: number) {
  const amiCandidates = await resolveAmiCandidates();
  let lastImageError: unknown = null;

  for (const amiId of amiCandidates) {
    try {
      const instance = await ec2Client.send(
        new RunInstancesCommand({
          ImageId: amiId,
          InstanceType: "t2.micro",
          MinCount: 1,
          MaxCount: 1,
          TagSpecifications: [
            {
              ResourceType: "instance",
              Tags: [
                { Key: "Name", Value: `${clusterName}-worker-${index}` },
                { Key: "managed-by", Value: "localstack-ui" },
                { Key: "workload", Value: "eks-node" },
              ],
            },
          ],
        }),
      );

      const instanceId = instance.Instances?.[0]?.InstanceId;
      if (!instanceId) {
        throw new Error("No se obtuvo InstanceId al crear nodo EC2 simulado.");
      }

      cachedEc2AmiId = amiId;
      return instanceId;
    } catch (error) {
      if (isImageNotFoundError(error)) {
        lastImageError = error;
        continue;
      }
      throw error;
    }
  }

  const lastErrorMessage =
    lastImageError instanceof Error
      ? lastImageError.message
      : String(lastImageError || "");

  throw new Error(
    [
      "No se encontro un AMI valido para lanzar nodos EKS en este runtime.",
      `AMIs probados: ${amiCandidates.join(", ")}`,
      "Configura EKS_NODE_AMI_ID o EC2_DEFAULT_AMI_ID en el entorno del backend.",
      lastErrorMessage ? `Detalle: ${lastErrorMessage}` : "",
    ]
      .filter(Boolean)
      .join(" | "),
  );
}

async function terminateEc2Instance(instanceId: string): Promise<void> {
  await ec2Client.send(
    new TerminateInstancesCommand({
      InstanceIds: [instanceId],
    }),
  );
}

async function createEksNode(
  cluster: LocalEksCluster,
  token: string,
  index: number,
): Promise<LocalEksNode> {
  const instanceId = await createEc2NodeInstanceTags(cluster.name, index);
  const containerName = `ec2-${instanceId}`;

  try {
    const runResult = await runDocker(
      [
        "run",
        "-d",
        "--name",
        containerName,
        "--hostname",
        `${cluster.clusterId}-node-${index}`,
        "--network",
        cluster.networkName,
        "--privileged",
        "--add-host",
        "host.docker.internal:host-gateway",
        "-p",
        `0:${DEFAULT_NODEPORT}`,
        "--label",
        "managed-by=localstack-ui",
        "--label",
        "localstack-ui.eks=true",
        "--label",
        `localstack-ui.eks.cluster-id=${cluster.clusterId}`,
        "--label",
        "localstack-ui.eks.role=node",
        "--label",
        `localstack-ui.eks.node-index=${index}`,
        "--label",
        `instance_id=${instanceId}`,
        "--label",
        `ec2-instance-id=${instanceId}`,
        "--label",
        "ec2-instance=true",
        "--label",
        "ec2-instance-type=t2.micro",
        "--label",
        "instance-type=t2.micro",
        "--label",
        "vpc-id=none",
        "-e",
        `K3S_URL=https://${cluster.controlPlane.containerName}:6443`,
        "-e",
        `K3S_TOKEN=${token}`,
        "--entrypoint",
        "sh",
        cluster.nodeGroup.nodeImage,
        "-lc",
        buildK3sBootstrapScript("agent"),
      ],
      { timeoutMs: 120_000 },
    );

    const containerId = runResult.stdout.trim();
    if (!containerId) {
      throw new Error("No se obtuvo containerId para nodo EKS.");
    }

    const hostNodePort = await getMappedHostPort(containerName, DEFAULT_NODEPORT);

    return {
      nodeId: `node-${randomUUID().slice(0, 8)}`,
      index,
      instanceId,
      containerId,
      containerName,
      hostNodePort,
      status: "running",
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    try {
      await runDocker(["rm", "-f", containerName], { acceptExitCodes: [0, 1] });
    } catch {
      // noop
    }
    await terminateEc2Instance(instanceId);
    throw error;
  }
}

async function deleteEksNode(node: LocalEksNode): Promise<void> {
  try {
    await runDocker(["rm", "-f", node.containerName], {
      acceptExitCodes: [0, 1],
      timeoutMs: 45_000,
    });
  } catch {
    // noop
  }

  try {
    await terminateEc2Instance(node.instanceId);
  } catch {
    // noop
  }
}

export async function listLocalEksClusters(): Promise<LocalEksCluster[]> {
  await ensureStateDir();
  const files = await readdir(CLUSTER_STATE_DIR);
  const clusters: LocalEksCluster[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(path.join(CLUSTER_STATE_DIR, file), "utf8");
      const cluster = JSON.parse(raw) as LocalEksCluster;
      cluster.controlPlane.status = await inspectContainerStatus(
        cluster.controlPlane.containerName,
      );
      for (const node of cluster.nodes) {
        node.status = await inspectContainerStatus(node.containerName);
      }
      clusters.push(cluster);
    } catch {
      // ignore corrupted state files
    }
  }

  return clusters.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getLocalEksCluster(
  clusterId: string,
): Promise<LocalEksCluster | null> {
  await ensureStateDir();
  try {
    const raw = await readFile(clusterStatePath(clusterId), "utf8");
    const cluster = JSON.parse(raw) as LocalEksCluster;
    cluster.controlPlane.status = await inspectContainerStatus(
      cluster.controlPlane.containerName,
    );
    for (const node of cluster.nodes) {
      node.status = await inspectContainerStatus(node.containerName);
    }
    return cluster;
  } catch {
    return null;
  }
}

export async function saveLocalEksCluster(cluster: LocalEksCluster): Promise<void> {
  await ensureStateDir();
  cluster.updatedAt = new Date().toISOString();
  await writeFile(clusterStatePath(cluster.clusterId), JSON.stringify(cluster, null, 2));
}

export async function createLocalEksCluster(
  input: CreateLocalEksClusterInput,
): Promise<LocalEksCluster> {
  await ensureDockerAvailable();
  await ensureStateDir();

  const baseName = sanitizeName(input.name);
  if (!baseName) {
    throw new Error("El nombre del cluster no es valido.");
  }

  const existing = await listLocalEksClusters();
  if (existing.some((cluster) => cluster.name === baseName)) {
    throw new Error(`Ya existe un cluster con nombre '${baseName}'.`);
  }

  const minNodes = Math.max(1, input.minNodes ?? 1);
  const maxNodes = Math.max(minNodes, input.maxNodes ?? 3);
  const desiredNodes = Math.min(
    maxNodes,
    Math.max(minNodes, input.desiredNodes ?? minNodes),
  );
  const targetCpuUtilization = Math.min(
    95,
    Math.max(20, input.targetCpuUtilization ?? 60),
  );
  const nodeImage = (input.nodeImage || DEFAULT_K3S_IMAGE).trim();

  const clusterId = `eks-${baseName}-${randomUUID().slice(0, 6)}`;
  const networkName = `eks-${clusterId}`;
  const controlPlaneContainerName = `${clusterId}-control-plane`;
  const createdAt = new Date().toISOString();

  await runDocker([
    "network",
    "create",
    "--driver",
    "bridge",
    "--label",
    "managed-by=localstack-ui",
    "--label",
    "localstack-ui.eks=true",
    "--label",
    `localstack-ui.eks.cluster-id=${clusterId}`,
    networkName,
  ]);

  try {
    const controlResult = await runDocker(
      [
        "run",
        "-d",
        "--name",
        controlPlaneContainerName,
        "--hostname",
        controlPlaneContainerName,
        "--network",
        networkName,
        "--privileged",
        "--add-host",
        "host.docker.internal:host-gateway",
        "-p",
        "0:6443",
        "--label",
        "managed-by=localstack-ui",
        "--label",
        "localstack-ui.eks=true",
        "--label",
        `localstack-ui.eks.cluster-id=${clusterId}`,
        "--label",
        "localstack-ui.eks.role=control-plane",
        "--entrypoint",
        "sh",
        DEFAULT_K3S_IMAGE,
        "-lc",
        buildK3sBootstrapScript("server"),
      ],
      { timeoutMs: 120_000 },
    );
    const controlContainerId = controlResult.stdout.trim();
    const apiServerHostPort = await getMappedHostPort(
      controlPlaneContainerName,
      6443,
    );
    const token = await waitForK3sToken(controlPlaneContainerName);

    const cluster: LocalEksCluster = {
      clusterId,
      name: baseName,
      kubernetesVersion: input.kubernetesVersion || DEFAULT_KUBERNETES_VERSION,
      networkName,
      controlPlane: {
        containerId: controlContainerId,
        containerName: controlPlaneContainerName,
        apiServerHostPort,
        status: "running",
      },
      nodeGroup: {
        nodeImage,
        minNodes,
        maxNodes,
        desiredNodes,
        targetCpuUtilization,
      },
      nodes: [],
      createdAt,
      updatedAt: createdAt,
    };

    for (let index = 1; index <= desiredNodes; index += 1) {
      const node = await createEksNode(cluster, token, index);
      cluster.nodes.push(node);
    }

    await saveLocalEksCluster(cluster);
    return cluster;
  } catch (error) {
    try {
      await runDocker(["rm", "-f", controlPlaneContainerName], {
        acceptExitCodes: [0, 1],
      });
    } catch {
      // noop
    }
    try {
      await runDocker(["network", "rm", networkName], { acceptExitCodes: [0, 1] });
    } catch {
      // noop
    }
    throw error;
  }
}

async function scaleOut(cluster: LocalEksCluster, count: number): Promise<void> {
  const token = await waitForK3sToken(cluster.controlPlane.containerName);
  const nextIndex =
    cluster.nodes.reduce((max, node) => Math.max(max, node.index), 0) + 1;

  for (let i = 0; i < count; i += 1) {
    const node = await createEksNode(cluster, token, nextIndex + i);
    cluster.nodes.push(node);
  }
}

async function scaleIn(cluster: LocalEksCluster, count: number): Promise<void> {
  const candidates = [...cluster.nodes]
    .sort((a, b) => b.index - a.index)
    .slice(0, count);

  for (const node of candidates) {
    await deleteEksNode(node);
  }

  const nodeIdsToRemove = new Set(candidates.map((node) => node.nodeId));
  cluster.nodes = cluster.nodes.filter((node) => !nodeIdsToRemove.has(node.nodeId));
}

export async function scaleLocalEksCluster(
  clusterId: string,
  desiredNodes: number,
): Promise<LocalEksCluster> {
  const cluster = await getLocalEksCluster(clusterId);
  if (!cluster) {
    throw new Error(`Cluster '${clusterId}' no existe.`);
  }

  const safeDesired = Math.max(
    cluster.nodeGroup.minNodes,
    Math.min(cluster.nodeGroup.maxNodes, desiredNodes),
  );

  const current = cluster.nodes.length;
  if (safeDesired > current) {
    await scaleOut(cluster, safeDesired - current);
  } else if (safeDesired < current) {
    await scaleIn(cluster, current - safeDesired);
  }

  cluster.nodeGroup.desiredNodes = safeDesired;
  await saveLocalEksCluster(cluster);
  return cluster;
}

export async function reconcileLocalEksAutoscaling(
  clusterId: string,
): Promise<{ cluster: LocalEksCluster; averageCpu: number; action: string }> {
  const cluster = await getLocalEksCluster(clusterId);
  if (!cluster) {
    throw new Error(`Cluster '${clusterId}' no existe.`);
  }

  const runningNodes = cluster.nodes.filter((node) => node.status === "running");
  if (runningNodes.length === 0) {
    return { cluster, averageCpu: 0, action: "no-running-nodes" };
  }

  const cpuValues: number[] = [];
  for (const node of runningNodes) {
    try {
      const stats = await runDocker([
        "stats",
        "--no-stream",
        "--format",
        "{{.CPUPerc}}",
        node.containerName,
      ]);
      cpuValues.push(parseCpuPercent(stats.stdout));
    } catch {
      cpuValues.push(0);
    }
  }

  const averageCpu =
    cpuValues.reduce((sum, value) => sum + value, 0) / cpuValues.length;
  const target = cluster.nodeGroup.targetCpuUtilization;
  const upperThreshold = target + 5;
  const lowerThreshold = target - 15;
  let action = "none";

  if (averageCpu > upperThreshold && cluster.nodes.length < cluster.nodeGroup.maxNodes) {
    const scaled = await scaleLocalEksCluster(clusterId, cluster.nodes.length + 1);
    return { cluster: scaled, averageCpu, action: "scale-out" };
  }

  if (averageCpu < lowerThreshold && cluster.nodes.length > cluster.nodeGroup.minNodes) {
    const scaled = await scaleLocalEksCluster(clusterId, cluster.nodes.length - 1);
    return { cluster: scaled, averageCpu, action: "scale-in" };
  }

  await saveLocalEksCluster(cluster);
  return { cluster, averageCpu, action };
}

export async function deploySampleAppToLocalEks(
  clusterId: string,
  input?: {
    namespace?: string;
    appName?: string;
    image?: string;
  },
): Promise<LocalEksCluster> {
  const cluster = await getLocalEksCluster(clusterId);
  if (!cluster) {
    throw new Error(`Cluster '${clusterId}' no existe.`);
  }

  if (cluster.controlPlane.status !== "running") {
    throw new Error("Control plane no esta en estado running.");
  }

  const namespace = sanitizeName(input?.namespace || "study") || "study";
  const appName = sanitizeName(input?.appName || "study-api") || "study-api";
  const serviceName = `${appName}-svc`;
  const image = (input?.image || "nginxdemos/hello:plain-text").trim();

  const manifest = `apiVersion: v1
kind: Namespace
metadata:
  name: ${namespace}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${appName}
  namespace: ${namespace}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ${appName}
  template:
    metadata:
      labels:
        app: ${appName}
    spec:
      containers:
      - name: web
        image: ${image}
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: ${serviceName}
  namespace: ${namespace}
spec:
  type: NodePort
  selector:
    app: ${appName}
  ports:
  - port: 80
    targetPort: 80
    nodePort: ${DEFAULT_NODEPORT}
`;

  await runDocker(
    [
      "exec",
      "-i",
      cluster.controlPlane.containerName,
      "kubectl",
      "apply",
      "-f",
      "-",
    ],
    { timeoutMs: 120_000, stdin: manifest },
  );

  await runDocker(
    [
      "exec",
      cluster.controlPlane.containerName,
      "kubectl",
      "-n",
      namespace,
      "rollout",
      "status",
      `deployment/${appName}`,
      "--timeout=120s",
    ],
    { timeoutMs: 180_000 },
  );

  cluster.sampleApp = {
    namespace,
    appName,
    serviceName,
    image,
    nodePort: DEFAULT_NODEPORT,
    deployedAt: new Date().toISOString(),
  };

  await saveLocalEksCluster(cluster);
  return cluster;
}

export async function deleteLocalEksCluster(clusterId: string): Promise<void> {
  const cluster = await getLocalEksCluster(clusterId);
  if (!cluster) {
    return;
  }

  for (const node of cluster.nodes) {
    await deleteEksNode(node);
  }

  try {
    await runDocker(["rm", "-f", cluster.controlPlane.containerName], {
      acceptExitCodes: [0, 1],
      timeoutMs: 45_000,
    });
  } catch {
    // noop
  }

  try {
    await runDocker(["network", "rm", cluster.networkName], {
      acceptExitCodes: [0, 1],
      timeoutMs: 30_000,
    });
  } catch {
    // noop
  }

  try {
    await access(clusterStatePath(clusterId));
    await rm(clusterStatePath(clusterId));
  } catch {
    // noop
  }
}

export async function setLocalEksClusterApiGatewayExposure(
  clusterId: string,
  apiGateway: LocalEksApiGatewayExposure,
): Promise<LocalEksCluster> {
  const cluster = await getLocalEksCluster(clusterId);
  if (!cluster) {
    throw new Error(`Cluster '${clusterId}' no existe.`);
  }
  cluster.apiGateway = apiGateway;
  await saveLocalEksCluster(cluster);
  return cluster;
}
