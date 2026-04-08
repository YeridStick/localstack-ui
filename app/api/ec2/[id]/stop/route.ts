import { NextRequest, NextResponse } from "next/server";
import { StopInstancesCommand } from "@aws-sdk/client-ec2";
import { ec2Client } from "@/lib/aws-config";

// POST /api/ec2/[id]/stop - Stop an EC2 instance
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await ec2Client.send(
      new StopInstancesCommand({
        InstanceIds: [id],
      })
    );

    return NextResponse.json({ success: true, instanceId: id });
  } catch (error: any) {
    console.error("Error stopping EC2 instance:", error);
    return NextResponse.json(
      { error: error.message || "Failed to stop instance" },
      { status: 500 }
    );
  }
}