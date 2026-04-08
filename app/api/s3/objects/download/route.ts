import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/aws-config";

// GET /api/s3/objects/download - Download an object
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bucketName = searchParams.get("bucketName");
    const key = searchParams.get("key");

    if (!bucketName || !key) {
      return NextResponse.json(
        { error: "Bucket name and key are required" },
        { status: 400 },
      );
    }

    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
    );

    if (!response.Body) {
      return NextResponse.json({ error: "No data received" }, { status: 404 });
    }

    const data = await response.Body.transformToByteArray();
    const buffer = Buffer.from(data); 

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": response.ContentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${key.split("/").pop()}"`,
      },
    });
  } catch (error: any) {
    console.error("Error downloading object:", error);
    return NextResponse.json(
      { error: error.message || "Failed to download object" },
      { status: 500 },
    );
  }
}
