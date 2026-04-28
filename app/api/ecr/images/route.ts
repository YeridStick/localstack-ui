import { NextRequest, NextResponse } from "next/server";
import { ecrClient } from "@/lib/aws-config";
import {
  BatchDeleteImageCommand,
  DescribeImagesCommand,
  type ImageIdentifier,
  type TagStatus,
} from "@aws-sdk/client-ecr";

function mapImage(repositoryName: string, image: {
  registryId?: string;
  imageDigest?: string;
  imageTags?: string[];
  imageSizeInBytes?: number;
  imagePushedAt?: Date;
  imageManifestMediaType?: string;
  artifactMediaType?: string;
}) {
  return {
    repositoryName,
    registryId: image.registryId,
    imageDigest: image.imageDigest,
    imageTags: image.imageTags || [],
    imageSizeInBytes: image.imageSizeInBytes,
    imagePushedAt: image.imagePushedAt,
    imageManifestMediaType: image.imageManifestMediaType,
    artifactMediaType: image.artifactMediaType,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repositoryName = searchParams.get("repositoryName")?.trim();
    const tagStatusParam = searchParams.get("tagStatus");
    const tagStatus: TagStatus | undefined =
      tagStatusParam === "TAGGED" ||
      tagStatusParam === "UNTAGGED" ||
      tagStatusParam === "ANY"
        ? tagStatusParam
        : undefined;

    if (!repositoryName) {
      return NextResponse.json(
        { error: "repositoryName is required" },
        { status: 400 },
      );
    }

    const images: ReturnType<typeof mapImage>[] = [];
    let nextToken: string | undefined;

    do {
      const response = await ecrClient.send(
        new DescribeImagesCommand({
          repositoryName,
          nextToken,
          maxResults: 100,
          filter: tagStatus ? { tagStatus } : undefined,
        }),
      );

      images.push(
        ...(response.imageDetails || []).map((image) =>
          mapImage(repositoryName, image),
        ),
      );

      nextToken = response.nextToken;
    } while (nextToken);

    return NextResponse.json({
      repositoryName,
      images,
      total: images.length,
    });
  } catch (error: any) {
    console.error("ECR describe images error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to list ECR images" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const repositoryName =
      typeof body?.repositoryName === "string"
        ? body.repositoryName.trim()
        : "";
    const imageIds: unknown[] = Array.isArray(body?.imageIds) ? body.imageIds : [];

    if (!repositoryName) {
      return NextResponse.json(
        { error: "repositoryName is required" },
        { status: 400 },
      );
    }

    const normalizedImageIds: ImageIdentifier[] = imageIds
      .map((entry: unknown): ImageIdentifier | null => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const value = entry as Record<string, unknown>;
        const imageDigest =
          typeof value.imageDigest === "string" ? value.imageDigest : undefined;
        const imageTag =
          typeof value.imageTag === "string" ? value.imageTag : undefined;
        if (!imageDigest && !imageTag) {
          return null;
        }
        return {
          imageDigest,
          imageTag,
        };
      })
      .filter((entry): entry is ImageIdentifier => Boolean(entry));

    if (normalizedImageIds.length === 0) {
      return NextResponse.json(
        { error: "At least one image id (imageDigest or imageTag) is required" },
        { status: 400 },
      );
    }

    const response = await ecrClient.send(
      new BatchDeleteImageCommand({
        repositoryName,
        imageIds: normalizedImageIds,
      }),
    );

    return NextResponse.json({
      success: true,
      imageIds: normalizedImageIds,
      deleted: response.imageIds || [],
      failures: response.failures || [],
    });
  } catch (error: any) {
    console.error("ECR delete images error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete ECR images" },
      { status: 500 },
    );
  }
}
