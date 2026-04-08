import { NextRequest, NextResponse } from "next/server";
import { TerminateInstancesCommand } from "@aws-sdk/client-ec2";
import { ec2Client } from "@/lib/aws-config";

// DELETE /api/ec2/[id] - Terminate an EC2 instance
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await ec2Client.send(
      new TerminateInstancesCommand({
        InstanceIds: [id],
      })
    );

    return NextResponse.json({ success: true, instanceId: id });
  } catch (error: any) {
    console.error("Error terminating EC2 instance:", error);
    return NextResponse.json(
      { error: error.message || "Failed to terminate instance" },
      { status: 500 }
    );
  }
}