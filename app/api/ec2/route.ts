import { NextRequest, NextResponse } from "next/server";
import { DescribeInstancesCommand, RunInstancesCommand } from "@aws-sdk/client-ec2";
import { ec2Client } from "@/lib/aws-config";

// GET /api/ec2 - List all EC2 instances
export async function GET() {
  try {
    const response = await ec2Client.send(new DescribeInstancesCommand({}));
    
    const instances = (response.Reservations || []).flatMap((reservation) =>
      (reservation.Instances || []).map((instance) => ({
        instanceId: instance.InstanceId!,
        instanceType: instance.InstanceType!,
        state: instance.State?.Name as any,
        stateName: instance.State?.Name,
        launchTime: instance.LaunchTime,
        publicIpAddress: instance.PublicIpAddress,
        privateIpAddress: instance.PrivateIpAddress,
        publicDnsName: instance.PublicDnsName,
        privateDnsName: instance.PrivateDnsName,
        vpcId: instance.VpcId,
        subnetId: instance.SubnetId,
        imageId: instance.ImageId,
        keyName: instance.KeyName,
        securityGroups: instance.SecurityGroups?.map((sg) => ({
          groupId: sg.GroupId!,
          groupName: sg.GroupName!,
        })),
        tags: Object.fromEntries(
          instance.Tags?.map((tag) => [tag.Key, tag.Value]) || []
        ),
        platform: instance.Platform,
        architecture: instance.Architecture,
        hypervisor: instance.Hypervisor,
        virtualizationType: instance.VirtualizationType,
        rootDeviceType: instance.RootDeviceType,
        rootDeviceName: instance.RootDeviceName,
        ebsOptimized: instance.EbsOptimized,
        enaSupport: instance.EnaSupport,
      }))
    );

    return NextResponse.json({ instances });
  } catch (error: any) {
    console.error("Error listing EC2 instances:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list EC2 instances" },
      { status: 500 }
    );
  }
}

// POST /api/ec2 - Create EC2 instance
export async function POST(request: NextRequest) {
  try {
    const {
      imageId,
      instanceType,
      keyName,
      subnetId,
      securityGroupIds,
      volumeSize,
      minCount = 1,
      maxCount = 1,
    } = await request.json();

    const response = await ec2Client.send(
      new RunInstancesCommand({
        ImageId: imageId,
        InstanceType: instanceType,
        KeyName: keyName,
        SubnetId: subnetId,
        SecurityGroupIds: securityGroupIds,
        MinCount: minCount,
        MaxCount: maxCount,
        BlockDeviceMappings: volumeSize
          ? [
              {
                DeviceName: "/dev/sda1",
                Ebs: {
                  VolumeSize: volumeSize,
                  VolumeType: "gp2",
                  DeleteOnTermination: true,
                },
              },
            ]
          : undefined,
      })
    );

    return NextResponse.json({
      success: true,
      instances: response.Instances?.map((i) => ({
        instanceId: i.InstanceId,
        state: i.State?.Name,
      })),
    });
  } catch (error: any) {
    console.error("Error creating EC2 instance:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create instance" },
      { status: 500 }
    );
  }
}