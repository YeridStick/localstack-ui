import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { checkAwsEmulatorHealth } from "@/lib/aws/emulator-health";
import { getAwsRuntimeConfig } from "@/lib/aws/runtime-config";

type EcrEndpointStrategy = "off" | "domain";

interface DockerRunOptions {
  timeoutMs?: number;
  acceptExitCodes?: number[];
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

interface EcrEnvConfig {
  exists: boolean;
  hasToken: boolean;
  endpointStrategy: EcrEndpointStrategy;
  token?: string;
}

const ECR_ENV_FILE = "ecr-real.env";
const DEFAULT_STRATEGY: EcrEndpointStrategy = "off";
const VALID_STRATEGIES = new Set<EcrEndpointStrategy>(["off", "domain"]);
const MINISTACK_IMAGE = "ministackorg/ministack:latest";
const LOCALSTACK_IMAGE = "localstack/localstack:latest";
const LOCALSTACK_DATA_VOLUME = "localstack-ui_localstack-data";
const DEFAULT_RUNTIME_NETWORK = "localstack-ui_default";
const DEFAULT_RUNTIME_ALIAS = "ministack";
const MINISTACK_RUNTIME_CONTAINER_NAME = "localstack-ui-runtime-ministack";
const LOCALSTACK_RUNTIME_CONTAINER_NAME = "localstack-ui-runtime-localstack";
const MINISTACK_LEGACY_COMPOSE_CONTAINER_NAME = "localstack-ui-ministack-1";
const LOCALSTACK_LEGACY_COMPOSE_CONTAINER_NAME = "localstack-ui-localstack-1";
const LOCALSTACK_SERVICES =
  "ecr,sts,iam,s3,cloudformation,apigateway,lambda,logs,cloudwatch,events,sqs,secretsmanager,dynamodb,ec2,rds";

function normalizeStrategy(input: unknown): EcrEndpointStrategy {
  const raw = typeof input === "string" ? input.trim().toLowerCase() : "";
  if (raw === "path") {
    // LocalStack 2026.x no longer accepts "path" for ECR endpoint strategy.
    // Keep backward-compatibility in UI/API by translating it to "off".
    return "off";
  }
  return VALID_STRATEGIES.has(raw as EcrEndpointStrategy)
    ? (raw as EcrEndpointStrategy)
    : DEFAULT_STRATEGY;
}

async function runCommand(
  binary: string,
  args: string[],
  options: DockerRunOptions = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const { timeoutMs = 120_000, acceptExitCodes = [0], env, cwd } = options;

  return await new Promise((resolve, reject) => {
    const proc = spawn(binary, args, {
      shell: process.platform === "win32",
      windowsHide: true,
      env: env || process.env,
      cwd: cwd || process.cwd(),
    });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(
        new Error(
          `Command timed out (${timeoutMs}ms): ${binary} ${args.join(" ")}`,
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
              `Command failed (${exitCode}): ${binary} ${args.join(" ")}`,
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

async function runDocker(
  args: string[],
  options: DockerRunOptions = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return runCommand("docker", args, options);
}

async function runCompose(
  args: string[],
  options: DockerRunOptions = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    return await runDocker(["compose", ...args], options);
  } catch (error) {
    try {
      return await runCommand("docker-compose", args, options);
    } catch {
      throw error;
    }
  }
}

function parseEcrEnv(content: string): EcrEnvConfig {
  const lines = content.split(/\r?\n/);
  let token = "";
  let strategy: EcrEndpointStrategy = DEFAULT_STRATEGY;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const [key, ...valueParts] = line.split("=");
    const value = valueParts.join("=").trim();

    if (key === "LOCALSTACK_AUTH_TOKEN") token = value;
    if (key === "ECR_ENDPOINT_STRATEGY") strategy = normalizeStrategy(value);
  }

  return {
    exists: true,
    hasToken: Boolean(token),
    endpointStrategy: strategy,
    token: token || undefined,
  };
}

async function readEcrEnvConfig(): Promise<EcrEnvConfig> {
  const filePath = path.join(process.cwd(), ECR_ENV_FILE);
  try {
    const content = await readFile(filePath, "utf8");
    return parseEcrEnv(content);
  } catch {
    return {
      exists: false,
      hasToken: false,
      endpointStrategy: DEFAULT_STRATEGY,
    };
  }
}

async function saveEcrEnvConfig(token: string, strategy: EcrEndpointStrategy) {
  const filePath = path.join(process.cwd(), ECR_ENV_FILE);
  const content = [
    "# Generated by localstack-ui ECR runtime switch",
    `LOCALSTACK_AUTH_TOKEN=${token}`,
    `ECR_ENDPOINT_STRATEGY=${strategy}`,
    "",
  ].join("\n");

  await writeFile(filePath, content, "utf8");
}

async function ensureDockerReady() {
  await runDocker(["ps", "--format", "{{.ID}}"], { timeoutMs: 10_000 });
}

async function ensureComposeReady() {
  await runCompose(["version"], { timeoutMs: 10_000 });
}

function splitLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function getContainerIdsByImage(imageRef: string): Promise<string[]> {
  const result = await runDocker(
    ["ps", "-aq", "--filter", `ancestor=${imageRef}`],
    { timeoutMs: 12_000, acceptExitCodes: [0, 1] },
  );
  return splitLines(result.stdout);
}

async function removeContainersByIds(containerIds: string[]) {
  for (const containerId of containerIds) {
    await runDocker(["rm", "-f", containerId], {
      timeoutMs: 30_000,
      acceptExitCodes: [0, 1],
    });
  }
}

async function removeContainerByName(containerName: string) {
  await runDocker(["rm", "-f", containerName], {
    timeoutMs: 30_000,
    acceptExitCodes: [0, 1],
  });
}

async function networkExists(networkName: string): Promise<boolean> {
  try {
    await runDocker(["network", "inspect", networkName], {
      timeoutMs: 10_000,
    });
    return true;
  } catch {
    return false;
  }
}

async function getRuntimeNetworkArgs(): Promise<string[]> {
  if (await networkExists(DEFAULT_RUNTIME_NETWORK)) {
    return [
      "--network",
      DEFAULT_RUNTIME_NETWORK,
      "--network-alias",
      DEFAULT_RUNTIME_ALIAS,
    ];
  }
  return [];
}

async function stopAndRemoveMinistackContainers() {
  await removeContainerByName(MINISTACK_RUNTIME_CONTAINER_NAME);
  await removeContainerByName(MINISTACK_LEGACY_COMPOSE_CONTAINER_NAME);
  const ids = await getContainerIdsByImage(MINISTACK_IMAGE);
  await removeContainersByIds(ids);
}

async function stopAndRemoveLocalstackContainers() {
  await removeContainerByName(LOCALSTACK_RUNTIME_CONTAINER_NAME);
  await removeContainerByName(LOCALSTACK_LEGACY_COMPOSE_CONTAINER_NAME);
  const ids = await getContainerIdsByImage(LOCALSTACK_IMAGE);
  await removeContainersByIds(ids);
}

async function startMinistackFallback() {
  await stopAndRemoveMinistackContainers();
  const networkArgs = await getRuntimeNetworkArgs();
  await runDocker(
    [
      "run",
      "-d",
      "--name",
      MINISTACK_RUNTIME_CONTAINER_NAME,
      ...networkArgs,
      "-p",
      "4566:4566",
      "--restart",
      "unless-stopped",
      "--label",
      "managed-by=localstack-ui",
      MINISTACK_IMAGE,
    ],
    { timeoutMs: 120_000 },
  );
}

async function startLocalstackFallback(
  token: string,
  endpointStrategy: EcrEndpointStrategy,
) {
  await stopAndRemoveLocalstackContainers();
  const networkArgs = await getRuntimeNetworkArgs();
  await runDocker(["volume", "create", LOCALSTACK_DATA_VOLUME], {
    timeoutMs: 30_000,
    acceptExitCodes: [0, 1],
  });

  await runDocker(
    [
      "run",
      "-d",
      "--name",
      LOCALSTACK_RUNTIME_CONTAINER_NAME,
      ...networkArgs,
      "-p",
      "4566:4566",
      "-p",
      "4510:4510",
      "--restart",
      "unless-stopped",
      "--label",
      "managed-by=localstack-ui",
      "-e",
      `LOCALSTACK_AUTH_TOKEN=${token}`,
      "-e",
      `SERVICES=${LOCALSTACK_SERVICES}`,
      "-e",
      `ECR_ENDPOINT_STRATEGY=${endpointStrategy}`,
      "-v",
      `${LOCALSTACK_DATA_VOLUME}:/var/lib/localstack`,
      "-v",
      "/var/run/docker.sock:/var/run/docker.sock",
      LOCALSTACK_IMAGE,
    ],
    { timeoutMs: 180_000 },
  );
}

async function detectBackendFromDocker(): Promise<"ministack" | "localstack" | "unknown"> {
  const result = await runDocker(["ps", "--format", "{{.Image}}"], {
    timeoutMs: 10_000,
    acceptExitCodes: [0, 1],
  });
  const images = splitLines(result.stdout);
  if (images.some((image) => image.includes("localstack/localstack"))) {
    return "localstack";
  }
  if (images.some((image) => image.includes("ministackorg/ministack"))) {
    return "ministack";
  }
  return "unknown";
}

async function resolveBackendFast(dockerReady: boolean): Promise<{
  backend: "ministack" | "localstack" | "unknown";
  endpoint: string;
  healthPath: string | null;
}> {
  const runtime = getAwsRuntimeConfig();

  if (dockerReady) {
    const backendFromDocker = await detectBackendFromDocker();
    if (backendFromDocker !== "unknown") {
      return {
        backend: backendFromDocker,
        endpoint: runtime.endpoint,
        healthPath: null,
      };
    }
  }

  const emulatorHealth = await checkAwsEmulatorHealth();
  return {
    backend: emulatorHealth.backend,
    endpoint: emulatorHealth.endpoint,
    healthPath: emulatorHealth.healthPath,
  };
}

async function switchToRealMode(
  tokenInput: string | undefined,
  strategyInput: unknown,
  canUseCompose: boolean,
) {
  const existing = await readEcrEnvConfig();
  const token =
    tokenInput?.trim() ||
    existing.token ||
    process.env.LOCALSTACK_AUTH_TOKEN ||
    "";
  if (!token) {
    throw new Error(
      "LOCALSTACK_AUTH_TOKEN requerido. Ingresalo en la UI para activar ECR real.",
    );
  }

  const endpointStrategy = normalizeStrategy(
    strategyInput || existing.endpointStrategy,
  );
  await saveEcrEnvConfig(token, endpointStrategy);

  if (canUseCompose) {
    await runCompose(["stop", "ministack"], {
      acceptExitCodes: [0, 1],
      timeoutMs: 45_000,
    });
    await runCompose(["rm", "-f", "ministack"], {
      acceptExitCodes: [0, 1],
      timeoutMs: 45_000,
    });

    await runCompose(
      [
        "-f",
        "docker-compose.ecr-real.yml",
        "--env-file",
        ECR_ENV_FILE,
        "up",
        "-d",
        "localstack",
      ],
      {
        timeoutMs: 180_000,
        env: {
          ...process.env,
          LOCALSTACK_AUTH_TOKEN: token,
          ECR_ENDPOINT_STRATEGY: endpointStrategy,
        },
      },
    );
  } else {
    await stopAndRemoveMinistackContainers();
    await startLocalstackFallback(token, endpointStrategy);
  }

  return {
    switchedTo: "real" as const,
    endpointStrategy,
    orchestration: canUseCompose ? "compose" : "docker-run",
  };
}

async function switchToBaseMode(canUseCompose: boolean) {
  if (canUseCompose) {
    await runCompose(
      ["-f", "docker-compose.ecr-real.yml", "stop", "localstack"],
      {
        acceptExitCodes: [0, 1],
        timeoutMs: 45_000,
      },
    );

    await runCompose(
      ["-f", "docker-compose.ecr-real.yml", "rm", "-f", "localstack"],
      {
        acceptExitCodes: [0, 1],
        timeoutMs: 45_000,
      },
    );

    await runCompose(["up", "-d", "ministack"], {
      timeoutMs: 120_000,
    });
  } else {
    await stopAndRemoveLocalstackContainers();
    await startMinistackFallback();
  }

  return {
    switchedTo: "base" as const,
    orchestration: canUseCompose ? "compose" : "docker-run",
  };
}

export async function GET() {
  try {
    const envConfig = await readEcrEnvConfig();
    let dockerReady = true;
    let composeReady = true;
    let dockerError: string | undefined;
    let composeError: string | undefined;

    try {
      await ensureDockerReady();
    } catch (error: any) {
      dockerReady = false;
      dockerError = error?.message || "Docker no disponible";
    }

    if (dockerReady) {
      try {
        await ensureComposeReady();
      } catch (error: any) {
        composeReady = false;
        composeError = error?.message || "Docker Compose no disponible";
      }
    } else {
      composeReady = false;
    }

    const emulatorHealth = await resolveBackendFast(dockerReady);
    const mode =
      emulatorHealth.backend === "localstack"
        ? "real"
        : emulatorHealth.backend === "ministack"
          ? "metadata"
          : "unknown";

    return NextResponse.json({
      mode,
      backend: emulatorHealth.backend,
      endpoint: emulatorHealth.endpoint,
      healthPath: emulatorHealth.healthPath || undefined,
      dockerReady,
      composeReady,
      dockerError,
      composeError,
      ecrRealEnv: {
        exists: envConfig.exists,
        hasToken: envConfig.hasToken,
        endpointStrategy: envConfig.endpointStrategy,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "No se pudo obtener estado de runtime ECR",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDockerReady();
    let composeReady = true;
    try {
      await ensureComposeReady();
    } catch {
      composeReady = false;
    }

    const body = await request.json();
    const action = typeof body?.action === "string" ? body.action : "";

    if (action !== "switch-to-real" && action !== "switch-to-base") {
      return NextResponse.json(
        { error: "action invalida. Usa switch-to-real o switch-to-base" },
        { status: 400 },
      );
    }

    const result =
      action === "switch-to-real"
        ? await switchToRealMode(
            typeof body?.authToken === "string" ? body.authToken : undefined,
            body?.endpointStrategy,
            composeReady,
          )
        : await switchToBaseMode(composeReady);

    const emulatorHealth = await resolveBackendFast(true);
    return NextResponse.json({
      success: true,
      ...result,
      backend: emulatorHealth.backend,
      healthPath: emulatorHealth.healthPath,
      endpoint: emulatorHealth.endpoint,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "No se pudo cambiar runtime ECR" },
      { status: 500 },
    );
  }
}
