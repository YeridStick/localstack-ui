import { NextRequest, NextResponse } from "next/server";
import { DeleteDBInstanceCommand } from "@aws-sdk/client-rds";
import { rdsClient } from "@/lib/aws-config";

// DELETE /api/rds/[id] - Delete an RDS instance
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const skipFinalSnapshot = searchParams.get("skipFinalSnapshot") !== "false";

    await rdsClient.send(
      new DeleteDBInstanceCommand({
        DBInstanceIdentifier: id,
        SkipFinalSnapshot: skipFinalSnapshot,
        ...(skipFinalSnapshot ? {} : { FinalDBSnapshotIdentifier: `${id}-final-snapshot` }),
      })
    );

    return NextResponse.json({ success: true, dbInstanceIdentifier: id });
  } catch (error: any) {
    console.error("Error deleting RDS instance:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete RDS instance" },
      { status: 500 }
    );
  }
}