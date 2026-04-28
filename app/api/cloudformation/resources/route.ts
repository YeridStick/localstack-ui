import { NextRequest, NextResponse } from "next/server";
import { cloudFormationClient } from "@/lib/aws-config";
import { syncHybridEc2ContainersForStack } from "@/lib/cloudformation/hybrid-ec2-sync";
import {
  ListStackResourcesCommand,
  DescribeStackResourcesCommand,
} from "@aws-sdk/client-cloudformation";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stackName = searchParams.get("stackName");
    const logicalResourceId = searchParams.get("logicalResourceId");

    if (!stackName) {
      return NextResponse.json(
        { error: "Stack name is required" },
        { status: 400 },
      );
    }

    try {
      await syncHybridEc2ContainersForStack(stackName);
    } catch (syncError) {
      console.warn(
        `No se pudo reconciliar EC2 hibrida para stack '${stackName}'`,
        syncError,
      );
    }

    if (logicalResourceId) {
      // Get specific resource details
      const command = new DescribeStackResourcesCommand({
        StackName: stackName,
        LogicalResourceId: logicalResourceId,
      });

      const response = await cloudFormationClient.send(command);
      const resources =
        response.StackResources?.map((resource) => ({
          stackName: resource.StackName,
          stackId: resource.StackId,
          logicalResourceId: resource.LogicalResourceId,
          physicalResourceId: resource.PhysicalResourceId,
          resourceType: resource.ResourceType,
          timestamp: resource.Timestamp,
          resourceStatus: resource.ResourceStatus,
          resourceStatusReason: resource.ResourceStatusReason,
          description: resource.Description,
          metadata: null, // This property doesn't exist in the SDK
          driftInformation: resource.DriftInformation,
          moduleInfo: resource.ModuleInfo,
        })) || [];

      return NextResponse.json(resources);
    } else {
      // List all resources for the stack
      const command = new ListStackResourcesCommand({
        StackName: stackName,
      });

      const response = await cloudFormationClient.send(command);
      const resources =
        response.StackResourceSummaries?.map((resource) => ({
          logicalResourceId: resource.LogicalResourceId,
          physicalResourceId: resource.PhysicalResourceId,
          resourceType: resource.ResourceType,
          timestamp: resource.LastUpdatedTimestamp,
          resourceStatus: resource.ResourceStatus,
          resourceStatusReason: resource.ResourceStatusReason,
          driftInformation: resource.DriftInformation,
          moduleInfo: resource.ModuleInfo,
        })) || [];

      return NextResponse.json(resources);
    }
  } catch (error: any) {
    console.error("Error listing stack resources:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list stack resources" },
      { status: 500 },
    );
  }
}
