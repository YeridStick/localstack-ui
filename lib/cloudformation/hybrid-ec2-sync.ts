import { spawn } from "child_process";
import { cloudFormationClient, ec2Client } from "@/lib/aws-config";
import { DescribeStackResourcesCommand } from "@aws-sdk/client-cloudformation";
import {
  CreateTagsCommand,
  DescribeInstancesCommand,
  type Instance,
  type Tag,
} from "@aws-sdk/client-ec2";

interface RunDockerOptions {
  timeoutMs?: number;
  acceptExitCodes?: number[];
}

interface EnsureHybridEc2Result {
  state: "created" | "existing" | "skipped";
  instanceId: string;
  containerId?: string;
  reason?: string;
}

export interface HybridEc2StackSyncResult {
  stackName: string;
  ec2Resources: number;
  ec2WithPhysicalId: number;
  created: number;
  existing: number;
  skipped: number;
  errors: string[];
}

export interface HybridEc2CleanupResult {
  stackName: string;
  removedContainers: number;
  errors: string[];
}

const stackSyncJobs = new Map<string, Promise<void>>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function parseDockerIds(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function runDocker(
  args: string[],
  options: RunDockerOptions = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const { timeoutMs = 15_000, acceptExitCodes = [0] } = options;

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
  });
}

async function canUseDocker(): Promise<boolean> {
  try {
    await runDocker(["ps", "--format", "{{.ID}}"], { timeoutMs: 5_000 });
    return true;
  } catch {
    return false;
  }
}

async function findContainerForInstance(instanceId: string): Promise<string | null> {
  const checks: string[][] = [
    [
      "ps",
      "-a",
      "--filter",
      `label=instance_id=${instanceId}`,
      "--format",
      "{{.ID}}",
    ],
    [
      "ps",
      "-a",
      "--filter",
      `label=ec2-instance-id=${instanceId}`,
      "--format",
      "{{.ID}}",
    ],
    ["ps", "-a", "--filter", `name=ec2-${instanceId}`, "--format", "{{.ID}}"],
  ];

  for (const args of checks) {
    try {
      const result = await runDocker(args);
      const found = parseDockerIds(result.stdout)[0];
      if (found) {
        return found;
      }
    } catch {
      // ignore and continue
    }
  }

  return null;
}

function toTagMap(tags: Tag[] | undefined): Record<string, string> {
  return (tags || []).reduce(
    (accumulator, tag) => {
      if (tag.Key && tag.Value) {
        accumulator[tag.Key] = tag.Value;
      }
      return accumulator;
    },
    {} as Record<string, string>,
  );
}

function resolveDockerImage(imageId: string | undefined, tags: Record<string, string>) {
  if (tags.DockerImage && tags.DockerImage.includes(":")) {
    return tags.DockerImage;
  }

  const imageMap: Record<string, string> = {
    "ami-12345678": "alpine:latest",
    "ami-87654321": "ubuntu:20.04",
    "ami-abcd1234": "mcr.microsoft.com/windows/nanoserver:ltsc2022",
    "ami-ubuntu": "ubuntu:22.04",
    "ami-nginx": "nginx:alpine",
  };

  return imageMap[imageId || ""] || "alpine:latest";
}

async function getEc2Instance(instanceId: string): Promise<Instance | null> {
  const response = await ec2Client.send(
    new DescribeInstancesCommand({
      InstanceIds: [instanceId],
    }),
  );

  return (
    response.Reservations?.flatMap((reservation) => reservation.Instances || [])[0] ||
    null
  );
}

async function resolveNetworkName(vpcId: string | undefined): Promise<string> {
  if (!vpcId) {
    return "bridge";
  }

  const result = await runDocker([
    "network",
    "ls",
    "--filter",
    `label=vpc-id=${vpcId}`,
    "--format",
    "{{.Name}}",
  ]);

  return parseDockerIds(result.stdout)[0] || "bridge";
}

