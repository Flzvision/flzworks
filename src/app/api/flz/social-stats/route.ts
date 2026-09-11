import { NextResponse } from "next/server";
import { getSocialMetricsSnapshot, type SocialMetric } from "@/lib/social-metrics";

export const dynamic = "force-dynamic";

// Public follower/post counters for the landing page. Provider APIs are rate
// limited (Instagram: ~200 calls/hour per account), so every visitor shares one
// snapshot per window instead of each page view hitting Meta and TikTok.
const REFRESH_MS = 5 * 60_000;

type PublicStat = Pick<SocialMetric, "platform" | "followers" | "posts" | "updatedAt"> & {
  live: boolean;
};

let cached: { at: number; stats: PublicStat[] } | null = null;
let inflight: Promise<PublicStat[]> | null = null;

async function loadStats(): Promise<PublicStat[]> {
  const snapshot = await getSocialMetricsSnapshot();
  // Only the counts leave the server; provider error messages stay in the studio.
  return snapshot.accounts
    .filter((account) => account.platform === "instagram" || account.platform === "tiktok")
    .map(({ platform, followers, posts, updatedAt, status }) => ({
      platform,
      followers,
      posts,
      updatedAt,
      live: status === "live",
    }));
}

export async function GET() {
  try {
    if (!cached || Date.now() - cached.at > REFRESH_MS) {
      inflight ??= loadStats().finally(() => {
        inflight = null;
      });
      cached = { at: Date.now(), stats: await inflight };
    }
    return NextResponse.json(
      { stats: cached.stats },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (error) {
    console.error("Failed to read public social stats:", error);
    return NextResponse.json({ stats: [] }, { status: 200 });
  }
}
