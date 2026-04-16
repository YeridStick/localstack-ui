import { NextRequest, NextResponse } from "next/server";
import {
  createLocalEksCluster,
  listLocalEksClusters,
} from "@/lib/eks/local-eks";

export async function GET() {
  try {
    const clusters = await listLocalEksClusters();
    return NextResponse.json({ clusters });
  } catch (error: any) {
    console.error("EKS list clusters error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to list local EKS clusters" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cluster = await createLocalEksCluster({
      name: body?.name,
      kubernetesVersion: body?.kubernetesVersion,
      nodeImage: body?.nodeImage,
      minNodes: body?.minNodes,
      maxNodes: body?.maxNodes,
      desiredNodes: body?.desiredNodes,
      targetCpuUtilization: body?.targetCpuUtilization,
    });

    return NextResponse.json({ cluster });
  } catch (error: any) {
    console.error("EKS create cluster error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create local EKS cluster" },
      { status: 500 },
    );
  }
}

