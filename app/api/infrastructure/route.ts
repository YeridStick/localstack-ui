import { NextResponse } from "next/server";
import {
  ec2Client,
  rdsClient,
  elbv2Client,
  s3Client,
  sqsClient,
  dynamoClient,
} from "@/lib/aws-config";
import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { DescribeDBInstancesCommand } from "@aws-sdk/client-rds";
import { DescribeLoadBalancersCommand } from "@aws-sdk/client-elastic-load-balancing-v2";
import { ListBucketsCommand } from "@aws-sdk/client-s3";
import { ListQueuesCommand } from "@aws-sdk/client-sqs";
import { DescribeTableCommand, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { spawn } from "child_process";

// Helper to execute docker commands
const execDocker = (args: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    const proc = spawn("docker", args);
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finishResolve = (value: string) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const finishReject = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    proc.stdout.on("data", (data) => (stdout += data.toString()));
    proc.stderr.on("data", (data) => (stderr += data.toString()));
    proc.on("error", (error: NodeJS.ErrnoException) => {
      finishReject(error);
    });
    proc.on("close", (code) => {
      if (code === 0) finishResolve(stdout.trim());
      else finishReject(new Error(stderr.trim() || `Docker command failed (${code ?? "unknown"})`));
    });
  });
};

function isDockerUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as NodeJS.ErrnoException;
  if (err.code === "ENOENT") return true;
  if (typeof err.message === "string") {
    return err.message.toLowerCase().includes("spawn docker enonent");
  }
  return false;
}

async function safeAwsCall<T>(label: string, operation: () => Promise<T>): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    console.warn(`${label} query failed:`, error);
    return null;
  }
}

function getQueueNameFromUrl(queueUrl: string): string {
  return queueUrl.split("/").pop() || queueUrl;
}

