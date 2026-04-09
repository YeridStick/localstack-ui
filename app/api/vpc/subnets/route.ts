import { NextRequest, NextResponse } from "next/server";
import { DescribeSubnetsCommand, CreateSubnetCommand } from "@aws-sdk/client-ec2";
import { ec2Client } from "@/lib/aws-config";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vpcId = searchParams.get("vpcId");
    
    const response = await ec2Client.send(
      new DescribeSubnetsCommand({
        Filters: vpcId ? [{ Name: "vpc-id", Values: [vpcId] }] : undefined,
      })
    );
    
    const subnets = (response.Subnets || []).map((subnet) => ({
      subnetId: subnet.SubnetId!,
      vpcId: subnet.VpcId!,
      cidrBlock: subnet.CidrBlock!,
      availabilityZone: subnet.AvailabilityZone,
      availabilityZoneId: subnet.AvailabilityZoneId,
      availableIpAddressCount: subnet.AvailableIpAddressCount,
      state: subnet.State as any,
      mapPublicIpOnLaunch: subnet.MapPublicIpOnLaunch,
      defaultForAz: subnet.DefaultForAz,
      tags: Object.fromEntries(subnet.Tags?.map((t) => [t.Key, t.Value]) || []),
    }));
    
    return NextResponse.json({ subnets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { vpcId, cidrBlock, availabilityZone } = await request.json();
    const response = await ec2Client.send(
      new CreateSubnetCommand({
        VpcId: vpcId,
        CidrBlock: cidrBlock,
        AvailabilityZone: availabilityZone,
      })
    );
    return NextResponse.json({ subnet: response.Subnet });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
