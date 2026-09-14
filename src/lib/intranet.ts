import "server-only";

import { cookies, headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { type IntranetModule } from "@/lib/routes";
import {
  INTRANET_ACCESS_COOKIE,
  INTRANET_ACCESS_MAX_AGE_SECONDS,
  createIntranetAccessToken,
  verifyIntranetAccessToken,
} from "@/lib/intranet-token";

export type IntranetGateState =
  | { status: "allowed" }
  | { status: "blocked"; expiresAt: Date }
  | { status: "needs-request" };

export function getClientIpFromHeaders(headerSource: Headers) {
  const forwarded = headerSource.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    headerSource.get("cf-connecting-ip") ||
    headerSource.get("x-real-ip") ||
    forwarded ||
    "unknown"
  );
}

export async function hasValidIntranetCookie(cookieValue: string | undefined, module: IntranetModule) {
  const payload = verifyIntranetAccessToken(cookieValue);
  if (!payload || payload.module !== module) {
    return false;
  }

  const request = await prisma.intranetAccessRequest.findFirst({
    where: {
      id: payload.requestId,
      module,
      status: "APPROVED",
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });

  return Boolean(request);
}

export async function getIntranetGateState(
  module: IntranetModule,
): Promise<IntranetGateState> {
  if (process.env.NODE_ENV === "development") {
    return { status: "allowed" };
  }

  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const ipAddress = getClientIpFromHeaders(headerStore);

  if (await hasValidIntranetCookie(cookieStore.get(INTRANET_ACCESS_COOKIE)?.value, module)) {
    return { status: "allowed" };
  }

  const block = await prisma.intranetIpBlock.findFirst({
    where: {
      ipAddress,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: { expiresAt: true },
  });

  if (block) {
    return { status: "blocked", expiresAt: block.expiresAt };
  }

  return { status: "needs-request" };
}

export function setIntranetAccessCookie(
  response: NextResponse, 
  requestId: string, 
  module: IntranetModule,
  maxAgeSeconds: number = INTRANET_ACCESS_MAX_AGE_SECONDS
) {
  response.cookies.set(INTRANET_ACCESS_COOKIE, createIntranetAccessToken(requestId, module, maxAgeSeconds), {
    httpOnly: true,
    maxAge: maxAgeSeconds,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}


export async function requireIntranetApiAccess(
  request: NextRequest,
  module: IntranetModule,
) {
  const ipAddress = getClientIpFromHeaders(request.headers);

  const block = await prisma.intranetIpBlock.findFirst({
    where: {
      ipAddress,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });

  if (block) {
    return NextResponse.json({ error: "Intranet access is blocked for this IP." }, { status: 403 });
  }

  const allowed = await hasValidIntranetCookie(request.cookies.get(INTRANET_ACCESS_COOKIE)?.value, module);
  if (!allowed) {
    return NextResponse.json({ error: "Intranet access required." }, { status: 403 });
  }

  return null;
}
