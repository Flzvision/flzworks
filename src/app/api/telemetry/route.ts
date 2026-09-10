import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { deleteExpiredTelemetry } from "@/lib/telemetry";

const payloadSchema = z.object({
  action: z.enum(["start", "heartbeat", "end", "event"]),
  sessionId: z.string().uuid(),
  site: z.enum(["main", "autosalon"]),
  path: z.string().startsWith("/").max(120),
  durationMs: z.number().int().min(0).max(24 * 60 * 60 * 1000).optional(),
  eventType: z.enum(["social_open", "vcard_view", "vcard_download"]).optional(),
  label: z.string().trim().min(1).max(64).optional(),
});

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

export async function POST(request: NextRequest) {
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid telemetry payload" }, { status: 400, headers: noStoreHeaders });
  }

  const payload = parsed.data;
  const now = new Date();
  const durationMs = payload.durationMs ?? 0;

  try {
    if (payload.action === "start") {
      // Enforce the published retention period even if nobody opens the Studio dashboard.
      void deleteExpiredTelemetry(now).catch((error) => console.error("Telemetry retention cleanup failed:", error));
      await prisma.telemetrySession.upsert({
        where: { id: payload.sessionId },
        create: {
          id: payload.sessionId,
          site: payload.site,
          path: payload.path,
          startedAt: now,
          lastSeenAt: now,
          durationMs,
        },
        update: {
          site: payload.site,
          path: payload.path,
          lastSeenAt: now,
          endedAt: null,
          durationMs,
        },
      });
    } else if (payload.action === "heartbeat" || payload.action === "end") {
      await prisma.telemetrySession.updateMany({
        where: { id: payload.sessionId, site: payload.site },
        data: {
          lastSeenAt: now,
          endedAt: payload.action === "end" ? now : null,
          durationMs,
        },
      });
    } else {
      if (!payload.eventType) {
        return Response.json({ error: "Event type is required" }, { status: 400, headers: noStoreHeaders });
      }

      const session = await prisma.telemetrySession.findFirst({
        where: { id: payload.sessionId, site: payload.site },
        select: { id: true },
      });
      if (!session) {
        return Response.json({ error: "Telemetry session not found" }, { status: 409, headers: noStoreHeaders });
      }

      const dedupeKey = payload.eventType === "vcard_view"
        ? `${payload.sessionId}:${payload.site}:${payload.eventType}`
        : null;

      try {
        await prisma.telemetryEvent.create({
          data: {
            sessionId: payload.sessionId,
            site: payload.site,
            type: payload.eventType,
            label: payload.label,
            dedupeKey,
            occurredAt: now,
          },
        });
      } catch (error) {
        const code = typeof error === "object" && error && "code" in error ? error.code : null;
        if (code !== "P2002") throw error;
      }
    }

    return new Response(null, { status: 204, headers: noStoreHeaders });
  } catch (error) {
    console.error("Failed to record telemetry:", error);
    return Response.json({ error: "Telemetry unavailable" }, { status: 500, headers: noStoreHeaders });
  }
}
