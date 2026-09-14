"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import type { PortfolioArticleWithImages } from "@/lib/portfolio-sync";
import type { SocialEntry } from "@/lib/social-config";
import type { SocialMetricsSnapshot } from "@/lib/social-metrics";
import type { TelemetrySnapshot } from "@/lib/telemetry";
import { DashboardOverlay } from "@/components/studio/dashboard-overlay";
import { EditorRail } from "@/components/studio/editor-rail";
import type { StudioMessage } from "@/components/studio/messages-panel";
import type { FlzProjectData } from "@/components/studio/types";
import { ToastStack, type ToastItem, type ToastKind } from "@/components/studio/ui";
import { editFrameUrl, useSiteFrame } from "@/components/studio/use-site-frame";
import s from "@/components/studio/studio.module.css";

type StudioTheme = "light" | "dark";

const THEME_STORAGE_KEY = "flz-studio-theme";
const themeListeners = new Set<() => void>();

function getThemeSnapshot(): StudioTheme {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

function getServerThemeSnapshot(): StudioTheme {
  return "dark";
}

function subscribeToTheme(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) listener();
  };

  window.addEventListener("storage", onStorage);
  themeListeners.add(listener);

  return () => {
    window.removeEventListener("storage", onStorage);
    themeListeners.delete(listener);
  };
}

interface StudioEditorProps {
  articles: PortfolioArticleWithImages[];
  social: SocialEntry[];
  flzProjects: FlzProjectData[];
  flzSettings: Record<string, string>;
  messages: StudioMessage[];
  userEmail: string;
  telemetry: TelemetrySnapshot;
  telemetryLive?: boolean;
  socialMetrics: SocialMetricsSnapshot;
  socialMetricsLive?: boolean;
  socialImportConfiguration: { instagram: boolean; tiktok: boolean };
}

/**
 * The studio shell: a docked editor rail on the left and the live site in a
 * frame beside it, with the dashboard floating over the frame when opened.
 *
 * The rail edits what you are looking at; the dashboard holds the numbers and
 * the bulk management that is not tied to any one region of a page.
 */
export function StudioEditor({
  articles,
  social,
  flzProjects,
  flzSettings,
  messages,
  userEmail,
  telemetry,
  telemetryLive = true,
  socialMetrics,
  socialMetricsLive = true,
  socialImportConfiguration,
}: StudioEditorProps) {
  const [projects, setProjects] = useState<FlzProjectData[]>(flzProjects);
  const [settings, setSettings] = useState<Record<string, string>>(flzSettings);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  const {
    frameRef,
    frameKey,
    path: framePath,
    sections,
    selected,
    ready,
    editing,
    setEditing,
    select,
    navigate,
    reload,
  } = useSiteFrame("/");

  const notify = useCallback((message: string, kind: ToastKind = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 4500);
  }, []);

  const refreshProjects = useCallback(async () => {
    const response = await fetch("/api/flz/projects", { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(data?.projects)) {
      throw new Error(data?.error || "Could not refresh projects");
    }
    setProjects(data.projects);
  }, []);

  return (
    <div className={s.root} data-theme={theme}>
      <div className={s.workspace}>
        <EditorRail
          path={framePath}
          onNavigate={navigate}
          sections={sections}
          selected={selected}
          onSelect={select}
          editing={editing}
          onEditingChange={setEditing}
          onOpenDashboard={() => setDashboardOpen(true)}
          ready={ready}
          settings={settings}
          onSettingsChange={setSettings}
          projects={projects}
          onProjectsChange={setProjects}
          articles={articles}
          userEmail={userEmail}
          notify={notify}
          onSaved={reload}
        />

        <section className={s.stage}>
          <iframe
            key={frameKey}
            ref={frameRef}
            src={editFrameUrl(framePath)}
            className={s.stageFrame}
            title="Live site preview"
          />

          {dashboardOpen && (
            <DashboardOverlay
              onClose={() => setDashboardOpen(false)}
              projects={projects}
              setProjects={setProjects}
              messages={messages}
              articles={articles}
              social={social}
              telemetry={telemetry}
              telemetryLive={telemetryLive}
              socialMetrics={socialMetrics}
              socialMetricsLive={socialMetricsLive}
              socialImportConfiguration={socialImportConfiguration}
              onProjectsChanged={refreshProjects}
              userEmail={userEmail}
              notify={notify}
            />
          )}
        </section>
      </div>

      <ToastStack
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))}
      />
    </div>
  );
}