export async function ensureHybridEc2ContainerForInstance(input: {
  instanceId: string;
  stackName?: string;
  logicalResourceId?: string;
}): Promise<EnsureHybridEc2Result> {
  const dockerEnabled = await canUseDocker();
  if (!dockerEnabled) {
    return {
      state: "skipped",
      instanceId: input.instanceId,
      reason: "Docker no esta disponible para sincronizar EC2 hibrida.",
    };
  }

  const existingContainerId = await findContainerForInstance(input.instanceId);
  if (existingContainerId) {
    return {
      state: "existing",
      instanceId: input.instanceId,
      containerId: existingContainerId,
    };
  }

  const instance = await getEc2Instance(input.instanceId);
  if (!instance?.InstanceId) {
    return {
      state: "skipped",
      instanceId: input.instanceId,
      reason: "La instancia EC2 no existe en el emulador.",
    };
  }

  if (instance.State?.Name === "terminated") {
    return {
      state: "skipped",
      instanceId: input.instanceId,
      reason: "La instancia EC2 ya esta terminada.",
    };
  }

  const tags = toTagMap(instance.Tags);
  const dockerImage = resolveDockerImage(instance.ImageId, tags);
  const instanceType = String(instance.InstanceType || "t2.micro");
  const networkName = await resolveNetworkName(instance.VpcId);
  const containerName = `ec2-${input.instanceId}`;

  const dockerArgs = [
    "run",
    "-d",
    "--name",
    containerName,
    "--network",
    networkName,
    "--label",
    `instance_id=${input.instanceId}`,
    "--label",
    `ec2-instance-id=${input.instanceId}`,
    "--label",
    "managed-by=localstack-ui",
    "--label",
    "ec2-instance=true",
    "--label",
    `instance-type=${instanceType}`,
    "--label",
    `ec2-instance-type=${instanceType}`,
    "--label",
    `vpc-id=${instance.VpcId || "none"}`,
    "--label",
    "cloudformation-managed=true",
    dockerImage,
    "tail",
    "-f",
    "/dev/null",
  ];

  if (input.stackName) {
    dockerArgs.splice(dockerArgs.length - 4, 0, "--label", `cloudformation-stack-name=${input.stackName}`);
  }

  if (input.logicalResourceId) {
    dockerArgs.splice(
      dockerArgs.length - 4,
      0,
      "--label",
      `cloudformation-logical-id=${input.logicalResourceId}`,
    );
  }

  const createContainer = await runDocker(dockerArgs, { timeoutMs: 40_000 });

  try {
    const updateTags: Tag[] = [
      { Key: "managed-by", Value: "localstack-ui" },
      { Key: "DockerImage", Value: dockerImage },
    ];

    if (input.stackName) {
      updateTags.push({ Key: "cloudformation-stack", Value: input.stackName });
    }

    await ec2Client.send(
      new CreateTagsCommand({
        Resources: [input.instanceId],
        Tags: updateTags,
      }),
    );
  } catch (error) {
    console.warn(
      `No se pudieron actualizar tags para instancia ${input.instanceId}: ${toErrorMessage(error)}`,
    );
  }

  return {
    state: "created",
    instanceId: input.instanceId,
    containerId: createContainer.stdout,
  };
}

async function removeContainerById(containerId: string): Promise<void> {
  await runDocker(["rm", "-f", containerId], {
    acceptExitCodes: [0, 1],
    timeoutMs: 20_000,
  });
}

async function listContainersWithFilter(args: string[]): Promise<string[]> {
  const result = await runDocker(args);
  return parseDockerIds(result.stdout);
}

