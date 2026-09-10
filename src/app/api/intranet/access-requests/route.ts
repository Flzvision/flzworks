import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIpFromHeaders } from "@/lib/intranet";
import { createOpaqueToken, hashOpaqueToken } from "@/lib/intranet-token";
import { sendAccessRequestEmail } from "@/lib/mailer";
import { AUTOPIAC_INTRANET_MODULE, ALLOWED_INTRANET_MODULES, type IntranetModule } from "@/lib/routes";
import { intranetAccessRequestSchema } from "@/lib/validation";

const REQUEST_TTL_MS = 1000 * 60 * 60 * 24;
// Personal data (name, email, IP) is kept 30 days past expiry, as promised on /privacy.
const RETENTION_AFTER_EXPIRY_MS = 1000 * 60 * 60 * 24 * 30;

async function deleteExpiredAccessRecords(now: Date) {
  const cutoff = new Date(now.getTime() - RETENTION_AFTER_EXPIRY_MS);
  await Promise.all([
    prisma.intranetAccessRequest.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
    prisma.intranetIpBlock.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
  ]);
}

function getAppBaseUrl(request: NextRequest) {
  return process.env.APP_BASE_URL || request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const parsed = intranetAccessRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid name and email." }, { status: 400 });
  }

  const requestModule = parsed.data.module || AUTOPIAC_INTRANET_MODULE;
  if (!ALLOWED_INTRANET_MODULES.includes(requestModule as IntranetModule)) {
    return NextResponse.json({ error: "Invalid module specified." }, { status: 400 });
  }

  await deleteExpiredAccessRecords(new Date());

  const ipAddress = getClientIpFromHeaders(request.headers);
  const activeBlock = await prisma.intranetIpBlock.findFirst({
    where: {
      ipAddress,
      expiresAt: { gt: new Date() },
    },
    select: { expiresAt: true },
  });

  if (activeBlock) {
    return NextResponse.json({ error: "Access from this IP is blocked." }, { status: 403 });
  }

  const oneHourAgo = new Date(Date.now() - 1000 * 60 * 60);
  const recentRequests = await prisma.intranetAccessRequest.count({
    where: {
      ipAddress,
      createdAt: { gt: oneHourAgo },
    },
  });

  if (recentRequests >= 5) {
    return NextResponse.json(
      { error: "Too many access requests from this IP. Please try again later." },
      { status: 429 },
    );
  }

  const approveToken = createOpaqueToken();
  const denyToken = createOpaqueToken();
  const claimToken = createOpaqueToken();
  const expiresAt = new Date(Date.now() + REQUEST_TTL_MS);

  await prisma.intranetAccessRequest.create({
    data: {
      module: requestModule,
      name: parsed.data.name,
      email: parsed.data.email,
      ipAddress,
      approveTokenHash: hashOpaqueToken(approveToken),
      denyTokenHash: hashOpaqueToken(denyToken),
      claimTokenHash: hashOpaqueToken(claimToken),
      expiresAt,
    },
  });

  const baseUrl = getAppBaseUrl(request);
  const approveUrl = `${baseUrl}/api/intranet/access-requests/approve?token=${approveToken}`;
  const approve30DaysUrl = `${baseUrl}/api/intranet/access-requests/approve?token=${approveToken}&duration=30`;
  const approve1YearUrl = `${baseUrl}/api/intranet/access-requests/approve?token=${approveToken}&duration=365`;
  const approvePermanentUrl = `${baseUrl}/api/intranet/access-requests/approve?token=${approveToken}&duration=3650`;
  const denyUrl = `${baseUrl}/api/intranet/access-requests/deny?token=${denyToken}`;

  let emailResult: { sent: boolean };

  try {
    emailResult = await sendAccessRequestEmail({
      name: parsed.data.name,
      email: parsed.data.email,
      ipAddress,
      approveUrl,
      approve30DaysUrl,
      approve1YearUrl,
      approvePermanentUrl,
      denyUrl,
    });
  } catch (error) {
    console.error("Intranet access request email failed.", error);
    return NextResponse.json(
      {
        error:
          "Access request was saved, but the approval email could not be sent. Check email delivery settings and try again.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    message: emailResult.sent
      ? "Request sent. The approval link will open the approved intranet module."
      : "Request stored. SMTP is not configured, so the approval links were logged in the server console.",
  });
}
