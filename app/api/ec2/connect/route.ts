import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

// Helper to run docker commands cross-platform
function runDockerCommand(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
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
      if (code === 0) {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      } else {
        reject(new Error(stderr || `Command failed with code ${code}`));
      }
    });

    docker.on("error", (err) => {
      reject(err);
    });
  });
}

// Find container by partial ID match
async function findContainerByInstanceId(instanceId: string): Promise<string | null> {
  try {
    // Get all running containers
    const { stdout } = await runDockerCommand(["ps", "--format", "{{.ID}}|{{.Names}}|{{.Image}}"]);
    
    if (!stdout) return null;

    const containers = stdout.split("\n").filter(line => line.trim());
    
    // Look for container with matching ID in name
    for (const line of containers) {
      const [id, name, image] = line.split("|");
      // Check if name contains instance ID (last 12 chars)
      if (name && name.toLowerCase().includes(instanceId.toLowerCase().slice(-12))) {
        return id;
      }
    }

    // If no match, return the ministack container itself for testing
    for (const line of containers) {
      const [id, name, image] = line.split("|");
      if (image && image.includes("ministack")) {
        console.log("Using MiniStack container as fallback:", id);
        return id;
      }
    }

    return null;
  } catch (error) {
    console.error("Error finding container:", error);
    return null;
  }
}

// POST /api/ec2/connect - Execute command in EC2 container
export async function POST(request: NextRequest) {
  try {
    const { instanceId, command = "bash" } = await request.json();

    if (!instanceId) {
      return NextResponse.json(
        { error: "Instance ID is required" },
        { status: 400 }
      );
    }

    const containerId = await findContainerByInstanceId(instanceId);

    if (!containerId) {
      return NextResponse.json(
        { 
          error: "Container not found. Is the instance running?",
          debug: "MiniStack may create EC2 instances internally, not as separate containers"
        },
        { status: 404 }
      );
    }

    // Execute the command
    const result = await runDockerCommand(["exec", containerId, "sh", "-c", command]);

    return NextResponse.json({
      success: true,
      output: result.stdout,
      error: result.stderr || null,
      containerId,
    });
  } catch (error: any) {
    console.error("Error connecting to instance:", error);
    return NextResponse.json(
      { 
        error: error.message || "Failed to connect to instance",
        details: error.stderr || null 
      },
      { status: 500 }
    );
  }
}

// GET /api/ec2/connect?instanceId=xxx - Get container logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get("instanceId");
    const tail = searchParams.get("tail") || "100";

    if (!instanceId) {
      return NextResponse.json(
        { error: "Instance ID is required" },
        { status: 400 }
      );
    }

    const containerId = await findContainerByInstanceId(instanceId);

    if (!containerId) {
      return NextResponse.json(
        { 
          error: "Container not found",
          debug: "Check if the instance is running and MiniStack creates actual containers"
        },
        { status: 404 }
      );
    }

    const result = await runDockerCommand(["logs", "--tail", tail, containerId]);

    return NextResponse.json({
      success: true,
      logs: result.stdout,
      error: result.stderr || null,
      containerId,
    });
  } catch (error: any) {
    console.error("Error getting instance logs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get logs" },
      { status: 500 }
    );
  }
}
