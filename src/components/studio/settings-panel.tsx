"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Gauge, Link2, Save, Sparkles, Undo2 } from "lucide-react";
import { Field, Panel, SectionHead, Spinner, type Notify } from "./ui";
import s from "./studio.module.css";

const DEFAULT_START = "2023-09-01";

const HERO_SUBHEAD_PLACEHOLDER =
  "I'm Bence. I model, rig and code the whole thing myself, out of Budapest. Everything below is in progress and gets posted as it happens.";

const KEYS = [
  "hero_headline",
  "hero_subhead",
  "building_start_date",
  "followers_count",
  "wishlists_count",
  "discord_url",
] as const;

type SettingsMap = Record<string, string>;

function normalize(settings: SettingsMap): SettingsMap {
  const out: SettingsMap = {};
  for (const key of KEYS) out[key] = settings[key] ?? "";
  if (!out.building_start_date) out.building_start_date = DEFAULT_START;
  return out;
}

export function SettingsPanel({
  initialSettings,
  notify,
}: {
  initialSettings: SettingsMap;
  notify: Notify;
}) {
  const [saved, setSaved] = useState<SettingsMap>(() => normalize(initialSettings));
  const [form, setForm] = useState<SettingsMap>(() => normalize(initialSettings));
  const [saving, setSaving] = useState(false);

  const [now] = useState(() => Date.now());

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const dirty = useMemo(
    () => KEYS.some((key) => (form[key] ?? "") !== (saved[key] ?? "")),
    [form, saved],
  );

  // UTC epoch math on both sides: the count the studio previews is the count
  // the landing page renders, and server and client markup cannot disagree.
  const days = useMemo(() => {
    const start = Date.parse(`${form.building_start_date || DEFAULT_START}T00:00:00Z`);
    if (Number.isNaN(start)) return null;
    return Math.max(0, Math.floor((now - start) / 86_400_000));
  }, [now, form.building_start_date]);

  const discordValid = /^https?:\/\//i.test(form.discord_url.trim());

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/flz/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Could not save the settings");
      const confirmed = normalize({ ...form, ...data.settings });
      setForm(confirmed);
      setSaved(confirmed);
      notify("Site settings saved");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not save the settings", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionHead
        eyebrow="flz.works · landing page"
        title="Site & hero"
        description="The headline, the counters and the Discord link on the landing page. Changes go live as soon as you save."
      />

      <div className={s.panelStack}>
        <Panel icon={<Sparkles size={16} />} title="Hero">
          <Field label="Headline" hint="Line breaks are kept exactly as you type them.">
            <textarea
              className={s.textarea}
              rows={3}
              maxLength={2000}
              value={form.hero_headline}
              placeholder={"Games and 3D,\nbuilt in public."}
              onChange={(e) => set("hero_headline", e.target.value)}
            />
          </Field>

          <Field
            label="Sub-line"
            hint="The sentence under the headline. Say what you are actually doing right now — it is the first thing a visitor reads after the title."
          >
            <textarea
              className={s.textarea}
              rows={3}
              maxLength={2000}
              value={form.hero_subhead}
              placeholder={HERO_SUBHEAD_PLACEHOLDER}
              onChange={(e) => set("hero_subhead", e.target.value)}
            />
          </Field>

          <div className={s.preview}>
            <div className={s.previewLabel}>Preview</div>
            <h3 className={s.previewHeadline}>
              {form.hero_headline.trim() || "Games and 3D,\nbuilt in public."}
            </h3>
            <p className={s.previewSubhead}>
              {form.hero_subhead.trim() || HERO_SUBHEAD_PLACEHOLDER}
            </p>
            <div className={s.previewStats}>
              <div className={s.previewStat}>
                <div className={s.previewStatLabel}>Building since</div>
                <div className={s.previewStatValue}>
                  {days ?? "—"}
                  <small>days</small>
                </div>
              </div>
              {/* Empty counters are hidden on the live page rather than shown
                  reading "soon", so the preview hides them too. */}
              {form.followers_count.trim() && (
                <div className={s.previewStat}>
                  <div className={s.previewStatLabel}>Followers</div>
                  <div className={s.previewStatValue}>{form.followers_count}</div>
                </div>
              )}
              {form.wishlists_count.trim() && (
                <div className={s.previewStat}>
                  <div className={s.previewStatLabel}>Wishlists</div>
                  <div className={s.previewStatValue}>{form.wishlists_count}</div>
                </div>
              )}
            </div>
          </div>
        </Panel>

        <Panel icon={<Gauge size={16} />} title="Counters">
          <div className={s.grid3}>
            <Field
              label="Building since"
              hint={days === null ? "Start date of the build log." : `Reads as ${days} days today.`}
            >
              <input
                type="date"
                className={`${s.input} ${s.inputMono}`}
                value={form.building_start_date}
                onChange={(e) => set("building_start_date", e.target.value)}
              />
            </Field>
            <Field label="Followers" hint="Free text — “1.2k”, “840”. Leave empty to hide the tile.">
              <input
                className={s.input}
                value={form.followers_count}
                placeholder="Leave empty to hide"
                onChange={(e) => set("followers_count", e.target.value)}
              />
            </Field>
            <Field label="Wishlists" hint="Shown as typed. Leave empty to hide the tile.">
              <input
                className={s.input}
                value={form.wishlists_count}
                placeholder="Leave empty to hide"
                onChange={(e) => set("wishlists_count", e.target.value)}
              />
            </Field>
          </div>
        </Panel>

        <Panel
          icon={<Link2 size={16} />}
          title="Links"
          right={
            discordValid && (
              <a
                className={`${s.btn} ${s.btnSm}`}
                href={form.discord_url.trim()}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open <ExternalLink size={13} />
              </a>
            )
          }
        >
          <Field
            label="Discord invite"
            hint="Used by the Discord card in the right-hand column."
            error={
              form.discord_url.trim() && !discordValid
                ? "Include the full address, starting with https://"
                : ""
            }
          >
            <input
              className={`${s.input} ${s.inputMono} ${
                form.discord_url.trim() && !discordValid ? s.inputInvalid : ""
              }`}
              value={form.discord_url}
              placeholder="https://discord.gg/…"
              onChange={(e) => set("discord_url", e.target.value)}
            />
          </Field>
        </Panel>

        <div className={s.saveBar}>
          <span className={s.saveBarText}>
            {dirty ? (
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
              onClick={() => setForm(saved)}
            >
              <Undo2 size={14} /> Revert
            </button>
          )}
          <button
            type="button"
            className={`${s.btn} ${s.btnPrimary}`}
            disabled={saving || !dirty}
            onClick={save}
          >
            {saving ? <Spinner /> : <Save size={15} />} Save settings
          </button>
        </div>
      </div>
    </>
  );
}
