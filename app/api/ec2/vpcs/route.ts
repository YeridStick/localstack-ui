import { NextResponse } from "next/server";
import { ec2Client } from "@/lib/aws-config";
import {
  CreateVpcCommand,
  DescribeVpcsCommand,
  CreateSubnetCommand,
  DescribeSubnetsCommand,
} from "@aws-sdk/client-ec2";

// GET - List all VPCs
export async function GET() {
  try {
    const command = new DescribeVpcsCommand({});
    const response = await ec2Client.send(command);

    const vpcs =
      response.Vpcs?.map((v) => ({
        id: v.VpcId,
        cidrBlock: v.CidrBlock,
        state: v.State,
        isDefault: v.IsDefault,
        tags: v.Tags,
        name: v.Tags?.find((t) => t.Key === "Name")?.Value || v.VpcId,
      })) || [];

    return NextResponse.json({ vpcs });
  } catch (error) {
    console.error("EC2 DescribeVpcs error:", error);
    return NextResponse.json({ error: "Failed to list VPCs" }, { status: 500 });
  }
}

// POST - Create new VPC
export async function POST(request: Request) {
  try {
    const { cidrBlock, tags } = await request.json();

    const command = new CreateVpcCommand({
      CidrBlock: cidrBlock || "10.0.0.0/16",
      TagSpecifications: [
        {
          ResourceType: "vpc",
          Tags: Object.entries(tags || { Name: "my-vpc" }).map(
            ([Key, Value]) => ({
              Key,
              Value: String(Value),
            })
          ),
        },
      ],
    });

    const response = await ec2Client.send(command);
    return NextResponse.json({
      success: true,
      vpcId: response.Vpc?.VpcId,
      cidrBlock: response.Vpc?.CidrBlock,
      state: response.Vpc?.State,
    });
  } catch (error) {
    console.error("EC2 CreateVpc error:", error);
    return NextResponse.json(
      { error: "Failed to create VPC" },
      { status: 500 }
    );
  }
}
