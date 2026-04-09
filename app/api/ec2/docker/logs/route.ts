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

// GET - Get container logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const containerId = searchParams.get("containerId");
    const tail = searchParams.get("tail") || "100";
    const follow = searchParams.get("follow") === "true";

    if (!containerId) {
      return NextResponse.json(
        { error: "Container ID required" },
        { status: 400 }
      );
    }

    const args = ["logs", "--tail", tail];
    if (follow) {
      args.push("-f");
    }
    args.push(containerId);

    const result = await runDocker(args);

    return NextResponse.json({
      success: result.code === 0,
      logs: result.stdout,
      error: result.stderr || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
