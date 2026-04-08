import { NextRequest, NextResponse } from "next/server";
import { StartInstancesCommand } from "@aws-sdk/client-ec2";
import { ec2Client } from "@/lib/aws-config";

// POST /api/ec2/[id]/start - Start an EC2 instance
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await ec2Client.send(
      new StartInstancesCommand({
        InstanceIds: [id],
      })
    );

    return NextResponse.json({ success: true, instanceId: id });
  } catch (error: any) {
    console.error("Error starting EC2 instance:", error);
    return NextResponse.json(
      { error: error.message || "Failed to start instance" },
      { status: 500 }
    );
  }
}