"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Eye,
  EyeOff,
  LayoutDashboard,
  MousePointerClick,
  Save,
  Star,
} from "lucide-react";
import type { EditableKind, EditableSection } from "@/lib/studio/edit-protocol";
import { EDITABLE_PAGES, EDITABLE_PAGE_GROUPS } from "@/lib/studio/editable-pages";
import type { PortfolioArticleWithImages } from "@/lib/portfolio-sync";
import type { FlzProjectData } from "@/components/studio/types";
import { Field, Spinner, Switch, type Notify } from "@/components/studio/ui";
import s from "@/components/studio/studio.module.css";

/**
 * What each kind is called in the rail. The data model's own words — setting,
 * project, article — are not what someone editing the page is thinking about.
 */
const GROUP_LABELS: Record<EditableKind, string> = {
  setting: "Page text",
  project: "Posts",
  article: "Articles",
  social: "Social",
};

/** Groups appear in this order regardless of where they sit on the page. */
const GROUP_ORDER: EditableKind[] = ["setting", "project", "article", "social"];

/** Per-key presentation for the settings the landing page exposes. */
const SETTING_META: Record<string, { label: string; hint?: string; multiline?: boolean }> = {
  hero_headline: { label: "Headline", hint: "Line breaks are kept exactly as typed.", multiline: true },
  hero_subhead: { label: "Sub-line", hint: "Leave empty to hide it.", multiline: true },
  projects_heading: { label: "Projects heading", hint: "Defaults to “Featured”." },
  followers_count: { label: "Followers" },
  wishlists_count: { label: "Wishlists" },
  building_start_date: { label: "Building since", hint: "YYYY-MM-DD." },
  discord_url: { label: "Discord URL" },
};

