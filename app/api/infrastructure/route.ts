import { NextRequest, NextResponse } from "next/server";
import { ec2Client, rdsClient, elbv2Client } from "@/lib/aws-config";
import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { DescribeDBInstancesCommand } from "@aws-sdk/client-rds";
import { DescribeLoadBalancersCommand } from "@aws-sdk/client-elastic-load-balancing-v2";
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

// GET /api/infrastructure - Get complete infrastructure diagram data
export async function GET(request: NextRequest) {
  try {
    // 1. Get all VPCs (Docker networks)
    const networksOutput = await execDocker([
      "network", "ls", "--filter", "name=vpc-", "--format", "{{.Name}}"
    ]).catch(() => "");
    
    const networks = networksOutput.split("\n").filter(n => n.startsWith("vpc-"));
    const vpcs = networks.map(name => {
      const vpcId = name.replace("vpc-", "");
      return {
        id: vpcId,
        name: name,
        cidrBlock: "10.0.0.0/16", // Will be fetched from AWS
        type: "vpc",
      };
    });

    // 2. Get EC2 instances with their VPC info
    const ec2Response = await ec2Client.send(new DescribeInstancesCommand({}));
    const ec2Instances: any[] = [];
    
    ec2Response.Reservations?.forEach((reservation) => {
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
    const rdsResponse = await rdsClient.send(new DescribeDBInstancesCommand({}));
    const rdsInstances = rdsResponse.DBInstances?.map((db) => ({
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
    const elbResponse = await elbv2Client.send(new DescribeLoadBalancersCommand({}));
    const loadBalancers = elbResponse.LoadBalancers?.map((lb) => ({
      id: lb.LoadBalancerArn?.split("/").pop() || "",
      type: "elb",
      name: lb.LoadBalancerName,
      scheme: lb.Scheme,
      vpcId: lb.VpcId,
      dnsName: lb.DNSName,
      state: lb.State?.Code,
    })) || [];

    // 5. Get Docker container connections to networks
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
      connections,
      summary: {
        totalVPCs: vpcs.length,
        totalEC2: ec2Instances.length,
        totalRDS: rdsInstances.length,
        totalELB: loadBalancers.length,
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
