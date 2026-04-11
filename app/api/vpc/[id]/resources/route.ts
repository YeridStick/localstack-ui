import { NextRequest, NextResponse } from "next/server";
import { ec2Client, rdsClient } from "@/lib/aws-config";
import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { DescribeDBInstancesCommand } from "@aws-sdk/client-rds";
import { spawn } from "child_process";

// Helper to execute docker commands
const execDocker = (args: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    const proc = spawn("docker", args);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (data) => (stdout += data.toString()));
    proc.stderr.on("data", (data) => (stderr += data.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr || `Docker command failed`));
    });
  });
};

// GET /api/vpc/[id]/resources - Get EC2 and RDS instances attached to this VPC
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vpcId = params.id;

    // 1. Get Docker network name for this VPC
    const networkName = `vpc-${vpcId}`;

    // 2. Find containers connected to this network
    const containersOutput = await execDocker([
      "network", "inspect", networkName,
      "--format", "{{json .Containers}}"
    ]).catch(() => "{}");

    const containers = JSON.parse(containersOutput || "{}");
    const containerIds = Object.keys(containers);

    // 3. Get detailed info about each container to identify EC2 and RDS
    const ec2Instances: any[] = [];
    const rdsInstances: any[] = [];

    for (const containerId of containerIds) {
      try {
        const inspectOutput = await execDocker([
          "inspect", containerId,
          "--format", "{{json .Config.Labels}}"
        ]);
        const labels = JSON.parse(inspectOutput || "{}");
        const containerName = containers[containerId]?.Name || "";

        // Check if it's an EC2 instance
        if (labels["instance_id"] || containerName.startsWith("ec2-")) {
          const instanceId = labels["instance_id"] || containerName.replace("ec2-", "");
          const ipAddress = containers[containerId]?.IPv4Address?.split("/")[0] || "";
          
          ec2Instances.push({
            id: instanceId,
            name: containerName,
            type: labels["instance-type"] || "t2.micro",
            state: "running",
            privateIp: ipAddress,
            containerId: containerId.substring(0, 12),
          });
        }

        // Check if it's an RDS instance
        if (labels["rds-id"] || containerName.startsWith("rds-")) {
          const rdsId = labels["rds-id"] || containerName.replace("rds-", "");
          const ipAddress = containers[containerId]?.IPv4Address?.split("/")[0] || "";
          const engine = labels["engine"] || "postgresql";
          
          rdsInstances.push({
            id: rdsId,
            name: containerName,
            engine: engine,
            status: "available",
            privateIp: ipAddress,
            containerId: containerId.substring(0, 12),
          });
        }
      } catch (e) {
        console.log(`Failed to inspect container ${containerId}:`, e);
      }
    }

    return NextResponse.json({
      vpcId,
      networkName,
      ec2Instances,
      rdsInstances,
      totalResources: ec2Instances.length + rdsInstances.length,
    });
  } catch (error: any) {
    console.error("VPC Resources Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch VPC resources" },
      { status: 500 }
    );
  }
}
