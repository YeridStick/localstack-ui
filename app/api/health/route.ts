import { NextResponse } from "next/server";
import { LocalStackHealth, Service } from "@/types";
import { AVAILABLE_SERVICES } from "@/config/services";
import {
  s3Client,
  dynamoClient,
  sqsClient,
  secretsManagerClient,
  lambdaClient,
  iamClient,
  cloudWatchLogsClient,
  eventBridgeClient,
  schedulerClient,
  cloudFormationClient,
  apiGatewayClient,
} from "@/lib/aws-config";
import { ListBucketsCommand } from "@aws-sdk/client-s3";
import { ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { ListQueuesCommand } from "@aws-sdk/client-sqs";
import { ListSecretsCommand } from "@aws-sdk/client-secrets-manager";
import { ListFunctionsCommand } from "@aws-sdk/client-lambda";
import { ListUsersCommand } from "@aws-sdk/client-iam";
import { DescribeLogGroupsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { ListEventBusesCommand } from "@aws-sdk/client-eventbridge";
import { ListScheduleGroupsCommand } from "@aws-sdk/client-scheduler";
import { ListStacksCommand } from "@aws-sdk/client-cloudformation";
import { GetRestApisCommand } from "@aws-sdk/client-api-gateway";

async function checkServiceHealth(service: Service): Promise<Service> {
  try {
    switch (service.id) {
      case "s3":
        await s3Client.send(new ListBucketsCommand({}));
        return { ...service, status: "running" };

      case "dynamodb":
        await dynamoClient.send(new ListTablesCommand({}));
        return { ...service, status: "running" };

      case "sqs":
        await sqsClient.send(new ListQueuesCommand({}));
        return { ...service, status: "running" };

      case "secretsmanager":
        await secretsManagerClient.send(new ListSecretsCommand({}));
        return { ...service, status: "running" };

      case "lambda":
        await lambdaClient.send(new ListFunctionsCommand({}));
        return { ...service, status: "running" };

      case "iam":
        await iamClient.send(new ListUsersCommand({}));
        return { ...service, status: "running" };

      case "cloudwatch":
        await cloudWatchLogsClient.send(
          new DescribeLogGroupsCommand({ limit: 1 }),
        );
        return { ...service, status: "running" };

      case "eventbridge":
        await eventBridgeClient.send(new ListEventBusesCommand({}));
        return { ...service, status: "running" };

      /*case "scheduler":
        await schedulerClient.send(new ListScheduleGroupsCommand({}));
        return { ...service, status: "running" };*/

      case "logs":
        await cloudWatchLogsClient.send(
          new DescribeLogGroupsCommand({ limit: 1 }),
        );
        return { ...service, status: "running" };

      case "cloudformation":
        await cloudFormationClient.send(new ListStacksCommand({}));
        return { ...service, status: "running" };

      case "apigateway":
        await apiGatewayClient.send(new GetRestApisCommand({}));
        return { ...service, status: "running" };

      default:
        return { ...service, status: service.enabled ? "unknown" : "stopped" };
    }
  } catch (error) {
    console.error(`Error checking ${service.name} health:`, error);
    return { ...service, status: "error" };
  }
}

export async function GET() {
  const endpoint =
    process.env.NEXT_PUBLIC_LOCALSTACK_ENDPOINT || "http://localhost:4566";

  try {
    const servicePromises = AVAILABLE_SERVICES.map((service) =>
      checkServiceHealth(service),
    );
    const services = await Promise.all(servicePromises);

    const hasRunningServices = services.some((s) => s.status === "running");

    const health: LocalStackHealth = {
      status: hasRunningServices ? "healthy" : "unhealthy",
      endpoint,
      lastChecked: new Date(),
      services,
    };

    return NextResponse.json(health);
  } catch (error: any) {
    console.error("Error checking LocalStack health:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        endpoint,
        lastChecked: new Date(),
        services: AVAILABLE_SERVICES.map((s) => ({ ...s, status: "error" })),
      },
      { status: 500 },
    );
  }
}
