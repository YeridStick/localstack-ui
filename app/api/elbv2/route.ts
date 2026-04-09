import { NextRequest, NextResponse } from "next/server";
import {
  DescribeLoadBalancersCommand,
  CreateLoadBalancerCommand,
  DeleteLoadBalancerCommand,
} from "@aws-sdk/client-elastic-load-balancing-v2";
import { elbv2Client } from "@/lib/aws-config";

// GET /api/elbv2 - List all load balancers
export async function GET() {
  try {
    const response = await elbv2Client.send(new DescribeLoadBalancersCommand({}));
    const loadBalancers = (response.LoadBalancers || []).map((lb) => ({
      loadBalancerArn: lb.LoadBalancerArn,
      loadBalancerName: lb.LoadBalancerName!,
      dnsName: lb.DNSName,
      canonicalHostedZoneId: lb.CanonicalHostedZoneId,
      createdTime: lb.CreatedTime,
      loadBalancerType: lb.Type,
      scheme: lb.Scheme,
      vpcId: lb.VpcId,
      state: lb.State,
      availabilityZones: lb.AvailabilityZones?.map((az) => ({
        zoneName: az.ZoneName,
        subnetId: az.SubnetId,
        loadBalancerAddresses: az.LoadBalancerAddresses,
      })),
      securityGroups: lb.SecurityGroups,
      ipAddressType: lb.IpAddressType,
    }));
    return NextResponse.json({ loadBalancers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/elbv2 - Create load balancer
export async function POST(request: NextRequest) {
  try {
    const { name, type, scheme, subnetIds, securityGroupIds } = await request.json();
    const response = await elbv2Client.send(
      new CreateLoadBalancerCommand({
        Name: name,
        Type: type,
        Scheme: scheme,
        Subnets: subnetIds,
        SecurityGroups: securityGroupIds,
      })
    );
    return NextResponse.json({
      loadBalancer: response.LoadBalancers?.[0],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/elbv2 - Delete load balancer
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const arn = searchParams.get("arn");
    if (!arn) {
      return NextResponse.json({ error: "ARN is required" }, { status: 400 });
    }
    await elbv2Client.send(new DeleteLoadBalancerCommand({ LoadBalancerArn: arn }));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
