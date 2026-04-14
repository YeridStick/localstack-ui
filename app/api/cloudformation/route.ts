import { NextRequest, NextResponse } from "next/server";
import { cloudFormationClient } from "@/lib/aws-config";
import {
  ListStacksCommand,
  CreateStackCommand,
  DeleteStackCommand,
  DescribeStacksCommand,
  UpdateStackCommand,
  ValidateTemplateCommand,
} from "@aws-sdk/client-cloudformation";

// GET /api/cloudformation - List all stacks
export async function GET(request: NextRequest) {
  try {
    const response = await cloudFormationClient.send(new ListStacksCommand({}));
    
    return NextResponse.json({
      stacks: response.StackSummaries || [],
      total: response.StackSummaries?.length || 0,
    });
  } catch (error: any) {
    console.error("CloudFormation List Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list CloudFormation stacks" },
      { status: 500 }
    );
  }
}

// POST /api/cloudformation - Create new stack
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stackName, templateBody, parameters = [], tags = [] } = body;

    if (!stackName || !templateBody) {
      return NextResponse.json(
        { error: "Stack name and template body are required" },
        { status: 400 }
      );
    }

    const command = new CreateStackCommand({
      StackName: stackName,
      TemplateBody: templateBody,
      Parameters: parameters,
      Tags: tags,
      Capabilities: ["CAPABILITY_IAM", "CAPABILITY_NAMED_IAM"],
    });

    const response = await cloudFormationClient.send(command);

    return NextResponse.json({
      stackId: response.StackId,
      message: `Stack ${stackName} created successfully`,
    });
  } catch (error: any) {
    console.error("CloudFormation Create Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create CloudFormation stack" },
      { status: 500 }
    );
  }
}

// DELETE /api/cloudformation - Delete stack
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stackName = searchParams.get("stackName");

    if (!stackName) {
      return NextResponse.json(
        { error: "Stack name is required" },
        { status: 400 }
      );
    }

    const command = new DeleteStackCommand({
      StackName: stackName,
    });

    await cloudFormationClient.send(command);

    return NextResponse.json({
      message: `Stack ${stackName} deletion initiated`,
    });
  } catch (error: any) {
    console.error("CloudFormation Delete Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete CloudFormation stack" },
      { status: 500 }
    );
  }
}

// PATCH /api/cloudformation - Update stack
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { stackName, templateBody, parameters = [] } = body;

    if (!stackName || !templateBody) {
      return NextResponse.json(
        { error: "Stack name and template body are required" },
        { status: 400 }
      );
    }

    const command = new UpdateStackCommand({
      StackName: stackName,
      TemplateBody: templateBody,
      Parameters: parameters,
      Capabilities: ["CAPABILITY_IAM", "CAPABILITY_NAMED_IAM"],
    });

    const response = await cloudFormationClient.send(command);

    return NextResponse.json({
      stackId: response.StackId,
      message: `Stack ${stackName} updated successfully`,
    });
  } catch (error: any) {
    console.error("CloudFormation Update Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update CloudFormation stack" },
      { status: 500 }
    );
  }
}
