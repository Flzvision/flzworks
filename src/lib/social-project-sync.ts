import "server-only";

import { prisma } from "@/lib/prisma";

export type SocialProvider = "instagram" | "tiktok";

export interface NormalizedSocialPost {
  platform: SocialProvider;
  postId: string;
  title: string;
  body: string | null;
  publishedAt: Date | null;
  linkUrl: string;
  imageUrl: string | null;
}

export interface SocialProviderResult {
  platform: SocialProvider;
  configured: boolean;
  fetched: number;
  created: number;
  updated: number;
  hidden: number;
  error?: string;
}

export interface SocialSyncResult {
  providers: SocialProviderResult[];
  fetched: number;
  created: number;
  updated: number;
  hidden: number;
}

type InstagramMedia = {
  id?: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp?: string;
};

type InstagramPage = {
  data?: InstagramMedia[];
  paging?: { next?: string };
  error?: { message?: string };
};

type TikTokVideo = {
  id?: string;
  title?: string;
  video_description?: string;
  cover_image_url?: string;
  share_url?: string;
  embed_link?: string;
  create_time?: number;
};

type TikTokPage = {
  data?: { videos?: TikTokVideo[]; cursor?: number; has_more?: boolean };
  error?: { code?: string; message?: string };
};

function clip(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function postTitle(text: string | undefined, fallback: string): string {
  const firstLine = text
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return clip(firstLine || fallback, 100);
}

export function selectUnseenSocialPosts(
  posts: NormalizedSocialPost[],
  existingPostIds: Iterable<string>,
): NormalizedSocialPost[] {
  const existing = new Set(existingPostIds);
  return posts.filter((post) => !existing.has(post.postId));
}

export function normalizeInstagramPost(item: InstagramMedia): NormalizedSocialPost | null {
  if (!item.id || !item.permalink) return null;
  const body = item.caption ? clip(item.caption, 2000) : null;
  const imageUrl = item.media_type === "VIDEO"
    ? item.thumbnail_url || item.media_url || null
    : item.media_url || item.thumbnail_url || null;

  return {
    platform: "instagram",
    postId: item.id,
    title: postTitle(item.caption, "Instagram post"),
    body,
    publishedAt: item.timestamp ? new Date(item.timestamp) : null,
    linkUrl: item.permalink,
    imageUrl,
  };
}

export function normalizeTikTokPost(item: TikTokVideo): NormalizedSocialPost | null {
  if (!item.id) return null;
  const description = item.video_description || item.title || "";
  const linkUrl = item.share_url || item.embed_link;
  if (!linkUrl) return null;

  return {
    platform: "tiktok",
    postId: item.id,
    title: postTitle(description, "TikTok video"),
    body: description ? clip(description, 2000) : null,
    publishedAt: typeof item.create_time === "number" ? new Date(item.create_time * 1000) : null,
    linkUrl,
    imageUrl: item.cover_image_url || null,
  };
}

async function fetchInstagramPosts(): Promise<NormalizedSocialPost[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  const userId = process.env.INSTAGRAM_USER_ID?.trim() || "me";
  if (!token) return [];

  const version = process.env.INSTAGRAM_API_VERSION?.trim() || "v23.0";
  const fields = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp";
  const first = new URL(`https://graph.instagram.com/${version}/${encodeURIComponent(userId)}/media`);
  first.searchParams.set("fields", fields);
  first.searchParams.set("limit", "100");
  first.searchParams.set("access_token", token);

  const posts: NormalizedSocialPost[] = [];
  let next: string | undefined = first.toString();
  let pages = 0;

  while (next && pages < 100) {
    const response = await fetch(next, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    const payload = (await response.json().catch(() => ({}))) as InstagramPage;
    if (!response.ok || payload.error) {
      throw new Error(payload.error?.message || `Instagram API returned ${response.status}`);
    }

    for (const item of payload.data ?? []) {
      const normalized = normalizeInstagramPost(item);
      if (normalized) posts.push(normalized);
    }
    next = payload.paging?.next;
    pages += 1;
  }

  return posts;
}

export async function getTikTokAccessToken(): Promise<string | null> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim();
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim();
  const storedRefresh = await prisma.flzSetting.findUnique({
    where: { key: "social_tiktok_refresh_token" },
  }).catch(() => null);
  const refreshToken = storedRefresh?.value || process.env.TIKTOK_REFRESH_TOKEN?.trim();

  if (!clientKey || !clientSecret || !refreshToken) {
    return process.env.TIKTOK_ACCESS_TOKEN?.trim() || null;
  }

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || `TikTok token refresh returned ${response.status}`);
  }

  if (payload.refresh_token) {
    await prisma.flzSetting.upsert({
      where: { key: "social_tiktok_refresh_token" },
      create: { key: "social_tiktok_refresh_token", value: payload.refresh_token },
      update: { value: payload.refresh_token },
    });
  }
  return payload.access_token;
}

