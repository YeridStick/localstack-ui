import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

export async function POST(request: NextRequest) {
  const { containerId, command } = await request.json();

  if (!containerId || !command) {
    return NextResponse.json({ error: "Container ID and command required" }, { status: 400 });
  }

  return new Promise((resolve) => {
    const args = ["exec", containerId, "sh", "-c", command];
    const process = spawn("docker", args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      resolve(NextResponse.json({
        success: code === 0,
        exitCode: code,
        stdout: stdout || null,
        stderr: stderr || null,
      }));
    });

    process.on("error", (err) => {
      resolve(NextResponse.json({
        success: false,
        error: err.message,
      }, { status: 500 }));
    });
  });
}