interface EditorRailProps {
  path: string;
  onNavigate: (path: string) => void;
  sections: EditableSection[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onOpenDashboard: () => void;
  ready: boolean;
  settings: Record<string, string>;
  onSettingsChange: (settings: Record<string, string>) => void;
  projects: FlzProjectData[];
  onProjectsChange: (projects: FlzProjectData[]) => void;
  articles: PortfolioArticleWithImages[];
  userEmail: string;
  notify: Notify;
  onSaved: () => void;
}

export function EditorRail({
  path,
  onNavigate,
  sections,
  selected,
  onSelect,
  editing,
  onEditingChange,
  onOpenDashboard,
  ready,
  settings,
  onSettingsChange,
  projects,
  onProjectsChange,
  articles,
  userEmail,
  notify,
  onSaved,
}: EditorRailProps) {
  const active = useMemo(
    () => sections.find((section) => section.id === selected) ?? null,
    [sections, selected],
  );

  const groups = useMemo(() => {
    const byKind = new Map<EditableKind, EditableSection[]>();
    for (const section of sections) {
      const existing = byKind.get(section.kind);
      if (existing) existing.push(section);
      else byKind.set(section.kind, [section]);
    }
    // Sections arrive in document order, so each group keeps the page's order.
    return GROUP_ORDER.flatMap((kind) => {
      const items = byKind.get(kind);
      return items ? [{ kind, label: GROUP_LABELS[kind], items }] : [];
    });
  }, [sections]);

  return (
    <aside className={s.rail} aria-label="Editor">
      <header className={s.railHead}>
        <Link href="/" className={s.railBrand}>
          Flz<span>.</span>studio
        </Link>
        <button
          type="button"
          className={s.railDashBtn}
          onClick={onOpenDashboard}
          title="Open the dashboard"
        >
          <LayoutDashboard size={14} />
          Dashboard
        </button>
      </header>

      <div className={s.railBlock}>
        <label className={s.railLabel} htmlFor="flz-page-picker">
          Page
        </label>
        <select
          id="flz-page-picker"
          className={s.railSelect}
          value={path}
          onChange={(event) => onNavigate(event.target.value)}
        >
          {EDITABLE_PAGE_GROUPS.map((group) => (
            <optgroup key={group} label={group}>
              {EDITABLE_PAGES.filter((page) => page.group === group).map((page) => (
                <option key={page.path} value={page.path}>
                  {page.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <Switch
          checked={editing}
          onChange={onEditingChange}
          label="Edit mode"
          hint="While on, the page below does not respond to its own clicks."
        />
      </div>

      <div className={s.railSections}>
        {!ready && <p className={s.railNote}>Connecting to the page…</p>}

        {ready && sections.length === 0 && (
          <p className={s.railNote}>
            Nothing on this page is marked editable yet.
          </p>
        )}

        <div className={s.railGroups}>
          {groups.map((group) => (
            <div key={group.kind} className={s.railGroup}>
              <div className={s.railLabel}>
                {group.label}
                {group.items.length > 1 && (
                  <span className={s.railCount}>{group.items.length}</span>
                )}
              </div>
              <ul className={s.railList}>
                {group.items.map((section) => (
                  <li key={section.id}>
                    <button
                      type="button"
                      className={`${s.railItem} ${section.id === selected ? s.railItemActive : ""}`}
                      onClick={() => onSelect(section.id === selected ? null : section.id)}
                    >
                      <span className={s.railItemMark} aria-hidden="true" />
                      <span className={s.railItemLabel}>{section.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className={s.railInspector}>
        {!active && (
          <p className={s.railNote}>
            <MousePointerClick size={13} /> Pick a region in the page or the list
            to edit it.
          </p>
        )}

        {active?.kind === "setting" && (
          <SettingInspector
            key={active.id}
            settingKey={active.ref}
            settings={settings}
            onSettingsChange={onSettingsChange}
            notify={notify}
            onSaved={onSaved}
          />
        )}

        {active?.kind === "project" && (
          <ProjectInspector
            key={active.id}
            projectId={active.ref}
            projects={projects}
            onProjectsChange={onProjectsChange}
            notify={notify}
            onSaved={onSaved}
          />
        )}

        {active?.kind === "article" && (
          <ArticleInspector
            key={active.id}
            articleRef={active.ref}
            articles={articles}
            notify={notify}
            onSaved={onSaved}
          />
        )}

        {active?.kind === "social" && (
          <p className={s.railNote}>
            Social links are managed together — open the dashboard to edit them.
          </p>
        )}
      </div>

      <footer className={s.railFoot}>
        <span className={s.railUser} title={userEmail}>
          {userEmail}
        </span>
        <Link href={path} target="_blank" rel="noopener noreferrer" className={s.railOpen}>
          Open live <ExternalLink size={12} />
        </Link>
      </footer>
    </aside>
  );
}

function SettingInspector({
  settingKey,
  settings,
  onSettingsChange,
  notify,
  onSaved,
}: {
  settingKey: string;
  settings: Record<string, string>;
  onSettingsChange: (settings: Record<string, string>) => void;
  notify: Notify;
  onSaved: () => void;
}) {
  const meta = SETTING_META[settingKey] ?? { label: settingKey };
  // Seeded once per selection: the rail keys this component by section id, so
  // picking another region mounts a fresh one rather than re-seeding this one.
  const [value, setValue] = useState(settings[settingKey] ?? "");
  const [saving, setSaving] = useState(false);

  const dirty = value !== (settings[settingKey] ?? "");

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/flz/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [settingKey]: value }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Could not save");

      onSettingsChange({ ...settings, [settingKey]: value });
      notify("Saved");
      onSaved();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={s.inspector}>
      <h3 className={s.inspectorTitle}>{meta.label}</h3>

      <div className={s.inspectorScroll}>
      <Field label={settingKey} hint={meta.hint}>
        {meta.multiline ? (
          <textarea
            className={s.textarea}
            rows={4}
            maxLength={2000}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        ) : (
          <input
            className={s.input}
            maxLength={500}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        )}
      </Field>
      </div>

      <button type="button" className={s.railSave} disabled={!dirty || saving} onClick={save}>
        {saving ? <Spinner size={13} /> : <Save size={13} />}
        {dirty ? "Save" : "Saved"}
      </button>
    </div>
  );
}

function ProjectInspector({
  projectId,
  projects,
  onProjectsChange,
  notify,
  onSaved,
}: {
  projectId: string;
  projects: FlzProjectData[];
  onProjectsChange: (projects: FlzProjectData[]) => void;
  notify: Notify;
  onSaved: () => void;
}) {
  const project = projects.find((candidate) => candidate.id === projectId) ?? null;
  const [draft, setDraft] = useState<FlzProjectData | null>(project);
  const [saving, setSaving] = useState(false);

  if (!project || !draft) {
    return (
      <p className={s.railNote}>
        This post is on the page but not in the studio&apos;s list — reload the
        studio to pick it up.
      </p>
    );
  }

  const set = <K extends keyof FlzProjectData>(key: K, value: FlzProjectData[K]) =>
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));

  const dirty = JSON.stringify(draft) !== JSON.stringify(project);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/flz/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          tools: draft.tools,
          category: draft.category,
          body: draft.body,
          featured: draft.featured,
          visible: draft.visible,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Could not save");

      onProjectsChange(projects.map((item) => (item.id === draft.id ? draft : item)));
      notify("Post saved");
      onSaved();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={s.inspector}>
      <h3 className={s.inspectorTitle}>{project.title || "Untitled post"}</h3>

      <div className={s.inspectorScroll}>

      <div className={s.inspectorGroup}>
        <span className={s.railLabel}>Content</span>

      <Field label="Title">
        <input
          className={s.input}
          maxLength={200}
          value={draft.title}
          onChange={(event) => set("title", event.target.value)}
        />
      </Field>

      <Field label="Tools">
        <input
          className={s.input}
          maxLength={200}
          value={draft.tools}
          onChange={(event) => set("tools", event.target.value)}
        />
      </Field>

      <Field label="Category">
        <input
          className={s.input}
          maxLength={100}
          value={draft.category}
          onChange={(event) => set("category", event.target.value)}
        />
      </Field>

      <Field label="Body">
        <textarea
          className={s.textarea}
          rows={4}
          maxLength={4000}
          value={draft.body ?? ""}
          onChange={(event) => set("body", event.target.value)}
        />
      </Field>
      </div>

      <div className={s.inspectorGroup}>
        <span className={s.railLabel}>Visibility</span>
      <div className={s.inspectorToggles}>
        <button
          type="button"
          className={`${s.chipToggle} ${draft.visible ? s.chipToggleOn : ""}`}
          onClick={() => set("visible", !draft.visible)}
        >
          {draft.visible ? <Eye size={13} /> : <EyeOff size={13} />}
          {draft.visible ? "Visible" : "Hidden"}
        </button>
        <button
          type="button"
          className={`${s.chipToggle} ${draft.featured ? s.chipToggleOn : ""}`}
          onClick={() => set("featured", !draft.featured)}
        >
          <Star size={13} />
          {draft.featured ? "Featured" : "Not featured"}
        </button>
      </div>
      </div>

      </div>

      <button type="button" className={s.railSave} disabled={!dirty || saving} onClick={save}>
        {saving ? <Spinner size={13} /> : <Save size={13} />}
        {dirty ? "Save" : "Saved"}
      </button>
    </div>
  );
}

function ArticleInspector({
  articleRef,
  articles,
  notify,
  onSaved,
}: {
  articleRef: string;
  articles: PortfolioArticleWithImages[];
  notify: Notify;
  onSaved: () => void;
}) {
  // Pages may reference an article by id or by folder name; accept either.
  const article =
    articles.find((candidate) => candidate.id === articleRef) ??
    articles.find((candidate) => candidate.folderName === articleRef) ??
    null;

  const [visible, setVisible] = useState(article?.visible ?? true);
  const [category, setCategory] = useState(article?.category ?? "OTHER");
  const [saving, setSaving] = useState(false);

  if (!article) {
    return <p className={s.railNote}>This article is not in the studio&apos;s list.</p>;
  }

  const dirty = visible !== article.visible || category !== article.category;

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/portfolio/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: article.id,
          title: article.title,
          description: article.description,
          date: article.date,
          visible,
          category,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Could not save");

      notify("Article saved");
      onSaved();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={s.inspector}>
      <h3 className={s.inspectorTitle}>{article.title}</h3>

      <div className={s.inspectorScroll}>

      <div className={s.inspectorGroup}>
        <span className={s.railLabel}>Content</span>
        <Field label="Category">
          <input
            className={s.input}
            maxLength={100}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
        </Field>
      </div>

      <div className={s.inspectorGroup}>
        <span className={s.railLabel}>Visibility</span>
      <div className={s.inspectorToggles}>
        <button
          type="button"
          className={`${s.chipToggle} ${visible ? s.chipToggleOn : ""}`}
          onClick={() => setVisible((prev) => !prev)}
        >
          {visible ? <Eye size={13} /> : <EyeOff size={13} />}
          {visible ? "Visible" : "Hidden"}
        </button>
      </div>
      </div>

      </div>

      <button type="button" className={s.railSave} disabled={!dirty || saving} onClick={save}>
        {saving ? <Spinner size={13} /> : <Save size={13} />}
        {dirty ? "Save" : "Saved"}
      </button>
    </div>
  );
}
