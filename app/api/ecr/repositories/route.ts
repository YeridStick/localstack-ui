import { NextRequest, NextResponse } from "next/server";
import { ecrClient } from "@/lib/aws-config";
import { getAwsRuntimeConfig } from "@/lib/aws/runtime-config";
import {
  CreateRepositoryCommand,
  DeleteRepositoryCommand,
  DescribeRepositoriesCommand,
  type CreateRepositoryCommandInput,
  type Repository,
  type Tag,
} from "@aws-sdk/client-ecr";

const runtime = getAwsRuntimeConfig();

function splitRepositoryUri(repositoryUri: string | undefined): {
  loginServer?: string;
  repositoryPath?: string;
} {
  if (!repositoryUri) {
    return {};
  }
  const slashIndex = repositoryUri.indexOf("/");
  if (slashIndex < 0) {
    return { loginServer: repositoryUri };
  }
  return {
    loginServer: repositoryUri.slice(0, slashIndex),
    repositoryPath: repositoryUri.slice(slashIndex + 1),
  };
}

function buildPublicPushUri(repository: Repository): {
  pushUri?: string;
  loginServer?: string;
} {
  const repositoryName = repository.repositoryName;
  if (!repositoryName) {
    return {};
  }

  const parsed = splitRepositoryUri(repository.repositoryUri);
  if (parsed.loginServer?.includes("amazonaws.com")) {
    return {
      loginServer: parsed.loginServer,
      pushUri: repository.repositoryUri || undefined,
    };
  }

  const fallbackRegistryId = repository.registryId || "000000000000";

  const endpoint = new URL(runtime.publicEndpoint);
  const endpointHost = endpoint.hostname;
  const endpointPort = endpoint.port;
  const defaultPort = endpointPort || (endpoint.protocol === "https:" ? "443" : "80");

  const isLocalEndpointHost =
    endpointHost === "localhost" ||
    endpointHost === "127.0.0.1" ||
    endpointHost === "host.docker.internal";

  const looksLikeLocalstackRegistry =
    parsed.loginServer?.includes("localstack") ||
    parsed.loginServer?.includes("localhost.localstack.cloud");

  if (isLocalEndpointHost && looksLikeLocalstackRegistry) {
    const loginServer = `${fallbackRegistryId}.dkr.ecr.${runtime.region}.localhost.localstack.cloud:${defaultPort}`;
    return {
      loginServer,
      pushUri: `${loginServer}/${repositoryName}`,
    };
  }

  if (parsed.loginServer) {
    return {
      loginServer: parsed.loginServer,
      pushUri: parsed.repositoryPath
        ? `${parsed.loginServer}/${parsed.repositoryPath}`
        : `${parsed.loginServer}/${repositoryName}`,
    };
  }

  return {};
}

function normalizeTags(input: unknown): Tag[] | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  return Object.entries(input as Record<string, unknown>)
    .filter((entry) => typeof entry[1] === "string")
    .map(([key, value]) => ({
      Key: key,
      Value: String(value),
    }));
}

function mapRepository(repository: Repository) {
  const pushInfo = buildPublicPushUri(repository);
  return {
    repositoryArn: repository.repositoryArn,
    registryId: repository.registryId,
    repositoryName: repository.repositoryName || "",
    repositoryUri: repository.repositoryUri,
    pushUri: pushInfo.pushUri,
    loginServer: pushInfo.loginServer,
    createdAt: repository.createdAt,
    imageTagMutability: repository.imageTagMutability,
    scanOnPush: repository.imageScanningConfiguration?.scanOnPush ?? false,
    encryptionType: repository.encryptionConfiguration?.encryptionType,
    kmsKey: repository.encryptionConfiguration?.kmsKey,
  };
}

export async function GET() {
  try {
    const repositories: ReturnType<typeof mapRepository>[] = [];
    let nextToken: string | undefined;

    do {
      const response = await ecrClient.send(
        new DescribeRepositoriesCommand({
          nextToken,
          maxResults: 100,
        }),
      );

      repositories.push(
        ...(response.repositories || []).map((repository) =>
          mapRepository(repository),
        ),
      );

      nextToken = response.nextToken;
    } while (nextToken);

    return NextResponse.json({
      repositories,
      total: repositories.length,
    });
  } catch (error: any) {
    console.error("ECR list repositories error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to list ECR repositories" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const repositoryName =
      typeof body?.repositoryName === "string"
        ? body.repositoryName.trim()
        : "";

    if (!repositoryName) {
      return NextResponse.json(
        { error: "repositoryName is required" },
        { status: 400 },
      );
    }

    const imageTagMutability =
      body?.imageTagMutability === "IMMUTABLE" ||
      body?.imageTagMutability === "IMMUTABLE_WITH_EXCLUSION"
        ? body.imageTagMutability
        : "MUTABLE";

    const scanOnPush = Boolean(body?.scanOnPush);
    const encryptionType =
      body?.encryptionType === "KMS" || body?.encryptionType === "KMS_DSSE"
        ? body.encryptionType
        : "AES256";
    const kmsKey = typeof body?.kmsKey === "string" ? body.kmsKey.trim() : "";

    const input: CreateRepositoryCommandInput = {
      repositoryName,
      imageTagMutability,
      imageScanningConfiguration: { scanOnPush },
      tags: normalizeTags(body?.tags),
      encryptionConfiguration:
        encryptionType === "AES256"
          ? { encryptionType: "AES256" }
          : {
              encryptionType,
              kmsKey: kmsKey || undefined,
            },
    };

    const response = await ecrClient.send(new CreateRepositoryCommand(input));

    return NextResponse.json({
      repository: response.repository ? mapRepository(response.repository) : null,
    });
  } catch (error: any) {
    console.error("ECR create repository error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create ECR repository" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repositoryName = searchParams.get("repositoryName")?.trim();
    const force = searchParams.get("force") === "true";

    if (!repositoryName) {
      return NextResponse.json(
        { error: "repositoryName is required" },
        { status: 400 },
      );
    }

    await ecrClient.send(
      new DeleteRepositoryCommand({
        repositoryName,
        force,
      }),
    );

    return NextResponse.json({
      success: true,
      repositoryName,
      force,
    });
  } catch (error: any) {
    console.error("ECR delete repository error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete ECR repository" },
      { status: 500 },
    );
  }
}
