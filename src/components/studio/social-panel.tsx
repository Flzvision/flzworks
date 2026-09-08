"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ExternalLink, ImageOff, Radio, RefreshCw, Save, Undo2, X } from "lucide-react";
import type { SocialEntry } from "@/lib/social-config";
import type { SocialMetricsSnapshot } from "@/lib/social-metrics";
import { Field, Panel, SectionHead, Spinner, type Notify } from "./ui";
import s from "./studio.module.css";

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
};

function isUrlish(value: string) {
  const v = value.trim();
  return v === "" || /^(https?:\/\/|\/)/i.test(v);
}

export function SocialPanel({
  initial,
  initialMetrics,
  importConfiguration,
  onProjectsChanged,
  notify,
}: {
  initial: SocialEntry[];
  initialMetrics: SocialMetricsSnapshot;
  importConfiguration: { instagram: boolean; tiktok: boolean };
  onProjectsChanged: () => Promise<void>;
  notify: Notify;
}) {
  const [saved, setSaved] = useState<SocialEntry[]>(initial);
  const [entries, setEntries] = useState<SocialEntry[]>(initial);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const update = (platform: string, patch: Partial<SocialEntry>) =>
    setEntries((prev) => prev.map((e) => (e.platform === platform ? { ...e, ...patch } : e)));

  const dirty = useMemo(() => JSON.stringify(entries) !== JSON.stringify(saved), [entries, saved]);
  const invalid = entries.some((e) => !isUrlish(e.postUrl) || !isUrlish(e.imageUrl));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/portfolio/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Could not save the links");
      setEntries(data.entries);
      setSaved(data.entries);
      notify("Social cards saved");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not save the links", "error");
    } finally {
      setSaving(false);
    }
  };

  const syncProjects = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/flz/social-projects/sync", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error || "Could not sync social projects");

      await onProjectsChanged();
      const providerErrors = Array.isArray(data.providers)
        ? data.providers.filter((provider: { error?: string }) => provider.error)
        : [];
      if (providerErrors.length) {
        notify(
          `Imported ${data.created ?? 0} new posts; ${providerErrors.map((p: { platform: string }) => p.platform).join(" and ")} needs attention.`,
          "error",
        );
      } else {
        notify(
          `Imported ${data.created ?? 0} new public posts. Existing Studio posts were preserved.`,
        );
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not sync social projects", "error");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <SectionHead
        eyebrow="flz.works · transmissions"
        title="Social"
        description="Each card shows one image and opens your latest post on that platform."
      />

      <div className={s.panelStack}>
        <Panel icon={<Radio size={16} />} title="How these cards work">
          <p className={s.panelNote}>
            Paste the link to the latest post and an image to show for it. Leave the Instagram image
            empty to fall back to the newest post from the connected Instagram feed, when a token is
            configured. Images can be a full <code>https://</code> address or a path served by this
            site, such as <code>/api/portfolio/media/…</code>.
          </p>
        </Panel>

        <Panel icon={<RefreshCw size={16} />} title="Post auto-import">
          <p className={s.panelNote}>
            Every public Instagram post and TikTok video becomes a post on the main board.
            Sync imports only posts that do not have a card yet. Existing Studio posts are never changed or hidden.
          </p>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
            <span className={s.navCount}>
              Instagram: {importConfiguration.instagram ? "connected" : "API token needed"}
            </span>
            <span className={s.navCount}>
              TikTok: {importConfiguration.tiktok ? "connected" : "Display API token needed"}
            </span>
            <span style={{ flex: 1 }} />
            <button
              type="button"
              className={`${s.btn} ${s.btnPrimary}`}
              disabled={syncing || (!importConfiguration.instagram && !importConfiguration.tiktok)}
              onClick={syncProjects}
            >
              {syncing ? <Spinner /> : <RefreshCw size={15} />} {syncing ? "Syncing…" : "Sync posts now"}
            </button>
          </div>
        </Panel>

        <Panel icon={<Radio size={16} />} title="Social pulse">
          <p className={s.panelNote}>
            Followers and likes come only from the official provider APIs. The sidebar refreshes
            every minute and keeps the last successful API response clearly marked as stale if a
            provider is temporarily unavailable.
          </p>
          <div className={s.panelStack} style={{ marginTop: 14 }}>
            {initialMetrics.accounts.map((account) => (
              <div className={s.saveBar} key={account.platform}>
                <strong>{PLATFORM_LABEL[account.platform]}</strong>
                <span className={s.saveBarText}>
                  {account.status === "live" && "Live API connected"}
                  {account.status === "stale" && "API unavailable - showing the last live response"}
                  {account.status === "error" && (account.error || "Provider API error")}
                  {account.status === "disconnected" && "Official API authorization required"}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <div className={s.socialGrid}>
          {entries.map((entry) => {
            const postOk = isUrlish(entry.postUrl);
            const imageOk = isUrlish(entry.imageUrl);
            return (
              <div key={entry.platform} className={s.socialCard}>
                <div className={s.socialHead}>
                  <span className={s.socialName}>
                    {PLATFORM_LABEL[entry.platform] ?? entry.platform}
                  </span>
                  {entry.postUrl.trim() && postOk && (
                    <a
                      className={s.iconBtn}
                      href={entry.postUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open the post"
                      title="Open the post"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>

                <div className={s.socialPreview}>
                  {entry.imageUrl.trim() && imageOk ? (
                    <>
                      <Image
                        src={entry.imageUrl.trim()}
                        alt=""
                        fill
                        sizes="320px"
                        className={s.socialImg}
                        unoptimized
                      />
                      <button
                        type="button"
                        className={s.iconBtn}
                        style={{ position: "absolute", top: 8, right: 8 }}
                        onClick={() => update(entry.platform, { imageUrl: "" })}
                        aria-label="Clear the image"
                        title="Clear the image"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <span className={s.socialEmpty}>
                      <ImageOff size={14} /> No image
                    </span>
                  )}
                </div>

                <div className={s.socialFields}>
                  <Field label="Label">
                    <input
                      className={s.input}
                      value={entry.label}
                      onChange={(e) => update(entry.platform, { label: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="Post link"
                    error={postOk ? "" : "Start with https:// or a leading slash."}
                  >
                    <input
                      className={`${s.input} ${s.inputMono} ${postOk ? "" : s.inputInvalid}`}
                      value={entry.postUrl}
                      placeholder="https://…"
                      onChange={(e) => update(entry.platform, { postUrl: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="Image"
                    error={imageOk ? "" : "Start with https:// or a leading slash."}
                  >
                    <input
                      className={`${s.input} ${s.inputMono} ${imageOk ? "" : s.inputInvalid}`}
                      value={entry.imageUrl}
                      placeholder="https://… or /api/portfolio/media/…"
                      onChange={(e) => update(entry.platform, { imageUrl: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            );
          })}
        </div>

        <div className={s.saveBar}>
          <span className={s.saveBarText}>
            {invalid ? (
              "Fix the highlighted links before saving."
            ) : dirty ? (
              <>
                <span className={s.dirtyDot} />
                Unsaved changes
              </>
            ) : (
              "Everything is saved."
            )}
          </span>
          {dirty && (
            <button
              type="button"
              className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
              onClick={() => setEntries(saved)}
            >
              <Undo2 size={14} /> Revert
            </button>
          )}
          <button
            type="button"
            className={`${s.btn} ${s.btnPrimary}`}
            disabled={saving || !dirty || invalid}
            onClick={save}
          >
            {saving ? <Spinner /> : <Save size={15} />} Save social cards
          </button>
        </div>
      </div>
    </>
  );
}
