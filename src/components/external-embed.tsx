"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";

// Third-party iframes (Sketchfab) receive the visitor's IP address and can set
// cookies, so nothing is requested from the provider until the visitor opts in.
// The choice lasts for the browser tab session only.
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
}: ExternalEmbedProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let allowed = false;
    try {
      allowed = window.sessionStorage.getItem(STORAGE_PREFIX + storageKey) === "allowed";
    } catch {}
    if (!allowed) return;
    const timer = window.setTimeout(() => setLoaded(true), 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  const load = () => {
    try {
      window.sessionStorage.setItem(STORAGE_PREFIX + storageKey, "allowed");
    } catch {}
    setLoaded(true);
  };

  if (loaded) {
    return <iframe src={src} title={title} allow={allow} className={iframeClassName} style={iframeStyle} />;
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
