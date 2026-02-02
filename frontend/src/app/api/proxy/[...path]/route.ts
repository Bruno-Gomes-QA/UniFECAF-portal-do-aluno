import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND_BASE_URL =
  process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://18.117.33.254:8000';

function safeJoinPath(parts: string[]) {
  if (parts.some((p) => p === '' || p === '.' || p === '..')) {
    throw new Error('Invalid proxy path.');
  }
  return parts.join('/');
}

function filterRequestHeaders(headers: Headers) {
  const filtered = new Headers();
  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === 'host' ||
      lower === 'connection' ||
      lower === 'content-length' ||
      lower === 'accept-encoding'
    ) {
      return;
    }
    filtered.set(key, value);
  });
  return filtered;
}

function filterResponseHeaders(headers: Headers) {
  const filtered = new Headers();
  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === 'connection' ||
      lower === 'content-length' ||
      lower === 'content-encoding' ||
      lower === 'transfer-encoding' ||
      lower === 'set-cookie'
    ) {
      return;
    }
    filtered.set(key, value);
  });
  return filtered;
}

async function proxy(request: NextRequest, pathParts: string[]) {
  const url = new URL(request.url);
  const joined = safeJoinPath(pathParts);
  const backendUrl = new URL(`${BACKEND_BASE_URL.replace(/\/$/, '')}/${joined}`);
  backendUrl.search = url.search;

  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.arrayBuffer();

  const backendResponse = await fetch(backendUrl, {
    method: request.method,
    headers: filterRequestHeaders(request.headers),
    body,
    redirect: 'manual',
  });

  const resHeaders = filterResponseHeaders(backendResponse.headers);
  const responseBody =
    backendResponse.status === 204 ? null : await backendResponse.arrayBuffer();
  const nextRes = new NextResponse(responseBody, {
    status: backendResponse.status,
    headers: resHeaders,
  });

  const getSetCookie = (backendResponse.headers as unknown as { getSetCookie?: () => string[] })
    .getSetCookie;
  const setCookies = getSetCookie ? getSetCookie.call(backendResponse.headers) : [];
  for (const cookie of setCookies) {
    nextRes.headers.append('set-cookie', cookie);
  }

  return nextRes;
}

export async function GET(request: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(request, ctx.params.path);
}
export async function POST(request: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(request, ctx.params.path);
}
export async function PUT(request: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(request, ctx.params.path);
}
export async function PATCH(request: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(request, ctx.params.path);
}
export async function DELETE(request: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(request, ctx.params.path);
}
