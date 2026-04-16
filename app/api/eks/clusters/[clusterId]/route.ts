import { NextRequest, NextResponse } from "next/server";
import { apiGatewayClient } from "@/lib/aws-config";
import { getAwsRuntimeConfig } from "@/lib/aws/runtime-config";
import {
  CreateDeploymentCommand,
  CreateResourceCommand,
  CreateRestApiCommand,
  GetResourcesCommand,
  PutIntegrationCommand,
  PutMethodCommand,
} from "@aws-sdk/client-api-gateway";
import {
  deleteLocalEksCluster,
  deploySampleAppToLocalEks,
  getLocalEksCluster,
  reconcileLocalEksAutoscaling,
  scaleLocalEksCluster,
  setLocalEksClusterApiGatewayExposure,
} from "@/lib/eks/local-eks";

const runtime = getAwsRuntimeConfig();

function sanitizePathPart(pathPart: string): string {
  return pathPart
    .trim()
    .replace(/^\//, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-") || "study";
}

function sanitizeStageName(stageName: string): string {
  return stageName
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-") || "dev";
}

async function exposeClusterSampleAppWithApiGateway(input: {
  clusterId: string;
  appOrigin: string;
  stageName?: string;
  pathPart?: string;
  apiName?: string;
}) {
  const cluster = await getLocalEksCluster(input.clusterId);
  if (!cluster) {
    throw new Error(`Cluster '${input.clusterId}' no existe.`);
  }
  if (!cluster.sampleApp) {
    throw new Error(
      "Primero despliega la app de ejemplo en el cluster para exponerla por API Gateway.",
    );
  }

  const runningNode = cluster.nodes.find((node) => node.status === "running");
  if (!runningNode) {
    throw new Error("No hay nodos running disponibles para exponer la app.");
  }

  const apiName = input.apiName?.trim() || `${cluster.name}-eks-proxy`;
  const pathPart = sanitizePathPart(input.pathPart || "study");
  const stageName = sanitizeStageName(input.stageName || "dev");
  const backendUrl = `http://host.docker.internal:${runningNode.hostNodePort}`;

  const api = await apiGatewayClient.send(
    new CreateRestApiCommand({
      name: apiName,
      description: `Proxy to local EKS cluster ${cluster.name}`,
      endpointConfiguration: { types: ["REGIONAL"] },
    }),
  );
  const restApiId = api.id;
  if (!restApiId) {
    throw new Error("No se obtuvo restApiId al crear API Gateway.");
  }

  const resources = await apiGatewayClient.send(
    new GetResourcesCommand({
      restApiId,
      limit: 500,
    }),
  );
  const rootResourceId = resources.items?.find((resource) => resource.path === "/")
    ?.id;
  if (!rootResourceId) {
    throw new Error("No se encontro el root resource del API Gateway.");
  }

  const createdResource = await apiGatewayClient.send(
    new CreateResourceCommand({
      restApiId,
      parentId: rootResourceId,
      pathPart,
    }),
  );

  if (!createdResource.id) {
    throw new Error("No se pudo crear el recurso del API Gateway.");
  }

  await apiGatewayClient.send(
    new PutMethodCommand({
      restApiId,
      resourceId: createdResource.id,
      httpMethod: "ANY",
      authorizationType: "NONE",
    }),
  );

  await apiGatewayClient.send(
    new PutIntegrationCommand({
      restApiId,
      resourceId: createdResource.id,
      httpMethod: "ANY",
      type: "HTTP_PROXY",
      integrationHttpMethod: "ANY",
      uri: backendUrl,
      passthroughBehavior: "WHEN_NO_MATCH",
      timeoutInMillis: 29_000,
    }),
  );

  await apiGatewayClient.send(
    new CreateDeploymentCommand({
      restApiId,
      stageName,
      description: `Deployment for ${cluster.name} sample app`,
    }),
  );

  const emulatorInvokeUrl = `${runtime.publicEndpoint}/restapis/${restApiId}/${stageName}/_user_request_/${pathPart}`;
  const invokeUrl = `${input.appOrigin}/api/apigateway/proxy/${restApiId}/${pathPart}`;
  const updatedCluster = await setLocalEksClusterApiGatewayExposure(
    cluster.clusterId,
    {
      restApiId,
      stageName,
      pathPart,
      invokeUrl,
      emulatorInvokeUrl,
      backendUrl,
      createdAt: new Date().toISOString(),
    },
  );

  return updatedCluster;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ clusterId: string }> },
) {
  try {
    const { clusterId } = await context.params;
    const cluster = await getLocalEksCluster(clusterId);
    if (!cluster) {
      return NextResponse.json(
        { error: `Cluster '${clusterId}' not found` },
        { status: 404 },
      );
    }

    return NextResponse.json({ cluster });
  } catch (error: any) {
    console.error("EKS get cluster error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to get local EKS cluster" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ clusterId: string }> },
) {
  try {
    const { clusterId } = await context.params;
    const body = await request.json();
    const action = body?.action as string;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 },
      );
    }

    if (action === "scale") {
      const desiredNodes = Number.parseInt(String(body?.desiredNodes), 10);
      if (Number.isNaN(desiredNodes) || desiredNodes < 1) {
        return NextResponse.json(
          { error: "desiredNodes must be a positive number" },
          { status: 400 },
        );
      }
      const cluster = await scaleLocalEksCluster(clusterId, desiredNodes);
      return NextResponse.json({ cluster });
    }

    if (action === "reconcile-autoscaling") {
      const result = await reconcileLocalEksAutoscaling(clusterId);
      return NextResponse.json(result);
    }

    if (action === "deploy-sample-app") {
      const cluster = await deploySampleAppToLocalEks(clusterId, {
        namespace: body?.namespace,
        appName: body?.appName,
        image: body?.image,
      });
      return NextResponse.json({ cluster });
    }

    if (action === "expose-api-gateway") {
      const cluster = await exposeClusterSampleAppWithApiGateway({
        clusterId,
        appOrigin: new URL(request.url).origin,
        stageName: body?.stageName,
        pathPart: body?.pathPart,
        apiName: body?.apiName,
      });
      return NextResponse.json({ cluster });
    }

    return NextResponse.json(
      {
        error:
          "Invalid action. Use: scale, reconcile-autoscaling, deploy-sample-app, expose-api-gateway",
      },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("EKS cluster action error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to run cluster action" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ clusterId: string }> },
) {
  try {
    const { clusterId } = await context.params;
    await deleteLocalEksCluster(clusterId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("EKS delete cluster error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete local EKS cluster" },
      { status: 500 },
    );
  }
}
