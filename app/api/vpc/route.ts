import { NextRequest, NextResponse } from "next/server";
import { DescribeVpcsCommand, CreateVpcCommand, DeleteVpcCommand } from "@aws-sdk/client-ec2";
import { ec2Client } from "@/lib/aws-config";

// GET /api/vpc - List all VPCs
export async function GET() {
  try {
    const response = await ec2Client.send(new DescribeVpcsCommand({}));
    const vpcs = (response.Vpcs || []).map((vpc) => ({
      vpcId: vpc.VpcId!,
      cidrBlock: vpc.CidrBlock!,
      state: vpc.State as any,
      instanceTenancy: vpc.InstanceTenancy,
      isDefault: vpc.IsDefault,
      tags: Object.fromEntries(vpc.Tags?.map((t) => [t.Key, t.Value]) || []),
    }));
    return NextResponse.json({ vpcs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/vpc - Create VPC
export async function POST(request: NextRequest) {
  try {
    const { cidrBlock, tags } = await request.json();
    const response = await ec2Client.send(
      new CreateVpcCommand({
        CidrBlock: cidrBlock,
        TagSpecifications: tags
          ? [
              {
                ResourceType: "vpc",
                Tags: Object.entries(tags).map(([Key, Value]) => ({ Key, Value: Value as string })),
              },
            ]
          : undefined,
      })
    );
    return NextResponse.json({ vpc: response.Vpc });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
