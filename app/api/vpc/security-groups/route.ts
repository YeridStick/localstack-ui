import { NextRequest, NextResponse } from "next/server";
import {
  DescribeSecurityGroupsCommand,
  CreateSecurityGroupCommand,
  DeleteSecurityGroupCommand,
} from "@aws-sdk/client-ec2";
import { ec2Client } from "@/lib/aws-config";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vpcId = searchParams.get("vpcId");
    
    const response = await ec2Client.send(
      new DescribeSecurityGroupsCommand({
        Filters: vpcId ? [{ Name: "vpc-id", Values: [vpcId] }] : undefined,
      })
    );
    
    const securityGroups = (response.SecurityGroups || []).map((sg) => ({
      groupId: sg.GroupId!,
      groupName: sg.GroupName!,
      description: sg.Description,
      vpcId: sg.VpcId,
      ownerId: sg.OwnerId,
      tags: Object.fromEntries(sg.Tags?.map((t) => [t.Key, t.Value]) || []),
      ipPermissions: sg.IpPermissions?.map((p) => ({
        ipProtocol: p.IpProtocol!,
        fromPort: p.FromPort,
        toPort: p.ToPort,
        ipRanges: p.IpRanges,
        ipv6Ranges: p.Ipv6Ranges,
        userIdGroupPairs: p.UserIdGroupPairs,
      })),
      ipPermissionsEgress: sg.IpPermissionsEgress?.map((p) => ({
        ipProtocol: p.IpProtocol!,
        fromPort: p.FromPort,
        toPort: p.ToPort,
        ipRanges: p.IpRanges,
      })),
    }));
    
    return NextResponse.json({ securityGroups });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { groupName, description, vpcId } = await request.json();
    
    const createResponse = await ec2Client.send(
      new CreateSecurityGroupCommand({
        GroupName: groupName,
        Description: description,
        VpcId: vpcId,
      })
    );
    
    return NextResponse.json({ groupId: createResponse.GroupId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");
    
    if (!groupId) {
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
    }
    
    await ec2Client.send(new DeleteSecurityGroupCommand({ GroupId: groupId }));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
