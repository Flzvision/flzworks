import "server-only";

import type { SocialPlatform } from "@/lib/social-config";
import { prisma } from "@/lib/prisma";
import { getTikTokAccessToken } from "@/lib/social-project-sync";

export type SocialMetricStatus = "live" | "stale" | "disconnected" | "error";

export interface SocialMetric {
  platform: SocialPlatform;
  followers: number | null;
  likes: number | null;
  posts: number | null;
  status: SocialMetricStatus;
  updatedAt: string | null;
  error: string | null;
}

export interface SocialMetricsSnapshot {
  accounts: SocialMetric[];
  updatedAt: string | null;
}

const PLATFORMS: SocialPlatform[] = ["instagram", "tiktok", "linkedin"];
const SOCIAL_METRICS_CACHE_KEY = "studio:social-metrics-live-cache";

function disconnected(platform: SocialPlatform): SocialMetric {
  return {
    platform,
    followers: null,
    likes: null,
    posts: null,
    status: "disconnected",
    updatedAt: null,
    error: null,
  };
}

function failed(platform: SocialPlatform, error: unknown): SocialMetric {
  return {
    platform,
    followers: null,
    likes: null,
    posts: null,
    status: "error",
    updatedAt: null,
    error: error instanceof Error ? error.message : "Provider request failed",
  };
}

export function emptySocialMetricsSnapshot(): SocialMetricsSnapshot {
  return { accounts: PLATFORMS.map(disconnected), updatedAt: null };
}

