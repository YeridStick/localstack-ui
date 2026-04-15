import { NextResponse } from "next/server";
import { spawn } from "child_process";

interface ContainerMetrics {
  containerId: string;
  name: string;
  cpuPercent: number;
  memoryUsage: string;
  memoryLimit: string;
  memoryPercent: number;
  netIO: string;
  blockIO: string;
  pids: number;
}

interface SystemStats {
  totalContainers: number;
  runningContainers: number;
  totalNetworks: number;
  totalVolumes: number;
}

const EMPTY_SYSTEM_STATS: SystemStats = {
  totalContainers: 0,
  runningContainers: 0,
  totalNetworks: 0,
  totalVolumes: 0,
};

function isDockerUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as NodeJS.ErrnoException;
  if (err.code === "ENOENT") return true;
  if (typeof err.message === "string") {
    return err.message.toLowerCase().includes("spawn docker enonent");
  }
  return false;
}

export async function GET() {
  try {
    // Fetch Docker stats
    const statsOutput = await execDocker([
      "stats",
      "--no-stream",
      "--format",
      "{{.Container}}|{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.NetIO}}|{{.BlockIO}}|{{.PIDs}}",
    ]).catch((error) => {
      if (isDockerUnavailableError(error)) {
        return null;
      }
      throw error;
    });

    if (statsOutput === null) {
      return NextResponse.json({
        metrics: [],
        systemStats: EMPTY_SYSTEM_STATS,
        dockerAvailable: false,
      });
    }

    const lines = statsOutput
      .trim()
      .split("\n")
      .filter((line) => line);
    const parsedMetrics: ContainerMetrics[] = lines.map((line) => {
      const parts = line.split("|");
      return {
        containerId: parts[0]?.substring(0, 12) || "",
        name: parts[1] || "",
        cpuPercent: parseFloat(parts[2]?.replace("%", "")) || 0,
        memoryUsage: parts[3]?.split(" / ")[0] || "0B",
        memoryLimit: parts[3]?.split(" / ")[1] || "0B",
        memoryPercent: parseFloat(parts[4]?.replace("%", "")) || 0,
        netIO: parts[5] || "0B / 0B",
        blockIO: parts[6] || "0B / 0B",
        pids: parseInt(parts[7]) || 0,
      };
    });

    // Fetch system stats
    const infoOutput = await execDocker([
      "system",
      "df",
      "--format",
      "{{.Type}}|{{.TotalCount}}|{{.Active}}",
    ]).catch(() => "");

    const infoLines = infoOutput
      .trim()
      .split("\n")
      .filter((line) => line);
    let containers = 0;
    let networkCount = 0;
    let volumes = 0;

    infoLines.forEach((line) => {
      const [type, _total, active] = line.split("|");
      if (type === "Containers") {
        containers = parseInt(active) || 0;
      } else if (type === "Local Volumes") {
        volumes = parseInt(_total) || 0;
      } else if (type === "Networks") {
        networkCount = parseInt(_total) || 0;
      }
    });

    const networkOutput = await execDocker([
      "network",
      "ls",
      "--format",
      "{{.ID}}",
    ]).catch(() => "");
    const networks = networkOutput
      .trim()
      .split("\n")
      .filter((n) => n).length;

    const systemStats: SystemStats = {
      totalContainers: parsedMetrics.length,
      runningContainers: containers,
      totalNetworks: networks,
      totalVolumes: volumes,
    };

    return NextResponse.json({
      metrics: parsedMetrics,
      systemStats,
      dockerAvailable: true,
    });
  } catch (error: any) {
    console.error("Docker stats error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Docker stats" },
      { status: 500 }
    );
  }
}

const execDocker = (args: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    const proc = spawn("docker", args);
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finishResolve = (value: string) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const finishReject = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    proc.stdout.on("data", (data: Buffer) => (stdout += data.toString()));
    proc.stderr.on("data", (data: Buffer) => (stderr += data.toString()));
    proc.on("error", (error: NodeJS.ErrnoException) => {
      finishReject(error);
    });
    proc.on("close", (code: number) => {
      if (code === 0) finishResolve(stdout.trim());
      else finishReject(new Error(stderr || `Docker command failed`));
    });
  });
};
