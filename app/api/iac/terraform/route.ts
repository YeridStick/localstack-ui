import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

type TerraformAction = "validate" | "plan" | "apply" | "destroy";
type TerraformMode = "terraform" | "cloudformation-bridge";

interface TerraformCommandResult {
  step: string;
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

class TerraformStepError extends Error {
  result: TerraformCommandResult;

  constructor(message: string, result: TerraformCommandResult) {
    super(message);
    this.name = "TerraformStepError";
    this.result = result;
  }
}

const WORKSPACES_ROOT = path.join(
  process.cwd(),
  ".localstack-ui",
  "terraform-workspaces",
);

const localStackEndpoint =
  process.env.NEXT_PUBLIC_LOCALSTACK_ENDPOINT ||
  process.env.LOCALSTACK_ENDPOINT ||
  "http://localhost:4566";

const awsRegion = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";
const awsAccessKey = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || "test";
const awsSecretKey = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || "test";

function sanitizeWorkspaceName(input?: string): string {
  const sanitized = (input || "default")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitized || "default";
}

function escapeHclString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");
}

async function runTerraformStep(
  step: string,
  args: string[],
  cwd: string,
  acceptedExitCodes: number[] = [0],
): Promise<TerraformCommandResult> {
  const startedAt = Date.now();

  const result = await new Promise<TerraformCommandResult>((resolve, reject) => {
    const proc = spawn("terraform", args, {
      cwd,
      env: {
        ...process.env,
        TF_IN_AUTOMATION: "1",
        AWS_ACCESS_KEY_ID: awsAccessKey,
        AWS_SECRET_ACCESS_KEY: awsSecretKey,
        AWS_DEFAULT_REGION: awsRegion,
      },
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", (error) => {
      reject(error);
    });

    proc.on("close", (exitCode) => {
      resolve({
        step,
        command: `terraform ${args.join(" ")}`,
        exitCode: exitCode ?? -1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        durationMs: Date.now() - startedAt,
      });
    });
  });

  if (!acceptedExitCodes.includes(result.exitCode)) {
    throw new TerraformStepError(
      `Terraform step '${step}' failed with exit code ${result.exitCode}`,
      result,
    );
  }

  return result;
}

function buildProviderConfig(endpoint: string, region: string): string {
  return `terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  access_key                  = "${awsAccessKey}"
  secret_key                  = "${awsSecretKey}"
  region                      = "${region}"
  s3_use_path_style           = true
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    apigateway     = "${endpoint}"
    cloudformation = "${endpoint}"
    cloudwatch     = "${endpoint}"
    dynamodb       = "${endpoint}"
    ec2            = "${endpoint}"
    elb            = "${endpoint}"
    iam            = "${endpoint}"
    lambda         = "${endpoint}"
    rds            = "${endpoint}"
    route53        = "${endpoint}"
    s3             = "${endpoint}"
    secretsmanager = "${endpoint}"
    sqs            = "${endpoint}"
    sts            = "${endpoint}"
  }
}
`;
}

function buildCloudFormationBridgeConfig(
  stackName: string,
  capabilities: string[],
  parameters: Record<string, string>,
): string {
  const serializedCapabilities = capabilities
    .map((capability) => `"${escapeHclString(capability)}"`)
    .join(", ");

  const parameterEntries = Object.entries(parameters)
    .map(
      ([key, value]) =>
        `    "${escapeHclString(key)}" = "${escapeHclString(value)}"`,
    )
    .join("\n");

  const parametersBlock = parameterEntries
    ? `\n  parameters = {\n${parameterEntries}\n  }`
    : "";

  return `resource "aws_cloudformation_stack" "stack" {
  name         = "${escapeHclString(stackName)}"
  capabilities = [${serializedCapabilities}]
  template_body = file("${"${path.module}"}/cloudformation-template.yaml")${parametersBlock}
}
`;
}

async function prepareWorkspaceFiles(input: {
  workspacePath: string;
  mode: TerraformMode;
  terraformConfig?: string;
  cloudFormationStackName?: string;
  cloudFormationTemplate?: string;
  cloudFormationCapabilities?: string[];
  cloudFormationParameters?: Record<string, string>;
}) {
  const {
    workspacePath,
    mode,
    terraformConfig,
    cloudFormationStackName,
    cloudFormationTemplate,
    cloudFormationCapabilities,
    cloudFormationParameters,
  } = input;

  await mkdir(workspacePath, { recursive: true });

  await writeFile(
    path.join(workspacePath, "providers.localstack.tf"),
    buildProviderConfig(localStackEndpoint, awsRegion),
    "utf8",
  );

  const safeMain =
    (terraformConfig || "").trim() || "# Add Terraform resources here\n";
  await writeFile(path.join(workspacePath, "main.tf"), safeMain, "utf8");

  if (mode === "cloudformation-bridge") {
    await writeFile(
      path.join(workspacePath, "cloudformation-template.yaml"),
      cloudFormationTemplate || "",
      "utf8",
    );

    await writeFile(
      path.join(workspacePath, "cloudformation-bridge.auto.tf"),
      buildCloudFormationBridgeConfig(
        cloudFormationStackName || "localstack-stack",
        cloudFormationCapabilities && cloudFormationCapabilities.length > 0
          ? cloudFormationCapabilities
          : ["CAPABILITY_IAM", "CAPABILITY_NAMED_IAM"],
        cloudFormationParameters || {},
      ),
      "utf8",
    );
  } else {
    await writeFile(
      path.join(workspacePath, "cloudformation-bridge.auto.tf"),
      "# CloudFormation bridge disabled for this workspace\n",
      "utf8",
    );
  }
}