function numeric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function fetchJson(url: URL, headers?: HeadersInit): Promise<unknown> {
  const response = await fetch(url, {
    cache: "no-store",
    headers,
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await response.json().catch(() => null) as {
    error?: { message?: string } | string;
    message?: string;
  } | null;
  if (!response.ok) {
    const providerMessage = typeof payload?.error === "string"
      ? payload.error
      : payload?.error?.message || payload?.message;
    throw new Error(providerMessage || `Provider API returned ${response.status}`);
  }
  return payload;
}

async function instagramMetrics(): Promise<SocialMetric> {
  const platform = "instagram" as const;
  const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  const userId = process.env.INSTAGRAM_USER_ID?.trim() || "me";
  const version = process.env.INSTAGRAM_API_VERSION?.trim() || "v23.0";
  if (!token) return disconnected(platform);

  const profileUrl = new URL(
    `https://graph.instagram.com/${version}/${encodeURIComponent(userId)}`,
  );
  profileUrl.searchParams.set("fields", "followers_count,media_count");
  profileUrl.searchParams.set("access_token", token);

  const mediaUrl = new URL(
    `https://graph.instagram.com/${version}/${encodeURIComponent(userId)}/media`,
  );
  mediaUrl.searchParams.set("fields", "like_count");
  mediaUrl.searchParams.set("limit", "100");
  mediaUrl.searchParams.set("access_token", token);

  try {
    const [profile, media] = await Promise.all([
      fetchJson(profileUrl) as Promise<{ followers_count?: number; media_count?: number }>,
      fetchJson(mediaUrl) as Promise<{ data?: Array<{ like_count?: number }> }>,
    ]);
    const followers = numeric(profile.followers_count);
    const posts = numeric(profile.media_count);
    const likes = Array.isArray(media.data)
      ? media.data.reduce((sum, item) => sum + (numeric(item.like_count) ?? 0), 0)
      : null;
    if (followers === null && likes === null) {
      throw new Error("Instagram did not return follower or like metrics");
    }
    return {
      platform,
      followers,
      likes,
      posts,
      status: "live",
      updatedAt: new Date().toISOString(),
      error: null,
    };
  } catch (error) {
    console.warn("Instagram metrics fetch failed.", error);
    return failed(platform, error);
  }
}

async function tiktokMetrics(): Promise<SocialMetric> {
  const platform = "tiktok" as const;
  const canUseStaticToken = Boolean(process.env.TIKTOK_ACCESS_TOKEN?.trim());
  const canRefreshToken = Boolean(
    process.env.TIKTOK_CLIENT_KEY?.trim() && process.env.TIKTOK_CLIENT_SECRET?.trim(),
  );
  if (!canUseStaticToken && !canRefreshToken) return disconnected(platform);

  try {
    const token = await getTikTokAccessToken();
    if (!token) throw new Error("TikTok authorization is incomplete");
    const url = new URL("https://open.tiktokapis.com/v2/user/info/");
    url.searchParams.set("fields", "follower_count,likes_count,video_count");
    const payload = await fetchJson(url, { Authorization: `Bearer ${token}` }) as {
      data?: { user?: { follower_count?: number; likes_count?: number; video_count?: number } };
    };
    const followers = numeric(payload.data?.user?.follower_count);
    const likes = numeric(payload.data?.user?.likes_count);
    const posts = numeric(payload.data?.user?.video_count);
    if (followers === null && likes === null) {
      throw new Error("TikTok did not return stats; the user.info.stats scope is required");
    }
    return {
      platform,
      followers,
      likes,
      posts,
      status: "live",
      updatedAt: new Date().toISOString(),
      error: null,
    };
  } catch (error) {
    console.warn("TikTok metrics fetch failed.", error);
    return failed(platform, error);
  }
}

async function linkedinMetrics(): Promise<SocialMetric> {
  const platform = "linkedin" as const;
  const token = process.env.LINKEDIN_ACCESS_TOKEN?.trim();
  const organizationId = process.env.LINKEDIN_ORGANIZATION_ID?.trim();
  if (!token || !organizationId) return disconnected(platform);

  const urn = `urn:li:organization:${organizationId}`;
  const version = process.env.LINKEDIN_API_VERSION?.trim() || "202606";
  const headers = {
    Authorization: `Bearer ${token}`,
    "LinkedIn-Version": version,
    "X-Restli-Protocol-Version": "2.0.0",
  };

  const followersUrl = new URL(`https://api.linkedin.com/rest/networkSizes/${urn}`);
  followersUrl.searchParams.set("edgeType", "COMPANY_FOLLOWED_BY_MEMBER");
  const likesUrl = new URL("https://api.linkedin.com/rest/organizationalEntityShareStatistics");
  likesUrl.searchParams.set("q", "organizationalEntity");
  likesUrl.searchParams.set("organizationalEntity", urn);

  try {
    const [followersPayload, likesPayload] = await Promise.all([
      fetchJson(followersUrl, headers) as Promise<{ firstDegreeSize?: number }>,
      fetchJson(likesUrl, headers) as Promise<{
        elements?: Array<{ totalShareStatistics?: { likeCount?: number } }>;
      }>,
    ]);
    const followers = numeric(followersPayload.firstDegreeSize);
    const likes = numeric(likesPayload.elements?.[0]?.totalShareStatistics?.likeCount);
    const posts = null;
    if (followers === null && likes === null) {
      throw new Error("LinkedIn did not return organization metrics");
    }
    return {
      platform,
      followers,
      likes,
      posts,
      status: "live",
      updatedAt: new Date().toISOString(),
      error: null,
    };
  } catch (error) {
    console.warn("LinkedIn metrics fetch failed.", error);
    return failed(platform, error);
  }
}

export async function readCachedSocialMetrics(): Promise<SocialMetric[]> {
  try {
    const setting = await prisma.flzSetting.findUnique({
      where: { key: SOCIAL_METRICS_CACHE_KEY },
    });
    const parsed = setting ? JSON.parse(setting.value) as Partial<SocialMetric>[] : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!PLATFORMS.includes(item.platform as SocialPlatform)) return [];
      const followers = numeric(item.followers);
      const likes = numeric(item.likes);
      if (followers === null && likes === null || typeof item.updatedAt !== "string") return [];
      return [{
        platform: item.platform as SocialPlatform,
        followers,
        likes,
        posts: numeric(item.posts),
        status: "stale" as const,
        updatedAt: item.updatedAt,
        error: null,
      }];
    });
  } catch {
    return [];
  }
}

async function writeLiveCache(accounts: SocialMetric[]): Promise<void> {
  const live = accounts.filter((account) => account.status === "live");
  if (!live.length) return;
  const existing = await readCachedSocialMetrics();
  const merged = PLATFORMS.flatMap((platform) => {
    const current = live.find((account) => account.platform === platform);
    const cached = existing.find((account) => account.platform === platform);
    return current ? [current] : cached ? [cached] : [];
  });
  await prisma.flzSetting.upsert({
    where: { key: SOCIAL_METRICS_CACHE_KEY },
    create: { key: SOCIAL_METRICS_CACHE_KEY, value: JSON.stringify(merged) },
    update: { value: JSON.stringify(merged) },
  });
}

export async function getSocialMetricsSnapshot(): Promise<SocialMetricsSnapshot> {
  const [liveAccounts, cached] = await Promise.all([
    Promise.all([instagramMetrics(), tiktokMetrics(), linkedinMetrics()]),
    readCachedSocialMetrics(),
  ]);
  const accounts = liveAccounts.map((account) => {
    if (account.status === "live" || account.status === "disconnected") return account;
    const lastGood = cached.find((item) => item.platform === account.platform);
    return lastGood ? { ...lastGood, error: account.error } : account;
  });
  await writeLiveCache(accounts).catch((error) => {
    console.warn("Could not cache live social metrics.", error);
  });
  const updatedAt = accounts
    .map((account) => account.updatedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
  return { accounts, updatedAt };
}
