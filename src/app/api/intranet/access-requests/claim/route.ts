import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashOpaqueToken } from "@/lib/intranet-token";
import { intranetActionTokenSchema } from "@/lib/validation";
import { setIntranetAccessCookie } from "@/lib/intranet";
import {
  GUIDE_PROTOTYPE_BASE_PATH,
  TREE_PROTOTYPE_BASE_PATH,
  type IntranetModule,
} from "@/lib/routes";

function htmlResponse(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#030303;color:#fff;font-family:Arial,sans-serif}.card{max-width:560px;margin:24px;padding:28px;border:1px solid rgba(255,255,255,.16);border-radius:28px;background:rgba(255,255,255,.07);box-shadow:0 24px 80px rgba(0,0,0,.5);backdrop-filter:blur(24px)}p{color:#c7c7c7;line-height:1.6}a{color:#fff}</style></head><body><main class="card"><h1>${title}</h1><p>${body}</p></main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: NextRequest) {
  const parsed = intranetActionTokenSchema.safeParse({
    token: request.nextUrl.searchParams.get("token"),
  });

  if (!parsed.success) {
    return htmlResponse("Invalid access link", "The magic link is missing or invalid.", 400);
  }

  const tokenHash = hashOpaqueToken(parsed.data.token);
  const accessRequest = await prisma.intranetAccessRequest.findUnique({
    where: { claimTokenHash: tokenHash },
  });

  if (!accessRequest || accessRequest.status !== "APPROVED" || accessRequest.expiresAt < new Date()) {
    return htmlResponse("Access link expired", "This access link is expired or invalid. Please request access again.", 410);
  }

  const durationDays = accessRequest.grantedDurationDays || 0;
  const isLongTermAccess = durationDays > 0;

  if (accessRequest.accessedAt) {
    if (!isLongTermAccess) {
      return htmlResponse(
        "Link already used",
        "This access link has already been used. Please request access again if you need to log in from a new device.",
        410
      );
    }
  }

  let maxAgeSeconds: number;
  if (accessRequest.accessedAt) {
    // Re-claiming: calculate remaining time from the already established expiration date
    maxAgeSeconds = Math.max(0, Math.floor((accessRequest.expiresAt.getTime() - Date.now()) / 1000));
  } else {
    // First time claim: establish the full access duration
    maxAgeSeconds = isLongTermAccess ? durationDays * 24 * 60 * 60 : 60 * 60; // default 1 hour
  }

  // Update request record
  const updateData: { accessedAt: Date; expiresAt?: Date } = {
    accessedAt: new Date(),
  };
  if (!accessRequest.accessedAt) {
    updateData.expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);
  }

  const claimedRequest = await prisma.intranetAccessRequest.update({
    where: { id: accessRequest.id },
    data: updateData,
    select: { id: true },
  });

  const baseUrl = process.env.APP_BASE_URL || request.nextUrl.origin;
  
  const redirectPath =
    accessRequest.module === "tree_prototype" ? TREE_PROTOTYPE_BASE_PATH : GUIDE_PROTOTYPE_BASE_PATH;

  const response = NextResponse.redirect(new URL(redirectPath, baseUrl));
  setIntranetAccessCookie(response, claimedRequest.id, accessRequest.module as IntranetModule, maxAgeSeconds);
  return response;
}