function extractOutput(results: TerraformCommandResult[]): string {
  return results
    .map((result) => {
      const sections = [
        `$ ${result.command}`,
        result.stdout ? result.stdout : "",
        result.stderr ? result.stderr : "",
      ].filter(Boolean);

      return sections.join("\n");
    })
    .join("\n\n");
}

export async function GET() {
  try {
    const versionStep = await runTerraformStep(
      "version",
      ["version", "-json"],
      process.cwd(),
    );
    const parsed = JSON.parse(versionStep.stdout || "{}");

    return NextResponse.json({
      terraformAvailable: true,
      terraformVersion: parsed.terraform_version || null,
      localstackEndpoint: localStackEndpoint,
      region: awsRegion,
    });
  } catch (error: any) {
    return NextResponse.json({
      terraformAvailable: false,
      terraformVersion: null,
      localstackEndpoint: localStackEndpoint,
      region: awsRegion,
      error: error?.message || "Terraform CLI is not available",
    });
  }
}

export async function POST(request: NextRequest) {
  const executedSteps: TerraformCommandResult[] = [];

  try {
    const body = await request.json();
    const action = body?.action as TerraformAction;
    const mode: TerraformMode =
      body?.mode === "cloudformation-bridge"
        ? "cloudformation-bridge"
        : "terraform";
    const workspaceName = sanitizeWorkspaceName(body?.workspaceName);

    if (!action || !["validate", "plan", "apply", "destroy"].includes(action)) {
      return NextResponse.json(
        {
          error: "Invalid action. Use validate, plan, apply or destroy.",
        },
        { status: 400 },
      );
    }

    const terraformConfig =
      typeof body?.terraformConfig === "string" ? body.terraformConfig : "";
    const cloudFormationStackName =
      typeof body?.cloudFormationStackName === "string"
        ? body.cloudFormationStackName.trim()
        : "";
    const cloudFormationTemplate =
      typeof body?.cloudFormationTemplate === "string"
        ? body.cloudFormationTemplate
        : "";
    const cloudFormationCapabilities = Array.isArray(
      body?.cloudFormationCapabilities,
    )
      ? body.cloudFormationCapabilities.filter(
          (value: unknown) => typeof value === "string",
        )
      : undefined;
    const cloudFormationParameters =
      body?.cloudFormationParameters &&
      typeof body.cloudFormationParameters === "object"
        ? (Object.entries(body.cloudFormationParameters).reduce(
            (accumulator: Record<string, string>, [key, value]) => {
              if (typeof value === "string") {
                accumulator[key] = value;
              }
              return accumulator;
            },
            {},
          ) as Record<string, string>)
        : undefined;

    if (mode === "terraform" && !terraformConfig.trim()) {
      return NextResponse.json(
        {
          error: "Terraform configuration is required in Terraform mode.",
        },
        { status: 400 },
      );
    }

    if (
      mode === "cloudformation-bridge" &&
      (!cloudFormationStackName || !cloudFormationTemplate.trim())
    ) {
      return NextResponse.json(
        {
          error:
            "CloudFormation stack name and template are required in bridge mode.",
        },
        { status: 400 },
      );
    }

    const workspacePath = path.join(WORKSPACES_ROOT, workspaceName);

    await prepareWorkspaceFiles({
      workspacePath,
      mode,
      terraformConfig,
      cloudFormationStackName,
      cloudFormationTemplate,
      cloudFormationCapabilities,
      cloudFormationParameters,
    });

    const initStep = await runTerraformStep(
      "init",
      ["init", "-input=false", "-no-color"],
      workspacePath,
    );
    executedSteps.push(initStep);

    if (action === "validate") {
      const validateStep = await runTerraformStep(
        "validate",
        ["validate", "-no-color"],
        workspacePath,
      );
      executedSteps.push(validateStep);
    }

    if (action === "plan") {
      const planStep = await runTerraformStep(
        "plan",
        [
          "plan",
          "-input=false",
          "-no-color",
          "-out=tfplan",
          "-detailed-exitcode",
        ],
        workspacePath,
        [0, 2],
      );
      executedSteps.push(planStep);
    }

    if (action === "apply") {
      const planStep = await runTerraformStep(
        "plan",
        ["plan", "-input=false", "-no-color", "-out=tfplan"],
        workspacePath,
      );
      executedSteps.push(planStep);

      const applyStep = await runTerraformStep(
        "apply",
        ["apply", "-input=false", "-no-color", "-auto-approve", "tfplan"],
        workspacePath,
      );
      executedSteps.push(applyStep);
    }

    if (action === "destroy") {
      const destroyStep = await runTerraformStep(
        "destroy",
        ["destroy", "-input=false", "-no-color", "-auto-approve"],
        workspacePath,
      );
      executedSteps.push(destroyStep);
    }

    const output = extractOutput(executedSteps);
    const planStep = executedSteps.find((step) => step.step === "plan");

    return NextResponse.json({
      success: true,
      action,
      mode,
      workspaceName,
      localstackEndpoint: localStackEndpoint,
      region: awsRegion,
      hasChanges: planStep ? planStep.exitCode === 2 : undefined,
      output,
      steps: executedSteps,
    });
  } catch (error: any) {
    if (error instanceof TerraformStepError) {
      executedSteps.push(error.result);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          output: extractOutput(executedSteps),
          steps: executedSteps,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to execute Terraform workflow",
        output: extractOutput(executedSteps),
        steps: executedSteps,
      },
      { status: 500 },
    );
  }
}