export async function cleanupHybridEc2ContainersForStack(
  stackName: string,
): Promise<HybridEc2CleanupResult> {
  const summary: HybridEc2CleanupResult = {
    stackName,
    removedContainers: 0,
    errors: [],
  };

  if (!(await canUseDocker())) {
    summary.errors.push(
      "Docker no esta disponible para limpiar contenedores EC2 del stack.",
    );
    return summary;
  }

  const removedIds = new Set<string>();

  try {
    const resources = await cloudFormationClient.send(
      new DescribeStackResourcesCommand({ StackName: stackName }),
    );

    const containerIds = new Set<string>();

    for (const resource of resources.StackResources || []) {
      if (
        resource.ResourceType !== "AWS::EC2::Instance" ||
        !resource.PhysicalResourceId
      ) {
        continue;
      }

      try {
        const byLabel = await listContainersWithFilter([
          "ps",
          "-a",
          "-q",
          "--filter",
          `label=instance_id=${resource.PhysicalResourceId}`,
        ]);
        const byCompatLabel = await listContainersWithFilter([
          "ps",
          "-a",
          "-q",
          "--filter",
          `label=ec2-instance-id=${resource.PhysicalResourceId}`,
        ]);
        const byName = await listContainersWithFilter([
          "ps",
          "-a",
          "-q",
          "--filter",
          `name=ec2-${resource.PhysicalResourceId}`,
        ]);

        for (const id of [...byLabel, ...byCompatLabel, ...byName]) {
          containerIds.add(id);
        }
      } catch (error) {
        summary.errors.push(
          `No se pudo limpiar contenedor de ${resource.PhysicalResourceId}: ${toErrorMessage(error)}`,
        );
      }
    }

    for (const id of containerIds) {
      if (removedIds.has(id)) {
        continue;
      }
      await removeContainerById(id);
      removedIds.add(id);
      summary.removedContainers += 1;
    }
  } catch (error) {
    summary.errors.push(
      `No se pudo leer recursos EC2 del stack '${stackName}': ${toErrorMessage(error)}`,
    );
  }

  try {
    const removedByStackLabel = await listContainersWithFilter([
      "ps",
      "-a",
      "-q",
      "--filter",
      `label=cloudformation-stack-name=${stackName}`,
    ]);
    for (const id of removedByStackLabel) {
      if (removedIds.has(id)) {
        continue;
      }
      await removeContainerById(id);
      removedIds.add(id);
      summary.removedContainers += 1;
    }
  } catch (error) {
    summary.errors.push(
      `No se pudieron limpiar contenedores por label del stack: ${toErrorMessage(error)}`,
    );
  }

  return summary;
}

export async function syncHybridEc2ContainersForStack(
  stackName: string,
): Promise<HybridEc2StackSyncResult> {
  const summary: HybridEc2StackSyncResult = {
    stackName,
    ec2Resources: 0,
    ec2WithPhysicalId: 0,
    created: 0,
    existing: 0,
    skipped: 0,
    errors: [],
  };

  try {
    const resources = await cloudFormationClient.send(
      new DescribeStackResourcesCommand({
        StackName: stackName,
      }),
    );

    const ec2Resources = (resources.StackResources || []).filter(
      (resource) => resource.ResourceType === "AWS::EC2::Instance",
    );

    summary.ec2Resources = ec2Resources.length;

    for (const resource of ec2Resources) {
      if (!resource.PhysicalResourceId) {
        continue;
      }
      summary.ec2WithPhysicalId += 1;

      try {
        const result = await ensureHybridEc2ContainerForInstance({
          instanceId: resource.PhysicalResourceId,
          stackName,
          logicalResourceId: resource.LogicalResourceId,
        });

        if (result.state === "created") {
          summary.created += 1;
        } else if (result.state === "existing") {
          summary.existing += 1;
        } else {
          summary.skipped += 1;
        }
      } catch (error) {
        summary.errors.push(
          `${resource.PhysicalResourceId}: ${toErrorMessage(error)}`,
        );
      }
    }
  } catch (error) {
    summary.errors.push(toErrorMessage(error));
  }

  return summary;
}

export function scheduleHybridEc2SyncForStack(
  stackName: string,
  options?: { attempts?: number; intervalMs?: number },
): void {
  if (stackSyncJobs.has(stackName)) {
    return;
  }

  const attempts = Math.max(1, options?.attempts ?? 15);
  const intervalMs = Math.max(500, options?.intervalMs ?? 4_000);

  const job = (async () => {
    let lastSummary: HybridEc2StackSyncResult | null = null;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      lastSummary = await syncHybridEc2ContainersForStack(stackName);

      const hasAllPhysicalIds =
        lastSummary.ec2Resources === 0 ||
        lastSummary.ec2WithPhysicalId >= lastSummary.ec2Resources;
      const hasNoHardErrors = lastSummary.errors.length === 0;

      if (hasAllPhysicalIds && hasNoHardErrors) {
        break;
      }

      if (attempt < attempts) {
        await sleep(intervalMs);
      }
    }

    if (!lastSummary) {
      return;
    }

    if (lastSummary.errors.length > 0) {
      console.warn(
        `Hybrid EC2 sync warnings for stack '${stackName}':`,
        lastSummary.errors,
      );
    }
  })()
    .catch((error) => {
      console.error(
        `Hybrid EC2 sync failed for stack '${stackName}':`,
        toErrorMessage(error),
      );
    })
    .finally(() => {
      stackSyncJobs.delete(stackName);
    });

  stackSyncJobs.set(stackName, job);
}
