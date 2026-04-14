import { NextResponse } from "next/server";
import { ec2Client } from "@/lib/aws-config";
import {
  DescribeInstancesCommand,
  RunInstancesCommand,
  StopInstancesCommand,
  StartInstancesCommand,
  TerminateInstancesCommand,
} from "@aws-sdk/client-ec2";
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

// Find Docker container by EC2 instance ID
const findContainerForInstance = async (instanceId: string): Promise<string | null> => {
  try {
    // miniStack labels containers with the instance ID
    const containers = await execDocker([
      "ps", "-a",
      "--filter", `label=instance_id=${instanceId}`,
      "--format", "{{.ID}}"
    ]);
    return containers.split("\n")[0] || null;
  } catch {
    return null;
  }
};

// GET - List all EC2 instances (excluding terminated)
export async function GET() {
  try {
    const command = new DescribeInstancesCommand({});
    const response = await ec2Client.send(command);

    // Filter out terminated instances and find containers
    const instancesPromises =
      response.Reservations?.flatMap(
        (r) =>
          r.Instances?.filter((i) => i.State?.Name !== "terminated")
            .map(async (i) => {
              // Find associated Docker container
              const containerId = await findContainerForInstance(i.InstanceId!);

              return {
                id: i.InstanceId,
                instanceId: i.InstanceId,
                containerId: containerId || `container-${i.InstanceId}`,
                name:
                  i.Tags?.find((t) => t.Key === "Name")?.Value ||
                  i.InstanceId,
                type: i.InstanceType,
                instanceType: i.InstanceType,
                state: i.State?.Name,
                publicIp: i.PublicIpAddress,
                privateIp: i.PrivateIpAddress,
                vpcId: i.VpcId,
                subnetId: i.SubnetId,
                launchTime: i.LaunchTime,
                imageId: i.ImageId,
                image: i.ImageId,
                availabilityZone: i.Placement?.AvailabilityZone,
                tags: i.Tags,
              };
            }) || []
      ) || [];

    const instances = await Promise.all(instancesPromises);

    return NextResponse.json({ instances });
  } catch (error) {
    console.error("EC2 DescribeInstances error:", error);
    return NextResponse.json(
      { error: "Failed to list instances" },
      { status: 500 }
    );
  }
}

// POST - Create hybrid EC2 instance (miniStack + Docker)
export async function POST(request: Request) {
  try {
    const { imageId, instanceType, keyName, securityGroupIds, subnetId, tags, vpcId } =
      await request.json();

    // 1. Create EC2 instance in miniStack for AWS API compatibility
    const awsCommand = new RunInstancesCommand({
      ImageId: imageId || "ami-12345678",
      InstanceType: instanceType || "t2.micro",
      MinCount: 1,
      MaxCount: 1,
      KeyName: keyName,
      SecurityGroupIds: securityGroupIds,
      SubnetId: subnetId,
      TagSpecifications: [
        {
          ResourceType: "instance",
          Tags: [
            ...(tags?.Name ? [{ Key: "Name", Value: tags.Name }] : []),
            { Key: "managed-by", Value: "localstack-ui" },
          ],
        },
      ],
    });

    const awsResponse = await ec2Client.send(awsCommand);
    const instanceId = awsResponse.Instances?.[0]?.InstanceId;
    if (!instanceId) {
      throw new Error("EC2 instance ID was not returned by the emulator");
    }

    // 2. Get VPC network name if vpcId provided
    let networkName = "bridge";
    if (vpcId) {
      const vpcNetwork = await execDocker([
        "network", "ls",
        "--filter", `label=vpc-id=${vpcId}`,
        "--format", "{{.Name}}"
      ]);
      if (vpcNetwork) networkName = vpcNetwork;
    }

    // 3. Create real Docker container
    const imageMap: Record<string, string> = {
      "ami-12345678": "alpine:latest",
      "ami-ubuntu": "ubuntu:22.04",
      "ami-nginx": "nginx:alpine",
    };
    const dockerImage = imageMap[imageId] || "alpine:latest";

    const containerName = `ec2-${instanceId}`;
    const dockerArgs = [
      "run", "-d",
      "--name", containerName,
      "--network", networkName,
      "--label", `instance_id=${instanceId}`,
      "--label", `managed-by=localstack-ui`,
      "--label", `instance-type=${instanceType || "t2.micro"}`,
      "--label", `vpc-id=${vpcId || "none"}`,
      dockerImage,
      "tail", "-f", "/dev/null"  // Keep container running
    ];

    const containerId = await execDocker(dockerArgs);

    return NextResponse.json({
      success: true,
      instanceId,
      containerId: containerId.substring(0, 12),
      message: "EC2 instance created with real Docker container",
    });
  } catch (error) {
    console.error("EC2 Create error:", error);
    return NextResponse.json(
      { error: "Failed to create instance" },
      { status: 500 }
    );
  }
}

