"use client";

import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { Activity, FolderOpen, Layers, LogOut, Mail, Radio, X } from "lucide-react";
import type { PortfolioArticleWithImages } from "@/lib/portfolio-sync";
import type { SocialEntry } from "@/lib/social-config";
import type { SocialMetricsSnapshot } from "@/lib/social-metrics";
import type { TelemetrySnapshot } from "@/lib/telemetry";
import type { FlzProjectData } from "@/components/studio/types";
import { ArticlesPanel } from "@/components/studio/articles-panel";
import { MessagesPanel, type StudioMessage } from "@/components/studio/messages-panel";
import { ProjectsPanel } from "@/components/studio/projects-panel";
import { SocialPanel } from "@/components/studio/social-panel";
import { SocialMetricsCard } from "@/components/studio/social-metrics-card";
import { TelemetryCard } from "@/components/studio/telemetry-card";
import { Spinner, type Notify } from "@/components/studio/ui";
import s from "@/components/studio/studio.module.css";

type DashboardTab = "overview" | "posts" | "messages" | "articles" | "social";

interface DashboardOverlayProps {
  onClose: () => void;
  projects: FlzProjectData[];
  // ProjectsPanel reorders in place, so it needs the updater form.
  setProjects: Dispatch<SetStateAction<FlzProjectData[]>>;
  messages: StudioMessage[];
  articles: PortfolioArticleWithImages[];
  social: SocialEntry[];
  telemetry: TelemetrySnapshot;
  telemetryLive: boolean;
  socialMetrics: SocialMetricsSnapshot;
  socialMetricsLive: boolean;
  socialImportConfiguration: { instagram: boolean; tiktok: boolean };
  onProjectsChanged: () => Promise<void>;
  userEmail: string;
  notify: Notify;
}

/**
 * The analytical half of the studio: numbers, the inbox, and the bulk
 * management the rail deliberately does not carry.
 *
 * It floats over the frame rather than displacing it, so dismissing it puts you
 * straight back where you were editing. Its sections sit in a left column
 * rather than a tab strip, so the rail stays the only toolbar on screen.
 */
export function DashboardOverlay({
  onClose,
  projects,
  setProjects,
  messages,
  articles,
  social,
  telemetry,
  telemetryLive,
  socialMetrics,
  socialMetricsLive,
  socialImportConfiguration,
  onProjectsChanged,
  userEmail,
  notify,
}: DashboardOverlayProps) {
  const [tab, setTab] = useState<DashboardTab>("overview");

  // Escape closes, matching every other dismissible layer on the site.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const unread = messages.filter((message) => message.status === "NEW").length;

  const sections: { id: DashboardTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "overview", label: "Overview", icon: <Activity size={15} /> },
    { id: "posts", label: "Posts", icon: <Layers size={15} />, count: projects.length },
    { id: "messages", label: "Messages", icon: <Mail size={15} />, count: unread },
    { id: "articles", label: "Articles", icon: <FolderOpen size={15} />, count: articles.length },
    { id: "social", label: "Social", icon: <Radio size={15} />, count: social.length },
  ];

  const active = sections.find((section) => section.id === tab);

  // Counts the studio already holds. Deliberately not telemetry figures: the
  // card below polls those live, and a second copy here would go stale beside it.
  const band = [
    { label: "Posts", value: projects.length },
    { label: "Unread messages", value: unread },
    { label: "Articles", value: articles.length },
    { label: "Social links", value: social.length },
  ];

  return (
    <div className={s.dashWrap} role="dialog" aria-modal="true" aria-label="Dashboard">
      <div className={s.dashScrim} onClick={onClose} />

      <section className={s.dash}>
        <nav className={s.dashNav} aria-label="Dashboard sections">
          <span className={s.railLabel}>The whole site</span>

          <div className={s.dashNavList}>
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                aria-current={tab === section.id ? "page" : undefined}
                className={`${s.dashNavItem} ${tab === section.id ? s.dashNavItemActive : ""}`}
                onClick={() => setTab(section.id)}
              >
                {section.icon}
                <span className={s.dashNavLabel}>{section.label}</span>
                {section.count !== undefined && section.count > 0 && (
                  <span className={s.railCount}>{section.count}</span>
                )}
              </button>
            ))}
          </div>

          <div className={s.dashNavFoot}>
            <span className={s.railUser} title={userEmail}>
              {userEmail}
            </span>
            <SignOutButton />
          </div>
        </nav>

        <div className={s.dashMain}>
          <header className={s.dashMainHead}>
            <h2 className={s.dashTitle}>{active?.label ?? "Overview"}</h2>
            <button type="button" className={s.dashClose} onClick={onClose} title="Close (Esc)">
              <X size={16} />
            </button>
          </header>

          <div className={s.dashBody}>
            {/*
              Panels stay mounted and inactive ones hide with CSS: unmounting would
              throw away both unsaved drafts and values already saved, so returning
              to a section would show stale props and write them back on the next save.
            */}
            <div className={`${s.dashPane} ${tab === "overview" ? "" : s.dashPaneHidden}`}>
              <div className={s.dashBand}>
                {band.map((stat) => (
                  <div key={stat.label} className={s.dashStat}>
                    <span className={s.railLabel}>{stat.label}</span>
                    <span className={s.dashStatValue}>{stat.value}</span>
                  </div>
                ))}
              </div>

              <div className={s.dashGrid}>
                <TelemetryCard initial={telemetry} live={telemetryLive} />
                <SocialMetricsCard initial={socialMetrics} live={socialMetricsLive} />
              </div>
            </div>

            <div className={`${s.dashPane} ${tab === "posts" ? "" : s.dashPaneHidden}`}>
              <ProjectsPanel projects={projects} setProjects={setProjects} notify={notify} />
            </div>

            <div className={`${s.dashPane} ${tab === "messages" ? "" : s.dashPaneHidden}`}>
              <MessagesPanel initial={messages} notify={notify} />
            </div>

            <div className={`${s.dashPane} ${tab === "articles" ? "" : s.dashPaneHidden}`}>
              <ArticlesPanel articles={articles} notify={notify} />
            </div>

            <div className={`${s.dashPane} ${tab === "social" ? "" : s.dashPaneHidden}`}>
              <SocialPanel
                initial={social}
                initialMetrics={socialMetrics}
                importConfiguration={socialImportConfiguration}
                onProjectsChanged={onProjectsChanged}
                notify={notify}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SignOutButton() {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className={s.dashSignOut}
      disabled={busy}
      title="Sign out of the studio"
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } finally {
          window.location.href = "/";
        }
      }}
    >
      {busy ? <Spinner size={13} /> : <LogOut size={13} />}
      Sign out
    </button>
  );
}
