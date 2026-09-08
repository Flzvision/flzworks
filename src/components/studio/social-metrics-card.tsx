"use client";

import { useEffect, useState } from "react";
import type { SocialPlatform } from "@/lib/social-config";
import type { SocialMetricsSnapshot } from "@/lib/social-metrics";
import s from "@/components/studio/studio.module.css";

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
};

const PLATFORM_MARKS: Record<SocialPlatform, string> = {
  instagram: "IG",
  tiktok: "TT",
  linkedin: "in",
};

function formatMetric(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

export function SocialMetricsCard({
  initial,
  live = true,
}: {
  initial: SocialMetricsSnapshot;
  live?: boolean;
}) {
  const [snapshot, setSnapshot] = useState(initial);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;

    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/api/flz/social-metrics", { cache: "no-store" });
        if (!response.ok) throw new Error("Social metrics request failed");
        const body = await response.json() as { metrics?: SocialMetricsSnapshot };
        if (!cancelled && body.metrics) setSnapshot(body.metrics);
      } catch {
        // Keep the latest successful snapshot visible until the next refresh.
      }
    };

    void refresh();
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("flz-social-metrics-updated", refresh);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("flz-social-metrics-updated", refresh);
    };
  }, [live]);

  return (
    <section className={s.socialTracker} aria-label="Social followers and likes">
      <div className={s.socialTrackerTitle}>Social pulse</div>
      <div className={s.socialTrackerHead} aria-hidden="true">
        <span>Network</span>
        <span>Followers</span>
        <span>Likes</span>
      </div>
      <div className={s.socialTrackerRows}>
        {snapshot.accounts.map((account) => (
          <div
            className={s.socialTrackerRow}
            key={account.platform}
            title={account.error || (
              account.status === "disconnected"
                ? `${PLATFORM_LABELS[account.platform]} API is not connected`
                : account.status === "stale"
                  ? "Showing the last successful provider response"
                  : "Live provider data"
            )}
          >
            <span className={s.socialTrackerNetwork} title={PLATFORM_LABELS[account.platform]}>
              <span className={s.socialTrackerMark} aria-hidden="true">
                {PLATFORM_MARKS[account.platform]}
              </span>
              <span>{PLATFORM_LABELS[account.platform]}</span>
            </span>
            <span className={s.socialTrackerValue} aria-label={`${PLATFORM_LABELS[account.platform]} followers`}>
              {formatMetric(account.followers)}
            </span>
            <span className={s.socialTrackerValue} aria-label={`${PLATFORM_LABELS[account.platform]} likes`}>
              {formatMetric(account.likes)}
            </span>
          </div>
        ))}
      </div>
      <span className={s.srOnly} role="status" aria-live="polite">
        {snapshot.accounts.some((account) => account.status === "live")
          ? "Live social metrics updated"
          : snapshot.accounts.some((account) => account.status === "stale")
            ? "Showing previously fetched live social metrics"
            : "Social provider APIs are not connected"}
      </span>
    </section>
  );
}