// GET /api/infrastructure - Get complete infrastructure diagram data
export async function GET() {
  try {
    // 1. Get all VPCs (Docker networks)
    const networksOutput = await execDocker([
      "network", "ls", "--filter", "name=vpc-", "--format", "{{.Name}}"
    ]).catch((error) => {
      if (isDockerUnavailableError(error)) {
        console.warn("Docker CLI is not available. Infrastructure diagram will skip Docker networks.");
      } else {
        console.warn("Could not list Docker networks:", error);
      }
      return "";
    });

    const networks = networksOutput
      .split("\n")
      .map((name) => name.trim())
      .filter((name) => name.startsWith("vpc-"));
    const vpcs = networks.map((name) => {
      const vpcId = name.replace("vpc-", "");
      return {
        id: vpcId,
        name: name,
        cidrBlock: "10.0.0.0/16", // Will be fetched from AWS
        type: "vpc",
      };
    });

    // 2. Get resources in parallel for faster responses
    const [ec2Response, rdsResponse, elbResponse, s3Response, sqsResponse, dynamoTablesList] =
      await Promise.all([
      safeAwsCall(
        "EC2 DescribeInstances",
        () => ec2Client.send(new DescribeInstancesCommand({})),
      ),
      safeAwsCall(
        "RDS DescribeDBInstances",
        () => rdsClient.send(new DescribeDBInstancesCommand({})),
      ),
      safeAwsCall(
        "ELBv2 DescribeLoadBalancers",
        () => elbv2Client.send(new DescribeLoadBalancersCommand({})),
      ),
      safeAwsCall("S3 ListBuckets", () => s3Client.send(new ListBucketsCommand({}))),
      safeAwsCall("SQS ListQueues", () => sqsClient.send(new ListQueuesCommand({}))),
      safeAwsCall("DynamoDB ListTables", () =>
        dynamoClient.send(new ListTablesCommand({})),
      ),
    ]);

    const ec2Instances: any[] = [];

    ec2Response?.Reservations?.forEach((reservation) => {
      reservation.Instances?.forEach((instance) => {
        if (instance.State?.Name !== "terminated") {
          ec2Instances.push({
            id: instance.InstanceId || "",
            type: "ec2",
            state: instance.State?.Name,
            instanceType: instance.InstanceType,
            vpcId: instance.VpcId,
            privateIp: instance.PrivateIpAddress,
            publicIp: instance.PublicIpAddress,
            name: instance.Tags?.find(t => t.Key === "Name")?.Value || instance.InstanceId,
          });
        }
      });
    });

    // 3. Get RDS instances
    const rdsInstances = rdsResponse?.DBInstances?.map((db) => ({
      id: db.DBInstanceIdentifier || "",
      type: "rds",
      engine: db.Engine,
      status: db.DBInstanceStatus,
      vpcId: db.DBSubnetGroup?.VpcId,
      endpoint: db.Endpoint?.Address,
      port: db.Endpoint?.Port,
      name: db.DBInstanceIdentifier,
    })) || [];

    // 4. Get Load Balancers
    const loadBalancers = elbResponse?.LoadBalancers?.map((lb) => ({
      id: lb.LoadBalancerArn?.split("/").pop() || "",
      type: "elb",
      name: lb.LoadBalancerName,
      scheme: lb.Scheme,
      vpcId: lb.VpcId,
      dnsName: lb.DNSName,
      state: lb.State?.Code,
    })) || [];

    // 5. Get S3 buckets, SQS queues and DynamoDB tables
    const s3Buckets = s3Response?.Buckets?.map((bucket) => ({
      id: bucket.Name || "",
      name: bucket.Name || "",
      type: "s3",
      createdAt: bucket.CreationDate?.toISOString(),
    })) || [];

    const sqsQueues = sqsResponse?.QueueUrls?.map((queueUrl) => ({
      id: queueUrl || "",
      name: getQueueNameFromUrl(queueUrl || ""),
      type: "sqs",
      queueUrl,
    })) || [];

    const dynamoDescribeResults = await Promise.all(
      (dynamoTablesList?.TableNames || []).map((tableName) =>
        safeAwsCall(`DynamoDB DescribeTable:${tableName}`, () =>
          dynamoClient.send(new DescribeTableCommand({ TableName: tableName })),
        ),
      ),
    );
    const dynamoTables = dynamoDescribeResults
      .map((result) => result?.Table)
      .filter(Boolean)
      .map((table) => ({
        id: table?.TableName || "",
        name: table?.TableName || "",
        type: "dynamodb",
        status: table?.TableStatus,
        itemCount: table?.ItemCount,
        tableSizeBytes: table?.TableSizeBytes,
      }));

    // 6. Get Docker container connections to networks
    const connections: any[] = [];
    for (const network of networks) {
      try {
        const inspectOutput = await execDocker([
          "network", "inspect", network,
          "--format", "{{json .Containers}}"
        ]);
        const containers = JSON.parse(inspectOutput || "{}");
        
        Object.entries(containers).forEach(([containerId, info]: [string, any]) => {
          const containerName = info.Name || "";
          let resourceId = "";
          let resourceType = "";
          
          if (containerName.startsWith("ec2-")) {
            resourceId = containerName.replace("ec2-", "");
            resourceType = "ec2";
          } else if (containerName.startsWith("rds-")) {
            resourceId = containerName.replace("rds-", "");
            resourceType = "rds";
          }
          
          if (resourceId && resourceType) {
            connections.push({
              from: network.replace("vpc-", ""),
              to: resourceId,
              fromType: "vpc",
              toType: resourceType,
              containerId: containerId.substring(0, 12),
              privateIp: info.IPv4Address?.split("/")[0],
            });
          }
        });
      } catch (e) {
        console.log(`Failed to inspect network ${network}:`, e);
      }
    }

    // Build the diagram data structure
    const diagramData = {
      vpcs,
      ec2Instances,
      rdsInstances,
      loadBalancers,
      s3Buckets,
      sqsQueues,
      dynamoTables,
      connections,
      summary: {
        totalVPCs: vpcs.length,
        totalEC2: ec2Instances.length,
        totalRDS: rdsInstances.length,
        totalELB: loadBalancers.length,
        totalS3: s3Buckets.length,
        totalSQS: sqsQueues.length,
        totalDynamoDB: dynamoTables.length,
        totalConnections: connections.length,
      }
    };

    return NextResponse.json(diagramData);
  } catch (error: any) {
    console.error("Infrastructure API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch infrastructure data" },
      { status: 500 }
    );
  }
}