async function fetchTikTokPosts(): Promise<NormalizedSocialPost[]> {
  const token = await getTikTokAccessToken();
  if (!token) return [];

  const fields = "id,title,video_description,cover_image_url,share_url,embed_link,create_time";
  const url = new URL("https://open.tiktokapis.com/v2/video/list/");
  url.searchParams.set("fields", fields);

  const posts: NormalizedSocialPost[] = [];
  let cursor: number | undefined;
  let pages = 0;

  do {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ max_count: 20, ...(cursor === undefined ? {} : { cursor }) }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const payload = (await response.json().catch(() => ({}))) as TikTokPage;
    if (!response.ok || (payload.error?.code && payload.error.code !== "ok")) {
      throw new Error(payload.error?.message || payload.error?.code || `TikTok API returned ${response.status}`);
    }

    for (const item of payload.data?.videos ?? []) {
      const normalized = normalizeTikTokPost(item);
      if (normalized) posts.push(normalized);
    }
    cursor = payload.data?.cursor;
    pages += 1;
    if (!payload.data?.has_more) break;
  } while (cursor !== undefined && pages < 100);

  return posts;
}

export async function persistPosts(platform: SocialProvider, posts: NormalizedSocialPost[]) {
  const publicPostIds = posts.map((post) => post.postId);
  const tombstonePrefix = `social-project-tombstone:${platform}:`;
  const existing = await prisma.flzProject.findMany({
    where: { socialPlatform: platform, socialPostId: { in: publicPostIds } },
    select: { socialPostId: true },
  });
  const tombstones = await prisma.flzSetting.findMany({
    where: { key: { startsWith: tombstonePrefix } },
    select: { key: true },
  });
  const existingIds = existing
    .map((row) => row.socialPostId)
    .filter((postId): postId is string => Boolean(postId));
  const tombstonedIds = tombstones.map((row) =>
    decodeURIComponent(row.key.slice(tombstonePrefix.length)),
  );
  const unseenPosts = selectUnseenSocialPosts(posts, [...existingIds, ...tombstonedIds]);

  let created = 0;
  for (const post of unseenPosts) {
    try {
      await prisma.flzProject.create({
        data: {
          title: post.title,
          tools: post.platform === "instagram" ? "Instagram" : "TikTok",
          category: "Social",
          publishedAt: post.publishedAt,
          body: post.body,
          gradient: post.platform === "instagram"
            ? "linear-gradient(145deg,#833ab4,#fd1d1d 55%,#fcb045)"
            : "linear-gradient(145deg,#25f4ee,#111 45%,#fe2c55)",
          visible: true,
          featured: false,
          sortOrder: -1,
          linkUrl: post.linkUrl,
          imageUrl: post.imageUrl,
          socialPlatform: post.platform,
          socialPostId: post.postId,
        },
      });
      created += 1;
    } catch (error) {
      // Concurrent syncs can race on the provider identity. The winner's row is
      // already present, so preserving it is the only safe response.
      if (!(typeof error === "object" && error !== null && "code" in error && error.code === "P2002")) {
        throw error;
      }
    }
  }

  // Existing projects are Studio-owned. Sync never edits, unhides, hides, or
  // deletes them, even when provider content changes or disappears.
  return { created, updated: 0, hidden: 0 };
}

export function getSocialImportConfiguration() {
  return {
    instagram: Boolean(process.env.INSTAGRAM_ACCESS_TOKEN?.trim()),
    tiktok: Boolean(
      process.env.TIKTOK_ACCESS_TOKEN?.trim() ||
      (process.env.TIKTOK_CLIENT_KEY?.trim() &&
        process.env.TIKTOK_CLIENT_SECRET?.trim() &&
        process.env.TIKTOK_REFRESH_TOKEN?.trim()),
    ),
  };
}

export async function syncSocialProjects(): Promise<SocialSyncResult> {
  const configuration = getSocialImportConfiguration();
  const providers: SocialProviderResult[] = [];

  for (const [platform, configured, loader] of [
    ["instagram", configuration.instagram, fetchInstagramPosts],
    ["tiktok", configuration.tiktok, fetchTikTokPosts],
  ] as const) {
    if (!configured) {
      providers.push({ platform, configured: false, fetched: 0, created: 0, updated: 0, hidden: 0 });
      continue;
    }

    try {
      const posts = await loader();
      const saved = await persistPosts(platform, posts);
      providers.push({ platform, configured: true, fetched: posts.length, ...saved });
    } catch (error) {
      console.error(`${platform} project sync failed:`, error);
      providers.push({
        platform,
        configured: true,
        fetched: 0,
        created: 0,
        updated: 0,
        hidden: 0,
        error: error instanceof Error ? error.message : "Unknown provider error",
      });
    }
  }

  return {
    providers,
    fetched: providers.reduce((sum, item) => sum + item.fetched, 0),
    created: providers.reduce((sum, item) => sum + item.created, 0),
    updated: providers.reduce((sum, item) => sum + item.updated, 0),
    hidden: providers.reduce((sum, item) => sum + item.hidden, 0),
  };
}