// DELETE - Terminate EC2 instance (hybrid)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Instance ID required" },
        { status: 400 }
      );
    }

    // 1. Find and remove real Docker container
    const containerId = await findContainerForInstance(id);
    if (containerId) {
      try {
        await execDocker(["rm", "-f", containerId]);
      } catch (e) {
        console.log("Container already removed or not found");
      }
    }

    // 2. Also try by container name
    try {
      await execDocker(["rm", "-f", `ec2-${id}`]);
    } catch (e) {
      // Container might not exist
    }

    // 3. Terminate in miniStack AWS
    const command = new TerminateInstancesCommand({
      InstanceIds: [id],
    });
    await ec2Client.send(command);

    return NextResponse.json({ 
      success: true,
      message: "Instance terminated and container removed"
    });
  } catch (error) {
    console.error("EC2 Terminate error:", error);
    return NextResponse.json(
      { error: "Failed to terminate instance" },
      { status: 500 }
    );
  }
}

// PATCH - Start/Stop/Move EC2 instance (hybrid)
export async function PATCH(request: Request) {
  try {
    const { instanceId, action, vpcId } = await request.json();

    if (!instanceId || !action) {
      return NextResponse.json(
        { error: "Instance ID and action required" },
        { status: 400 }
      );
    }

    // Handle Docker container state
    const containerId = await findContainerForInstance(instanceId);
    const containerName = `ec2-${instanceId}`;

    if (action === "stop") {
      // Stop in AWS
      const awsCommand = new StopInstancesCommand({ InstanceIds: [instanceId] });
      await ec2Client.send(awsCommand);
      // Stop container
      if (containerId) {
        await execDocker(["stop", containerId]);
      }
    } else if (action === "start") {
      // Start in AWS
      const awsCommand = new StartInstancesCommand({ InstanceIds: [instanceId] });
      await ec2Client.send(awsCommand);
      // Start container
      if (containerId) {
        await execDocker(["start", containerId]);
      }
    } else if (action === "moveToVpc") {
      // Move EC2 to a different VPC (Docker network)
      if (!vpcId) {
        return NextResponse.json(
          { error: "VPC ID required for moveToVpc action" },
          { status: 400 }
        );
      }

      if (!containerId) {
        return NextResponse.json(
          { error: "Container not found for this instance" },
          { status: 404 }
        );
      }

      // Find the Docker network for this VPC
      const vpcNetwork = await execDocker([
        "network", "ls", "--filter", `label=vpc-id=${vpcId}`, "--format", "{{.Name}}"
      ]);

      if (!vpcNetwork) {
        return NextResponse.json(
          { error: `No Docker network found for VPC ${vpcId}` },
          { status: 404 }
        );
      }

      // Get current networks to disconnect from VPC networks
      const networkInspect = await execDocker([
        "inspect", containerId, "--format", "{{json .NetworkSettings.Networks}}"
      ]);
      const networks = JSON.parse(networkInspect);

      // Disconnect from all VPC-related networks (keep bridge/default)
      for (const networkName of Object.keys(networks)) {
        if (networkName.startsWith("vpc-")) {
          try {
            await execDocker(["network", "disconnect", networkName, containerId]);
          } catch (e) {
            console.log(`Failed to disconnect from ${networkName}:`, e);
          }
        }
      }

      // Connect to new VPC network
      await execDocker(["network", "connect", vpcNetwork, containerId]);

      // Note: Docker doesn't allow updating labels on running containers
      // The network attachment is the critical part for VPC functionality

      return NextResponse.json({
        success: true,
        message: `Instance moved to VPC ${vpcId} (network: ${vpcNetwork})`
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'start', 'stop', or 'moveToVpc'" },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: `Instance ${action}ed successfully`
    });
  } catch (error: any) {
    console.error("EC2 Patch error:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      stderr: error?.stderr,
    });
    return NextResponse.json(
      { error: error?.message || "Failed to execute action" },
      { status: 500 }
    );
  }
}
