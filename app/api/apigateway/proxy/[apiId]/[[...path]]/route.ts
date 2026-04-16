import { NextRequest, NextResponse } from "next/server";
import { listLocalEksClusters } from "@/lib/eks/local-eks";

export const dynamic = "force-dynamic";

async function forwardToEksBackend(
  request: NextRequest,
  context: { params: Promise<{ apiId: string; path?: string[] }> },
) {
  const { apiId, path = [] } = await context.params;
  const clusters = await listLocalEksClusters();

  const cluster = clusters.find(
    (item) => item.apiGateway?.restApiId === apiId && item.apiGateway?.backendUrl,
  );
  if (!cluster?.apiGateway?.backendUrl) {
    return NextResponse.json(
      { error: `No backend mapping found for API id '${apiId}'` },
      { status: 404 },
    );
  }

  const targetUrl = new URL(cluster.apiGateway.backendUrl);
  targetUrl.pathname = `/${path.join("/")}`.replace(/\/+/g, "/");
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");
  if (contentType) headers.set("content-type", contentType);
  if (accept) headers.set("accept", accept);

  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const upstream = await fetch(targetUrl.toString(), {
    method,
    headers,
    body,
    redirect: "follow",
  });

  const responseBody = await upstream.arrayBuffer();
  const responseHeaders = new Headers();
  const upstreamContentType = upstream.headers.get("content-type");
  if (upstreamContentType) {
    responseHeaders.set("content-type", upstreamContentType);
  }

  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ apiId: string; path?: string[] }> },
) {
  return forwardToEksBackend(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ apiId: string; path?: string[] }> },
) {
  return forwardToEksBackend(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ apiId: string; path?: string[] }> },
) {
  return forwardToEksBackend(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ apiId: string; path?: string[] }> },
) {
  return forwardToEksBackend(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ apiId: string; path?: string[] }> },
) {
  return forwardToEksBackend(request, context);
}

