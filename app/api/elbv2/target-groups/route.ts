import { NextRequest, NextResponse } from "next/server";
import {
  DescribeTargetGroupsCommand,
  CreateTargetGroupCommand,
  DeleteTargetGroupCommand,
} from "@aws-sdk/client-elastic-load-balancing-v2";
import { elbv2Client } from "@/lib/aws-config";

// GET /api/elbv2/target-groups - List all target groups
export async function GET() {
  try {
    const response = await elbv2Client.send(new DescribeTargetGroupsCommand({}));
    const targetGroups = (response.TargetGroups || []).map((tg) => ({
      targetGroupArn: tg.TargetGroupArn,
      targetGroupName: tg.TargetGroupName!,
      protocol: tg.Protocol,
      port: tg.Port,
      vpcId: tg.VpcId,
      healthCheckProtocol: tg.HealthCheckProtocol,
      healthCheckPort: tg.HealthCheckPort,
      healthCheckEnabled: tg.HealthCheckEnabled,
      healthCheckIntervalSeconds: tg.HealthCheckIntervalSeconds,
      healthCheckTimeoutSeconds: tg.HealthCheckTimeoutSeconds,
      healthyThresholdCount: tg.HealthyThresholdCount,
      unhealthyThresholdCount: tg.UnhealthyThresholdCount,
      targetType: tg.TargetType,
    }));
    return NextResponse.json({ targetGroups });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/elbv2/target-groups - Create target group
export async function POST(request: NextRequest) {
  try {
    const { name, protocol, port, vpcId, targetType } = await request.json();
    const response = await elbv2Client.send(
      new CreateTargetGroupCommand({
        Name: name,
        Protocol: protocol,
        Port: port,
        VpcId: vpcId,
        TargetType: targetType || "instance",
      })
    );
    return NextResponse.json({ targetGroup: response.TargetGroups?.[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/elbv2/target-groups - Delete target group
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const arn = searchParams.get("arn");
    if (!arn) {
      return NextResponse.json({ error: "ARN is required" }, { status: 400 });
    }
    await elbv2Client.send(new DeleteTargetGroupCommand({ TargetGroupArn: arn }));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
