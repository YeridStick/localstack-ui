import { NextResponse } from "next/server";
import { DescribeDBInstancesCommand } from "@aws-sdk/client-rds";
import { rdsClient } from "@/lib/aws-config";

// GET /api/rds - List all RDS instances
export async function GET() {
  try {
    const response = await rdsClient.send(new DescribeDBInstancesCommand({}));
    
    const instances = (response.DBInstances || []).map((instance) => ({
      dbInstanceIdentifier: instance.DBInstanceIdentifier!,
      dbInstanceClass: instance.DBInstanceClass!,
      engine: instance.Engine!,
      engineVersion: instance.EngineVersion,
      dbInstanceStatus: instance.DBInstanceStatus!,
      masterUsername: instance.MasterUsername,
      dbName: instance.DBName,
      allocatedStorage: instance.AllocatedStorage,
      instanceCreateTime: instance.InstanceCreateTime,
      availabilityZone: instance.AvailabilityZone,
      vpcSecurityGroups: instance.VpcSecurityGroups?.map((sg) => ({
        vpcSecurityGroupId: sg.VpcSecurityGroupId!,
        status: sg.Status!,
      })),
      dbParameterGroups: instance.DBParameterGroups?.map((pg) => ({
        dbParameterGroupName: pg.DBParameterGroupName!,
        parameterApplyStatus: pg.ParameterApplyStatus!,
      })),
      endpoint: instance.Endpoint
        ? {
            address: instance.Endpoint.Address,
            port: instance.Endpoint.Port,
            hostedZoneId: instance.Endpoint.HostedZoneId,
          }
        : undefined,
      multiAZ: instance.MultiAZ,
      storageType: instance.StorageType,
      iops: instance.Iops,
      publiclyAccessible: instance.PubliclyAccessible,
      storageEncrypted: instance.StorageEncrypted,
      kmsKeyId: instance.KmsKeyId,
      dbiResourceId: instance.DbiResourceId,
      tags: Object.fromEntries(instance.TagList?.map((tag) => [tag.Key, tag.Value]) || []),
      copyTagsToSnapshot: instance.CopyTagsToSnapshot,
      monitoringInterval: instance.MonitoringInterval,
      monitoringRoleArn: instance.MonitoringRoleArn,
      enabledCloudwatchLogsExports: instance.EnabledCloudwatchLogsExports,
    }));

    return NextResponse.json({ instances });
  } catch (error: any) {
    console.error("Error listing RDS instances:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list RDS instances" },
      { status: 500 }
    );
  }
}