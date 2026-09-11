"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";

// Third-party iframes (Sketchfab) receive the visitor's IP address and can set
// cookies, so nothing is requested from the provider until the visitor opts in.
// A per-embed click lasts for the browser tab session only.
const STORAGE_PREFIX = "flz.embed.";

interface ExternalEmbedProps {
  src: string;
  title: string;
  provider: string;
  storageKey: string;
  allow?: string;
  iframeClassName?: string;
  iframeStyle?: CSSProperties;
  /** Poster or placeholder rendered behind the opt-in prompt. */
  children?: ReactNode;
  /**
   * Compact mode: only a play button over the poster. Nothing is remembered,
   * so the viewer never loads without a click on this page view.
   */
  playButton?: boolean;
  /** Provider page for the model, linked next to the play button in compact mode. */
  externalUrl?: string;
}

export function ExternalEmbed({
  src,
  title,
  provider,
  storageKey,
  allow,
  iframeClassName,
  iframeStyle,
  children,
  playButton = false,
  externalUrl,
}: ExternalEmbedProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (playButton) return;
    let allowed = false;
    try {
      allowed = window.sessionStorage.getItem(STORAGE_PREFIX + storageKey) === "allowed";
    } catch {}
    if (!allowed) return;
    const timer = window.setTimeout(() => setLoaded(true), 0);
    return () => window.clearTimeout(timer);
  }, [playButton, storageKey]);

  const load = () => {
    if (!playButton) {
      try {
        window.sessionStorage.setItem(STORAGE_PREFIX + storageKey, "allowed");
      } catch {}
    }
    setLoaded(true);
  };

  if (loaded) {
    return <iframe src={src} title={title} allow={allow} className={iframeClassName} style={iframeStyle} />;
  }

  if (playButton) {
    return (
      <>
        {children}
        <div style={{ position: "absolute", left: 12, right: 12, bottom: 12, zIndex: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={load}
            data-embed-play=""
            aria-label={`Load the interactive 3D model from ${provider}`}
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              border: 0,
              borderRadius: 999,
              background: "rgba(8, 9, 12, 0.82)",
              color: "#ffffff",
              cursor: "pointer",
              boxShadow: "0 6px 18px rgba(0, 0, 0, 0.18)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 4.5v15l13-7.5z" />
            </svg>
          </button>
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                border: "1px solid var(--flz-glass-edge, rgba(255, 255, 255, 0.78))",
                background: "var(--flz-glass, rgba(255, 255, 255, 0.86))",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                color: "var(--flz-text-primary, #3a3a3c)",
                font: "400 11px/1.35 var(--flz-font-sans, var(--font-sans)), system-ui, sans-serif",
                whiteSpace: "nowrap",
                textDecoration: "none",
              }}
            >
              Visit on {provider.split(" (")[0]} ↗
            </a>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {children}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 6,
          display: "grid",
          placeItems: "center",
          padding: 16,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            maxWidth: 300,
            padding: "14px 16px",
            borderRadius: 14,
            background: "rgba(8, 9, 12, 0.86)",
            color: "#ffffff",
            textAlign: "center",
            font: "400 12px/1.45 var(--font-sans), system-ui, sans-serif",
            pointerEvents: "auto",
          }}
        >
          <button
            type="button"
            onClick={load}
            style={{
              minHeight: 40,
              padding: "0 16px",
              border: 0,
              borderRadius: 999,
              background: "#ffffff",
              color: "#0b0b0d",
              font: "600 13px/1 var(--font-sans), system-ui, sans-serif",
              cursor: "pointer",
            }}
          >
            Load 3D model
          </button>
          <p style={{ margin: "10px 0 0" }}>
            Loads a viewer from {provider}, which receives your IP address and may set cookies.{" "}
            <Link href="/privacy#embeds" style={{ color: "#ffffff", textDecoration: "underline" }}>
              Privacy policy
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
