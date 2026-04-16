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

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

// Helper to execute docker commands with timeout and proper error handling.
const execDocker = (
  args: string[],
  timeoutMs = 15_000
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const proc = spawn("docker", args, {
      shell: process.platform === "win32",
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(
        new Error(
          `Docker command timed out (${timeoutMs}ms): docker ${args.join(" ")}`
        )
      );
    }, timeoutMs);

    proc.stdout?.on("data", (data) => (stdout += data.toString()));
    proc.stderr?.on("data", (data) => (stderr += data.toString()));
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      reject(new Error(stderr || `Docker command failed with exit code ${code}`));
    });
    proc.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
};

const resolveDockerImage = (
  image: string | undefined,
  imageId: string | undefined
): string => {
  // If the caller already sent a Docker image, trust it.
  if (image && image.includes(":")) {
    return image;
  }

  // Map known AMI-like IDs to Docker images for simulation.
  const imageMap: Record<string, string> = {
    "ami-12345678": "alpine:latest",
    "ami-87654321": "ubuntu:20.04",
    "ami-abcd1234": "mcr.microsoft.com/windows/nanoserver:ltsc2022",
    "ami-ubuntu": "ubuntu:22.04",
    "ami-nginx": "nginx:alpine",
  };
  const requestedId = imageId || "ami-12345678";
  return imageMap[requestedId] || "alpine:latest";
};

const canUseDocker = async (): Promise<boolean> => {
  try {
    await execDocker(["ps", "--format", "{{.ID}}"], 5000);
    return true;
  } catch (error) {
    console.error("Docker is not available from API container:", toErrorMessage(error));
    return false;
  }
};

// Find Docker container by EC2 instance ID
const findContainerForInstance = async (instanceId: string): Promise<string | null> => {
  try {
    // Preferred label used by this endpoint.
    let containers = await execDocker([
      "ps", "-a",
      "--filter", `label=instance_id=${instanceId}`,
      "--format", "{{.ID}}"
    ]);

    if (!containers) {
      // Backward compatibility with older endpoint labels.
      containers = await execDocker([
        "ps",
        "-a",
        "--filter",
        `label=ec2-instance-id=${instanceId}`,
        "--format",
        "{{.ID}}",
      ]);
    }

    if (!containers) {
      // Fallback by container name.
      containers = await execDocker([
        "ps",
        "-a",
        "--filter",
        `name=ec2-${instanceId}`,
        "--format",
        "{{.ID}}",
      ]);
    }

    return containers.split("\n")[0] || null;
  } catch (error) {
    console.error(
      `Unable to resolve container for ${instanceId}:`,
      toErrorMessage(error)
    );
    return null;
  }
};

// GET - List all EC2 instances (excluding terminated)
export async function GET() {
  try {
    const command = new DescribeInstancesCommand({});
    const response = await ec2Client.send(command);
    const dockerEnabled = await canUseDocker();

    // Filter out terminated instances and find containers
    const instancesPromises =
      response.Reservations?.flatMap(
        (r) =>
          r.Instances?.filter((i) => i.State?.Name !== "terminated")
            .map(async (i) => {
              // Find associated Docker container only if Docker is available.
              const containerId = dockerEnabled
                ? await findContainerForInstance(i.InstanceId!)
                : null;
              const tags = i.Tags || [];
              const dockerImageFromTag =
                tags.find((t) => t.Key === "DockerImage")?.Value || null;

              return {
                id: i.InstanceId,
                instanceId: i.InstanceId,
                containerId: containerId || null,
                name:
                  tags.find((t) => t.Key === "Name")?.Value ||
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
                image: dockerImageFromTag || i.ImageId,
                availabilityZone: i.Placement?.AvailabilityZone,
                tags,
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
    const {
      image,
      imageId,
      instanceType,
      keyName,
      securityGroupIds,
      subnetId,
      tags,
      vpcId,
    } =
      await request.json();
    const dockerEnabled = await canUseDocker();
    if (!dockerEnabled) {
      return NextResponse.json(
        {
          error:
            "Docker no esta disponible en el contenedor localstack-ui. Revisa Docker CLI y /var/run/docker.sock.",
        },
        { status: 503 }
      );
    }
    const dockerImage = resolveDockerImage(image, imageId);
    const resolvedImageId = imageId || "ami-12345678";

    // 1. Create EC2 instance in miniStack for AWS API compatibility
    const awsCommand = new RunInstancesCommand({
      ImageId: resolvedImageId,
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
            { Key: "DockerImage", Value: dockerImage },
          ],
        },
      ],
    });

    const awsResponse = await ec2Client.send(awsCommand);
    const instanceId = awsResponse.Instances?.[0]?.InstanceId;
    if (!instanceId) {
      throw new Error("EC2 instance ID was not returned by the emulator");
    }

    let containerId = "";
    try {
      // 2. Get VPC network name if vpcId provided
      let networkName = "bridge";
      if (vpcId) {
        const vpcNetwork = await execDocker([
          "network",
          "ls",
          "--filter",
          `label=vpc-id=${vpcId}`,
          "--format",
          "{{.Name}}",
        ]);
        if (vpcNetwork) networkName = vpcNetwork;
      }

      // 3. Create real Docker container
      const containerName = `ec2-${instanceId}`;
      const dockerArgs = [
        "run",
        "-d",
        "--name",
        containerName,
        "--network",
        networkName,
        "--label",
        `instance_id=${instanceId}`,
        "--label",
        `ec2-instance-id=${instanceId}`,
        "--label",
        `managed-by=localstack-ui`,
        "--label",
        `instance-type=${instanceType || "t2.micro"}`,
        "--label",
        `ec2-instance-type=${instanceType || "t2.micro"}`,
        "--label",
        `vpc-id=${vpcId || "none"}`,
        "--label",
        "ec2-instance=true",
        dockerImage,
        "tail",
        "-f",
        "/dev/null", // Keep container running
      ];

      containerId = await execDocker(dockerArgs);
    } catch (dockerError) {
      // Rollback EC2 emulator instance if Docker container failed.
      await ec2Client.send(
        new TerminateInstancesCommand({
          InstanceIds: [instanceId],
        })
      );
      throw dockerError;
    }

    return NextResponse.json({
      success: true,
      instanceId,
      containerId: containerId.substring(0, 12),
      message: "EC2 instance created with real Docker container",
    });
  } catch (error: any) {
    console.error("EC2 Create error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create instance" },
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
