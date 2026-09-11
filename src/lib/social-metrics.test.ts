import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setting = vi.hoisted(() => ({ findUnique: vi.fn(), upsert: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { flzSetting: setting } }));

import {
  getSocialMetricsSnapshot,
  readCachedSocialMetrics,
} from "@/lib/social-metrics";

describe("live social pulse", () => {
  beforeEach(() => {
    setting.findUnique.mockReset();
    setting.upsert.mockReset();
    setting.findUnique.mockResolvedValue(null);
    setting.upsert.mockResolvedValue({});
    delete process.env.INSTAGRAM_ACCESS_TOKEN;
    delete process.env.INSTAGRAM_USER_ID;
    delete process.env.TIKTOK_ACCESS_TOKEN;
    delete process.env.TIKTOK_CLIENT_KEY;
    delete process.env.TIKTOK_CLIENT_SECRET;
    delete process.env.LINKEDIN_ACCESS_TOKEN;
    delete process.env.LINKEDIN_ORGANIZATION_ID;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports disconnected providers instead of treating manual values as live", async () => {
    const snapshot = await getSocialMetricsSnapshot();
    expect(snapshot.accounts.map((account) => account.platform)).toEqual([
      "instagram",
      "tiktok",
      "linkedin",
    ]);
    expect(snapshot.accounts.every((account) => account.status === "disconnected")).toBe(true);
    expect(snapshot.updatedAt).toBeNull();
    expect(setting.upsert).not.toHaveBeenCalled();
  });

  it("uses the versioned Instagram API and caches a successful live response", async () => {
    process.env.INSTAGRAM_ACCESS_TOKEN = "test-token";
    process.env.INSTAGRAM_USER_ID = "123";
    process.env.INSTAGRAM_API_VERSION = "v23.0";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ followers_count: 1200, media_count: 48 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [
        { like_count: 20 },
        { like_count: 30 },
      ] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await getSocialMetricsSnapshot();

    expect(fetchMock.mock.calls[0][0].toString()).toContain("graph.instagram.com/v23.0/123");
    expect(snapshot.accounts[0]).toMatchObject({
      platform: "instagram",
      followers: 1200,
      likes: 50,
      posts: 48,
      status: "live",
      error: null,
    });
    expect(setting.upsert).toHaveBeenCalledOnce();
    expect(setting.upsert.mock.calls[0][0].where.key).toBe("studio:social-metrics-live-cache");
  });

  it("labels the last successful provider response as stale after an API failure", async () => {
    process.env.INSTAGRAM_ACCESS_TOKEN = "expired-token";
    setting.findUnique.mockResolvedValue({
      value: JSON.stringify([{
        platform: "instagram",
        followers: 900,
        likes: 5000,
        status: "live",
        updatedAt: "2026-08-12T10:00:00.000Z",
        error: null,
      }]),
    });
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(
      new Response(JSON.stringify({ error: { message: "Token expired" } }), { status: 401 }),
    )));

    const snapshot = await getSocialMetricsSnapshot();
    expect(snapshot.accounts[0]).toMatchObject({
      followers: 900,
      likes: 5000,
      status: "stale",
      error: "Token expired",
    });
  });

  it("ignores the old manual social-metrics setting", async () => {
    setting.findUnique.mockResolvedValue(null);
    expect(await readCachedSocialMetrics()).toEqual([]);
    expect(setting.findUnique).toHaveBeenCalledWith({
      where: { key: "studio:social-metrics-live-cache" },
    });
  });
});
