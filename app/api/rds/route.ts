import { NextRequest, NextResponse } from "next/server";
import {
  DescribeDBInstancesCommand,
  CreateDBInstanceCommand,
  DeleteDBInstanceCommand,
} from "@aws-sdk/client-rds";
import { rdsClient } from "@/lib/aws-config";
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

// Helper to get Docker container info for RDS instance
async function getContainerInfoForRDS(rdsId: string): Promise<{ containerId: string; hostPort: string } | null> {
  try {
    const containerName = `rds-${rdsId}`;
    // Get container ID
    const containerId = await execDocker([
      "ps", "-q", "--filter", `name=${containerName}`, "--format", "{{.ID}}"
    ]);
    if (!containerId) return null;
    
    // Get port mapping
    const portOutput = await execDocker([
      "port", containerId, "5432"
    ]);
    // Parse "0.0.0.0:38751" format
    const match = portOutput.match(/:(\d+)$/);
    const hostPort = match ? match[1] : "";
    
    return { containerId: containerId.substring(0, 12), hostPort };
  } catch (e) {
    return null;
  }
}

// GET /api/rds - List all RDS instances from miniStack + Docker info
export async function GET() {
  try {
    const response = await rdsClient.send(new DescribeDBInstancesCommand({}));

    const instances = await Promise.all((response.DBInstances || []).map(async (instance) => {
      const rdsId = instance.DBInstanceIdentifier!;
      // Get Docker container info
      const containerInfo = await getContainerInfoForRDS(rdsId);
      
      return {
        id: rdsId,
        engine: instance.Engine!,
        engineVersion: instance.EngineVersion || "15",
        instanceClass: instance.DBInstanceClass!,
        allocatedStorage: instance.AllocatedStorage || 20,
        dbName: instance.DBName || "mydb",
        masterUsername: instance.MasterUsername || "admin",
        masterUserPassword: "", // Not returned by AWS API
        vpcId: instance.DBSubnetGroup?.VpcId || "",
        publiclyAccessible: instance.PubliclyAccessible || false,
        // Use Docker host port if available, fallback to AWS endpoint
        endpoint: containerInfo?.hostPort 
          ? `localhost:${containerInfo.hostPort}` 
          : instance.Endpoint 
            ? `${instance.Endpoint.Address}:${instance.Endpoint.Port}`
            : "",
        containerId: containerInfo?.containerId || "",
        status: instance.DBInstanceStatus || "available",
        multiAZ: instance.MultiAZ || false,
        replicas: instance.ReadReplicaDBInstanceIdentifiers?.length || 0,
        port: containerInfo?.hostPort || instance.Endpoint?.Port || 5432,
        createdAt: instance.InstanceCreateTime?.toISOString() || new Date().toISOString(),
      };
    }));

    return NextResponse.json({ instances });
  } catch (error: any) {
    console.error("RDS Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch RDS instances" },
      { status: 500 }
    );
  }
}

