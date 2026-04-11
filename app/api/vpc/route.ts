import { NextRequest, NextResponse } from "next/server";
import {
  DescribeVpcsCommand,
  CreateVpcCommand,
  DeleteVpcCommand,
} from "@aws-sdk/client-ec2";
import { ec2Client } from "@/lib/aws-config";
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

// GET /api/vpc - List all VPCs from miniStack
export async function GET() {
  try {
    const response = await ec2Client.send(new DescribeVpcsCommand({}));
    
    const vpcs = (response.Vpcs || []).map((vpc) => ({
      id: vpc.VpcId!,
      cidrBlock: vpc.CidrBlock!,
      name: vpc.Tags?.find((t) => t.Key === "Name")?.Value || vpc.VpcId!,
      state: vpc.State as "available" | "pending",
      isDefault: vpc.IsDefault || false,
      tags: Object.fromEntries(vpc.Tags?.map((t) => [t.Key, t.Value]) || []),
    }));

    return NextResponse.json({ vpcs });
  } catch (error: any) {
    console.error("VPC List Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/vpc - Create VPC in miniStack + Docker network
export async function POST(request: NextRequest) {
  try {
    const { cidrBlock, name, tags } = await request.json();

    // 1. Create VPC in miniStack
    const tagSpecs = [
      {
        ResourceType: "vpc" as const,
        Tags: [
          ...(name ? [{ Key: "Name", Value: name }] : []),
          ...Object.entries(tags || {}).map(([Key, Value]) => ({
            Key,
            Value: Value as string,
          })),
        ],
      },
    ];

    const response = await ec2Client.send(
      new CreateVpcCommand({
        CidrBlock: cidrBlock || "10.0.0.0/16",
        TagSpecifications: tagSpecs,
      })
    );

    const vpcId = response.Vpc?.VpcId!;
    const networkName = `vpc-${vpcId}`;

    // 2. Create Docker network for this VPC
    try {
      await execDocker([
        "network", "create",
        "--driver", "bridge",
        "--subnet", cidrBlock || "10.0.0.0/16",
        "--label", `vpc-id=${vpcId}`,
        "--label", `vpc-name=${name || 'unnamed'}`,
        "--label", `managed-by=localstack-ui`,
        networkName
      ]);
    } catch (dockerError) {
      console.error("Docker network creation failed:", dockerError);
      // Continue even if Docker fails - miniStack VPC is created
    }

    const vpc = {
      id: vpcId,
      cidrBlock: response.Vpc?.CidrBlock!,
      name: name || vpcId,
      state: response.Vpc?.State as "available" | "pending",
      isDefault: false,
      tags: { ...tags, ...(name && { Name: name }) },
      dockerNetworkName: networkName,
    };

    return NextResponse.json({
      success: true,
      vpc,
    });
  } catch (error: any) {
    console.error("VPC Create Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/vpc - Delete VPC from miniStack + Docker network
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vpcId = searchParams.get("id");

    if (!vpcId) {
      return NextResponse.json({ error: "VPC ID required" }, { status: 400 });
    }

    // 1. Delete from miniStack
    await ec2Client.send(
      new DeleteVpcCommand({
        VpcId: vpcId,
      })
    );

    // 2. Delete Docker network
    try {
      await execDocker(["network", "rm", `vpc-${vpcId}`]);
    } catch (dockerError) {
      console.log("Docker network might not exist or already removed");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("VPC Delete Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
