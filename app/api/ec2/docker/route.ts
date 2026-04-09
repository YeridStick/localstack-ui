import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { randomUUID } from "crypto";

// Docker command runner for Windows
function runDocker(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const isWindows = process.platform === "win32";
    const docker = spawn("docker", args, {
      shell: isWindows,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    docker.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    docker.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    docker.on("close", (code) => {
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code: code || 0 });
    });

    docker.on("error", (err) => {
      resolve({ stdout: "", stderr: err.message, code: 1 });
    });
  });
}

// Generate EC2-like instance ID
function generateInstanceId(): string {
  const uuid = randomUUID().replace(/-/g, "").toLowerCase();
  return `i-${uuid.substring(0, 17)}`;
}

// Helper to parse Docker JSON output
function parseDockerContainer(container: any) {
  const id = container.ID || container.Id || container.id || "";
  const name = (container.Names || container.Name || container.names || "")[0] || "";
  const image = container.Image || container.image || "";
  const status = container.Status || container.status || container.State || "";
  const ports = container.Ports || container.ports || [];
  const labels = container.Labels || container.labels || {};
  const state = container.State || container.state || "";

  // Check if this is an EC2 container
  const isEC2 = labels["ec2-instance"] === "true" ||
                name?.startsWith("ec2-") ||
                name?.includes("instancia") ||
                image === "ubuntu:22.04" ||
                image === "alpine:latest" ||
                image === "debian:bookworm" ||
                image === "centos:stream9";

  if (!isEC2) return null;

  // Map Docker state to EC2 state
  let ec2State = "stopped";
  const stateLower = state.toLowerCase();
  const statusLower = (status || "").toLowerCase();
  if (stateLower === "running" || statusLower.includes("up")) ec2State = "running";
  else if (stateLower === "created" || statusLower.includes("created")) ec2State = "pending";
  else if (stateLower === "exited" || statusLower.includes("exited")) ec2State = "stopped";

  // Build ports string
  let portsStr = "";
  if (Array.isArray(ports)) {
    portsStr = ports.map((p: any) => `${p.PublicPort}:${p.PrivatePort}`).join(", ");
  }

  return {
    instanceId: labels["ec2-instance-id"] || name || id.slice(0, 12),
    containerId: id,
    instanceType: labels["ec2-instance-type"] || "t2.micro",
    state: ec2State,
    image,
    name: name || id.slice(0, 12),
    status,
    publicIpAddress: portsStr?.includes(":") ? `127.0.0.1` : undefined,
    launchTime: labels["ec2-launch-time"],
  };
}

// GET - List all EC2 containers using JSON format
export async function GET() {
  try {
    // Use JSON format which works better cross-platform
    const result = await runDocker([
      "ps",
      "-a",
      "--format",
      "json",
    ]);

    if (result.code !== 0) {
      console.error("Docker ps error:", result.stderr);
      return NextResponse.json({ error: result.stderr }, { status: 500 });
    }

    const containers: any[] = [];
    const lines = result.stdout.split("\n").filter((line) => line.trim());

    for (const line of lines) {
      try {
        const container = JSON.parse(line);
        const parsed = parseDockerContainer(container);
        if (parsed) {
          containers.push(parsed);
        }
      } catch (parseError) {
        // Skip lines that can't be parsed
        console.log("Could not parse line:", line.slice(0, 100));
      }
    }

    console.log(`Found ${containers.length} EC2 containers`);
    return NextResponse.json({ instances: containers });
  } catch (error: any) {
    console.error("GET /api/ec2/docker error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new EC2 container
export async function POST(request: NextRequest) {
  try {
    const {
      image,
      instanceType = "t2.micro",
      name,
      ports = [],
      env = [],
      volumeSize,
    } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "Docker image is required" }, { status: 400 });
    }

    const instanceId = generateInstanceId();
    const containerName = name || `ec2-${instanceType.replace(".", "-")}-${instanceId.slice(-8)}`;
    const launchTime = new Date().toISOString();

    // Build docker run command
    const args = [
      "run",
      "-d",
      "--name",
      containerName,
      "--label",
      "ec2-instance=true",
      "--label",
      `ec2-instance-id=${instanceId}`,
      "--label",
      `ec2-instance-type=${instanceType}`,
      "--label",
      `ec2-launch-time=${launchTime}`,
    ];

    // Add ports
    ports.forEach((port: string) => {
      args.push("-p", port);
    });

    // Add environment variables
    env.forEach((e: string) => {
      args.push("-e", e);
    });

    // Add volume if specified (create a named volume)
    if (volumeSize) {
      const volumeName = `ec2-vol-${instanceId.slice(-8)}`;
      // Create volume first
      await runDocker(["volume", "create", "-d", "local", volumeName]);
      args.push("-v", `${volumeName}:/data`);
    }

    // Keep container running
    args.push("--init");

    // Add the image
    args.push(image);

    // Default command to keep container running
    args.push("tail", "-f", "/dev/null");

    const result = await runDocker(args);

    if (result.code !== 0) {
      return NextResponse.json(
        { error: "Failed to create container", details: result.stderr },
        { status: 500 }
      );
    }

    const containerId = result.stdout;

    return NextResponse.json({
      success: true,
      instanceId,
      containerId,
      containerName,
      state: "running",
      image,
      instanceType,
      launchTime,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Start/Stop container
export async function PUT(request: NextRequest) {
  try {
    const { instanceId, action } = await request.json();

    if (!instanceId || !action) {
      return NextResponse.json({ error: "Instance ID and action required" }, { status: 400 });
    }

    // Find container by label first
    let result = await runDocker([
      "ps",
      "-aq",
      "--filter",
      `label=ec2-instance-id=${instanceId}`,
    ]);

    let containerId = result.stdout.trim().split("\n")[0];

    // If not found by label, search by name
    if (!containerId) {
      result = await runDocker([
        "ps",
        "-aq",
        "--filter",
        `name=${instanceId}`,
      ]);
      containerId = result.stdout.trim().split("\n")[0];
    }

    // Last resort: try to find by partial name match in all containers
    if (!containerId) {
      const allResult = await runDocker(["ps", "-aq", "--format", "{{.ID}}|{{.Names}}"]);
      const lines = allResult.stdout.split("\n");
      for (const line of lines) {
        const parts = line.split("|");
        if (parts.length >= 2 && parts[1].includes(instanceId)) {
          containerId = parts[0];
          break;
        }
      }
    }

    if (!containerId) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 });
    }

    if (action === "start") {
      const startResult = await runDocker(["start", containerId]);
      if (startResult.code !== 0) {
        return NextResponse.json({ error: startResult.stderr }, { status: 500 });
      }
    } else if (action === "stop") {
      const stopResult = await runDocker(["stop", containerId]);
      if (stopResult.code !== 0) {
        return NextResponse.json({ error: stopResult.stderr }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, action, containerId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Terminate container
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get("instanceId");

    if (!instanceId) {
      return NextResponse.json({ error: "Instance ID required" }, { status: 400 });
    }

    // Find container
    const result = await runDocker([
      "ps",
      "-aq",
      "--filter",
      `label=ec2-instance-id=${instanceId}`,
    ]);

    if (!result.stdout.trim()) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 });
    }

    const containerId = result.stdout.trim().split("\n")[0];

    // Stop and remove
    await runDocker(["stop", containerId]);
    const rmResult = await runDocker(["rm", "-v", containerId]);

    if (rmResult.code !== 0) {
      return NextResponse.json({ error: rmResult.stderr }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Instance terminated" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