// POST /api/rds - Create RDS instance (hybrid: miniStack + Docker)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const dbInstanceIdentifier = `rds-${Date.now()}`;

    // 1. Create in miniStack for AWS API compatibility
    const response = await rdsClient.send(
      new CreateDBInstanceCommand({
        DBInstanceIdentifier: dbInstanceIdentifier,
        DBInstanceClass: body.instanceClass || "db.t3.micro",
        Engine: body.engine,
        EngineVersion: body.engine === "postgresql" ? "15" : "8.0",
        MasterUsername: body.masterUsername,
        MasterUserPassword: body.masterUserPassword,
        AllocatedStorage: body.allocatedStorage || 20,
        DBName: body.dbName,
        PubliclyAccessible: body.publiclyAccessible || false,
        MultiAZ: false,
        StorageEncrypted: false,
      })
    );

    // 2. Create real Docker container for the database
    const engineMap: Record<string, { image: string; port: number }> = {
      postgresql: { image: "postgres:15-alpine", port: 5432 },
      mysql: { image: "mysql:8.0", port: 3306 },
      mariadb: { image: "mariadb:11", port: 3306 },
    };

    const engineConfig = engineMap[body.engine] || engineMap.postgresql;
    const containerName = `rds-${dbInstanceIdentifier}`;
    const hostPort = Math.floor(Math.random() * 10000) + 30000; // Random port 30000-40000

    // Determine network
    let networkName = "bridge";
    if (body.vpcId) {
      try {
        const vpcNetwork = await execDocker([
          "network",
          "ls",
          "--filter",
          `label=vpc-id=${body.vpcId}`,
          "--format",
          "{{.Name}}",
        ]);
        if (vpcNetwork) networkName = vpcNetwork;
      } catch (e) {
        console.log("VPC network not found, using bridge");
      }
    }

    // Create volume for persistence
    const volumeName = `rds-data-${dbInstanceIdentifier}`;
    try {
      await execDocker(["volume", "create", volumeName]);
    } catch (e) {
      console.log("Volume might already exist");
    }

    // Build docker run command
    const dockerArgs = [
      "run",
      "-d",
      "--name",
      containerName,
      "--network",
      networkName,
      "-p",
      `${hostPort}:${engineConfig.port}`,
      "-v",
      `${volumeName}:/var/lib/postgresql/data`,
      "--label",
      `rds-id=${dbInstanceIdentifier}`,
      "--label",
      `managed-by=localstack-ui`,
      "--label",
      `engine=${body.engine}`,
      "--label",
      `vpc-id=${body.vpcId || "none"}`,
      "-e",
      `POSTGRES_USER=${body.masterUsername}`,
      "-e",
      `POSTGRES_PASSWORD=${body.masterUserPassword}`,
      "-e",
      `POSTGRES_DB=${body.dbName || "postgres"}`,
      engineConfig.image,
    ];

    // For MySQL/MariaDB use different env vars
    if (body.engine === "mysql" || body.engine === "mariadb") {
      dockerArgs.splice(
        -4,
        4,
        "-e",
        `MYSQL_ROOT_PASSWORD=${body.masterUserPassword}`,
        "-e",
        `MYSQL_USER=${body.masterUsername}`,
        "-e",
        `MYSQL_PASSWORD=${body.masterUserPassword}`,
        "-e",
        `MYSQL_DATABASE=${body.dbName || "mysql"}`,
        engineConfig.image
      );
    }

    const containerId = await execDocker(dockerArgs);

    return NextResponse.json({
      success: true,
      instance: {
        id: dbInstanceIdentifier,
        status: "available",
        endpoint: `localhost:${hostPort}`,
        containerId: containerId.substring(0, 12),
        engine: body.engine,
        port: hostPort,
      },
    });
  } catch (error: any) {
    console.error("RDS Create Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create database" },
      { status: 500 }
    );
  }
}

// PATCH /api/rds - Move RDS instance to different VPC
export async function PATCH(request: NextRequest) {
  try {
    const { rdsId, action, vpcId } = await request.json();

    if (!rdsId || !action) {
      return NextResponse.json(
        { error: "RDS ID and action required" },
        { status: 400 }
      );
    }

    if (action === "moveToVpc") {
      if (!vpcId) {
        return NextResponse.json(
          { error: "VPC ID required for moveToVpc action" },
          { status: 400 }
        );
      }

      // Find container for this RDS
      const containerName = `rds-${rdsId}`;
      const containerId = await execDocker([
        "ps", "-q", "--filter", `name=${containerName}`, "--format", "{{.ID}}"
      ]);

      if (!containerId) {
        return NextResponse.json(
          { error: "Container not found for this RDS instance" },
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

      // Get current networks
      const networkInspect = await execDocker([
        "inspect", containerId, "--format", "{{json .NetworkSettings.Networks}}"
      ]);
      const networks = JSON.parse(networkInspect);

      // Disconnect from VPC networks
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
        message: `RDS instance moved to VPC ${vpcId} (network: ${vpcNetwork})`
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("RDS Patch Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to move RDS instance" },
      { status: 500 }
    );
  }
}

// DELETE /api/rds - Delete RDS instance (hybrid: miniStack + Docker)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "RDS instance ID required" },
        { status: 400 }
      );
    }

    // 1. Delete from miniStack
    await rdsClient.send(
      new DeleteDBInstanceCommand({
        DBInstanceIdentifier: id,
        SkipFinalSnapshot: true,
        DeleteAutomatedBackups: true,
      })
    );

    // 2. Stop and remove Docker container
    const containerName = `rds-${id}`;
    try {
      await execDocker(["rm", "-f", containerName]);
    } catch (e) {
      console.log("Container might not exist");
    }

    // 3. Remove volume (optional - keep data for safety)
    // await execDocker(["volume", "rm", `rds-data-${id}`]);

    return NextResponse.json({
      success: true,
      message: "RDS instance and container deleted",
    });
  } catch (error: any) {
    console.error("RDS Delete Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete RDS instance" },
      { status: 500 }
    );
  }
}