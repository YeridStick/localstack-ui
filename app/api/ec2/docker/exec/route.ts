import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

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

// POST - Execute command in container
export async function POST(request: NextRequest) {
  try {
    const { containerId, command } = await request.json();

    if (!containerId || !command) {
      return NextResponse.json(
        { error: "Container ID and command required" },
        { status: 400 }
      );
    }

    const result = await runDocker(["exec", containerId, "sh", "-c", command]);

    return NextResponse.json({
      success: result.code === 0,
      output: result.stdout,
      error: result.stderr || null,
      exitCode: result.code,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
