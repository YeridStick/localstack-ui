import { NextRequest, NextResponse } from "next/server";
import { cloudFormationClient } from "@/lib/aws-config";
import {
  cleanupHybridEc2ContainersForStack,
  scheduleHybridEc2SyncForStack,
} from "@/lib/cloudformation/hybrid-ec2-sync";
import {
  ListStacksCommand,
  CreateStackCommand,
  DeleteStackCommand,
  UpdateStackCommand,
} from "@aws-sdk/client-cloudformation";

export async function GET() {
  try {
    const command = new ListStacksCommand({});
    const response = await cloudFormationClient.send(command);

    const stacks =
      response.StackSummaries?.map((stack) => ({
        stackId: stack.StackId,
        stackName: stack.StackName,
        templateDescription: stack.TemplateDescription,
        creationTime: stack.CreationTime,
        lastUpdatedTime: stack.LastUpdatedTime,
        deletionTime: stack.DeletionTime,
        stackStatus: stack.StackStatus,
        stackStatusReason: stack.StackStatusReason,
        parentId: stack.ParentId,
        rootId: stack.RootId,
        driftInformation: stack.DriftInformation,
      })) || [];

    return NextResponse.json(stacks);
  } catch (error: any) {
    console.error("Error listing stacks:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list stacks" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      stackName,
      templateBody,
      templateURL,
      parameters,
      disableRollback,
      rollbackConfiguration,
      timeoutInMinutes,
      notificationARNs,
      capabilities,
      resourceTypes,
      roleARN,
      onFailure,
      stackPolicyBody,
      stackPolicyURL,
      tags,
      clientRequestToken,
      enableTerminationProtection,
      retainExceptOnCreate,
    } = body;

    if (!stackName || (!templateBody && !templateURL)) {
      return NextResponse.json(
        { error: "Stack name and template (body or URL) are required" },
        { status: 400 },
      );
    }

    const command = new CreateStackCommand({
      StackName: stackName,
      TemplateBody: templateBody,
      TemplateURL: templateURL,
      Parameters: parameters?.map((p: any) => ({
        ParameterKey: p.parameterKey,
        ParameterValue: p.parameterValue,
        UsePreviousValue: p.usePreviousValue,
        ResolvedValue: p.resolvedValue,
      })),
      DisableRollback: disableRollback,
      RollbackConfiguration: rollbackConfiguration,
      TimeoutInMinutes: timeoutInMinutes,
      NotificationARNs: notificationARNs,
      Capabilities: capabilities,
      ResourceTypes: resourceTypes,
      RoleARN: roleARN,
      OnFailure: onFailure,
      StackPolicyBody: stackPolicyBody,
      StackPolicyURL: stackPolicyURL,
      Tags: tags?.map((t: any) => ({
        Key: t.key,
        Value: t.value,
      })),
      ClientRequestToken: clientRequestToken,
      EnableTerminationProtection: enableTerminationProtection,
      RetainExceptOnCreate: retainExceptOnCreate,
    });

    const response = await cloudFormationClient.send(command);
    scheduleHybridEc2SyncForStack(stackName);

    return NextResponse.json({
      stackId: response.StackId,
      hybridEc2SyncScheduled: true,
    });
  } catch (error: any) {
    console.error("Error creating stack:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create stack" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      stackName,
      templateBody,
      templateURL,
      usePreviousTemplate,
      stackPolicyDuringUpdateBody,
      stackPolicyDuringUpdateURL,
      parameters,
      capabilities,
      resourceTypes,
      roleARN,
      rollbackConfiguration,
      stackPolicyBody,
      stackPolicyURL,
      notificationARNs,
      tags,
      disableRollback,
      clientRequestToken,
    } = body;

    if (!stackName) {
      return NextResponse.json(
        { error: "Stack name is required" },
        { status: 400 },
      );
    }

    const command = new UpdateStackCommand({
      StackName: stackName,
      TemplateBody: templateBody,
      TemplateURL: templateURL,
      UsePreviousTemplate: usePreviousTemplate,
      StackPolicyDuringUpdateBody: stackPolicyDuringUpdateBody,
      StackPolicyDuringUpdateURL: stackPolicyDuringUpdateURL,
      Parameters: parameters?.map((p: any) => ({
        ParameterKey: p.parameterKey,
        ParameterValue: p.parameterValue,
        UsePreviousValue: p.usePreviousValue,
        ResolvedValue: p.resolvedValue,
      })),
      Capabilities: capabilities,
      ResourceTypes: resourceTypes,
      RoleARN: roleARN,
      RollbackConfiguration: rollbackConfiguration,
      StackPolicyBody: stackPolicyBody,
      StackPolicyURL: stackPolicyURL,
      NotificationARNs: notificationARNs,
      Tags: tags?.map((t: any) => ({
        Key: t.key,
        Value: t.value,
      })),
      DisableRollback: disableRollback,
      ClientRequestToken: clientRequestToken,
    });

    const response = await cloudFormationClient.send(command);
    scheduleHybridEc2SyncForStack(stackName);

    return NextResponse.json({
      stackId: response.StackId,
      hybridEc2SyncScheduled: true,
    });
  } catch (error: any) {
    console.error("Error updating stack:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update stack" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stackName = searchParams.get("stackName");
    const retainResources = searchParams.get("retainResources");
    const roleARN = searchParams.get("roleARN");
    const clientRequestToken = searchParams.get("clientRequestToken");

    if (!stackName) {
      return NextResponse.json(
        { error: "Stack name is required" },
        { status: 400 },
      );
    }

    const command = new DeleteStackCommand({
      StackName: stackName,
      RetainResources: retainResources ? retainResources.split(",") : undefined,
      RoleARN: roleARN || undefined,
      ClientRequestToken: clientRequestToken || undefined,
    });

    const cleanupSummary = await cleanupHybridEc2ContainersForStack(stackName);
    await cloudFormationClient.send(command);

    return NextResponse.json({
      success: true,
      hybridEc2ContainersRemoved: cleanupSummary.removedContainers,
      hybridEc2CleanupErrors: cleanupSummary.errors,
    });
  } catch (error: any) {
    console.error("Error deleting stack:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete stack" },
      { status: 500 },
    );
  }
}
