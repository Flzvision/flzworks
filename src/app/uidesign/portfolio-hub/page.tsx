"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { relativeAge } from "@/lib/flz-date";
import { ExternalEmbed } from "@/components/external-embed";
import { LegalLinks } from "@/components/legal-links";
import { TelemetryConsent } from "@/components/telemetry-consent";
import { TELEMETRY_READY_EVENT, trackTelemetryEvent } from "@/lib/telemetry-client";
import { PUBLIC_CONTACT_PROFILE, PUBLIC_CONTACT_QR_SRC, PUBLIC_CONTACT_ROWS } from "@/lib/public-contact-profile";

// ── Design token CSS (flz-works DS, scoped to this page) ─────────────────────
const DS_TOKENS = `
  .flz-hub-root {
    /* Three faces, three jobs. Serif speaks (wordmark, headlines, card titles),
       sans runs the interface, mono is reserved for literal machine data —
       counts, dates, tool strings. Nothing borrows another's job. */
    --flz-font-primary: var(--font-sans), "Inter", Arial, sans-serif;
    --flz-font-display: var(--font-display), "Instrument Serif", Georgia, serif;
    --flz-font-sans: var(--flz-font-primary);
    --flz-font-mono: var(--font-mono), "JetBrains Mono", ui-monospace, monospace;
    font-family: var(--flz-font-primary);
    font-synthesis: none;

    --flz-text-primary: #F4F2EF;
    --flz-text-secondary: rgba(244,242,239,0.62);
    --flz-text-muted: rgba(244,242,239,0.55);

    --flz-glass-fill: rgba(255,255,255,0.08);
    --flz-glass-fill-raised: rgba(255,255,255,0.14);
    --flz-glass-fill-sunken: rgba(0,0,0,0.22);
    --flz-glass-border: 1px solid rgba(255,255,255,0.18);
    --flz-glass-specular: inset 0 1px 0 rgba(255,255,255,.22), inset 0 -1px 0 rgba(255,255,255,.06);
    --flz-glass-inner-glow: inset 0 0 28px rgba(255,255,255,.06);
    --flz-shadow-md: 0 8px 24px rgba(0,0,0,.42);
    --flz-shadow-lg: 0 18px 48px rgba(0,0,0,.55);
    --flz-shadow-xl: 0 32px 80px rgba(0,0,0,.65);
    --flz-blur-sm: 10px;
    --flz-blur-xl: 44px;
    --flz-saturate: 180%;

    --flz-border-hairline: rgba(255,255,255,0.10);
    --flz-border-glass: rgba(255,255,255,0.18);
    --flz-border-strong: rgba(255,255,255,0.34);
    --flz-accent-soft: rgba(255,255,255,0.10);

    --flz-fs-label: 11px;
    --flz-ls-label: 0.10em;
    --flz-fs-body-sm: 13px;
    --flz-fs-body: 15px;
    --flz-fs-h3: 20px;
    --flz-ls-h3: -0.014em;
    --flz-fw-regular: 400;
    --flz-fw-medium: 500;
    --flz-fw-semibold: 600;

    --flz-radius-sm: 12px;
    --flz-radius-md: 20px;
    --flz-radius-lg: 28px;
    --flz-radius-pill: 999px;
    --flz-ease-glass: cubic-bezier(.22,1,.36,1);
    --flz-ease-std: cubic-bezier(.4,0,.2,1);
    --flz-dur-fast: 160ms;
    --flz-dur-base: 240ms;
  }

  /* ── Entrance / transition motion ──────────────────────────────────────── */
  @keyframes flz-rise {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes flz-tile-in {
    from { opacity: 0; transform: translateY(10px) scale(.985); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes flz-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes flz-modal-in {
    from { opacity: 0; transform: translateY(10px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }

  /* Staggered section reveal on mount */
  .flz-enter {
    animation: flz-rise .52s var(--flz-ease-glass) both;
    animation-delay: var(--flz-delay, 0ms);
  }
  /* Routing-well swap between work / search */
  .flz-view {
    animation: flz-rise .34s var(--flz-ease-glass) both;
  }
  /* Grid tiles — re-staggers when the filter changes */
  .flz-tile-in {
    animation: flz-tile-in .46s var(--flz-ease-glass) both;
    animation-delay: var(--flz-delay, 0ms);
  }
  .flz-backdrop { animation: flz-fade-in .2s var(--flz-ease-std) both; }
  .flz-modal    { animation: flz-modal-in .28s var(--flz-ease-glass) both; }

  @media (prefers-reduced-motion: reduce) {
    .flz-enter, .flz-view, .flz-tile-in, .flz-backdrop, .flz-modal {
      animation-duration: 1ms !important;
      animation-delay: 0ms !important;
    }
    .flz-tile, .flz-tile-arr, .flz-railbtn, .flz-chip, .flz-iconbtn, .flz-btn-solid {
      transition-duration: 1ms !important;
    }
    .flz-tile:hover, .flz-railbtn:hover, .flz-tile:hover .flz-tile-arr { transform: none; }
  }

  .flz-tile { cursor: pointer; transition: transform .28s cubic-bezier(.22,1,.36,1), box-shadow .28s cubic-bezier(.22,1,.36,1); }
  .flz-tile:hover { transform: translateY(-3px); }
  .flz-tile-arr { transition: transform .28s cubic-bezier(.22,1,.36,1); }
  .flz-tile:hover .flz-tile-arr { transform: translate(3px,-3px); }

  .flz-tile.flz-project-tile {
    padding: 0 !important;
    isolation: isolate;
    justify-content: flex-end;
    background: #121317 !important;
    border: 1px solid rgba(29,29,31,.12) !important;
    box-shadow: 0 12px 28px rgba(37,39,46,.12) !important;
  }
  .flz-project-media {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #d8d8dc;
  }
  .flz-project-image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform .42s var(--flz-ease-glass);
  }
  .flz-project-media::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(180deg,rgba(0,0,0,.28) 0%,transparent 36%,rgba(0,0,0,.14) 100%);
  }
  .flz-project-kicker,
  .flz-project-open {
    position: absolute;
    z-index: 2;
    top: 12px;
    color: #fff;
    background: rgba(12,12,14,.76);
    border: 1px solid rgba(255,255,255,.24);
    box-shadow: 0 5px 16px rgba(0,0,0,.24);
    backdrop-filter: blur(12px) saturate(150%);
    -webkit-backdrop-filter: blur(12px) saturate(150%);
  }
  .flz-project-kicker {
    left: 12px;
    max-width: calc(100% - 64px);
    padding: 7px 10px;
    border-radius: 999px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font: 600 9.5px/1 var(--flz-font-mono);
    letter-spacing: .09em;
    text-transform: uppercase;
  }
  .flz-project-open {
    right: 12px;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: grid;
    place-items: center;
  }
  .flz-project-content {
    position: relative;
    z-index: 1;
    width: 100%;
    min-height: 148px;
    margin-top: auto;
    padding: 58px 15px 15px;
    box-sizing: border-box;
    color: #fff;
    background: linear-gradient(180deg,transparent 0%,rgba(8,9,12,.62) 35%,rgba(8,9,12,.92) 72%,rgba(8,9,12,.98) 100%);
  }
  .flz-project-title {
    margin: 0;
    color: #fff;
    font: 600 18px/1.18 var(--flz-font-sans);
    letter-spacing: -.02em;
    text-shadow: 0 1px 2px rgba(0,0,0,.95), 0 0 14px rgba(0,0,0,.72);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .flz-project-body {
    margin: 6px 0 0;
    color: rgba(255,255,255,.88);
    font: 400 12.5px/1.35 var(--flz-font-sans);
    text-shadow: 0 1px 5px rgba(0,0,0,.9);
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .flz-project-meta {
    margin-top: 8px;
    color: rgba(255,255,255,.72);
    font: 600 10.5px/1 var(--flz-font-mono);
    letter-spacing: .035em;
    text-transform: uppercase;
    text-shadow: 0 1px 5px rgba(0,0,0,.95);
  }
  /* The lead tile is wider, so it can afford to say more. Type scales with it
     rather than sitting at grid-tile size in a grid-and-a-half of space. */
  .flz-tile-lead .flz-project-title { font: 600 25px/1.12 var(--flz-font-sans); letter-spacing: -.022em; }
  .flz-tile-lead .flz-project-body { font-size: 13.5px; -webkit-line-clamp: 2; }
  .flz-tile-lead .flz-project-content { min-height: 168px; padding: 72px 20px 20px; }

  .flz-tile.flz-project-tile:focus-visible {
    outline: 3px solid #0a84ff;
    outline-offset: 3px;
  }
  @media (hover: hover) {
    .flz-tile.flz-project-tile:hover .flz-project-image { transform: scale(1.035); }
    .flz-tile.flz-project-tile:hover .flz-project-open { background: #0a84ff; }
  }

  .flz-railbtn { transition: transform .2s cubic-bezier(.22,1,.36,1); }
  .flz-railbtn:hover { transform: translateY(-2px); }

  .flz-chip {
    display: inline-flex; align-items: center; height: 32px; padding: 0 14px;
    border-radius: 999px; border: 1px solid rgba(255,255,255,.18);
    font: 500 13px/1 var(--flz-font-sans);
    color: rgba(244,242,239,.62); background: transparent;
    cursor: pointer; transition: background .16s, color .16s, border-color .16s;
    white-space: nowrap;
  }
  .flz-chip:hover { background: rgba(255,255,255,.08); color: #F4F2EF; }
  .flz-chip.active {
    background: rgba(255,255,255,.18); color: #F4F2EF;
    border-color: rgba(255,255,255,.36);
  }

  .flz-iconbtn {
    width: 40px; height: 40px; border-radius: 999px;
    display: flex; align-items: center; justify-content: center;
    border: none; cursor: pointer; transition: background .16s;
    color: #F4F2EF;
  }
  .flz-iconbtn.solid { background: rgba(255,255,255,.22); }
  .flz-iconbtn.ghost { background: transparent; }
  .flz-iconbtn.glass {
    width: 32px; height: 32px;
    background: rgba(255,255,255,.12);
    border: 1px solid rgba(255,255,255,.18);
  }
  .flz-iconbtn:hover { background: rgba(255,255,255,.28); }

  .flz-btn-solid {
    display: inline-flex; align-items: center; height: 32px; padding: 0 16px;
    border-radius: 999px; background: #F4F2EF; color: #0B0B0C;
    font: 500 13px/1 var(--flz-font-sans);
    border: none; cursor: pointer; transition: background .16s;
    white-space: nowrap;
  }
  .flz-btn-solid:hover { background: #fff; }

  .flz-theme-toggle {
    min-width: 96px;
    height: 38px;
    margin-left: auto;
    padding: 0 12px 0 9px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 999px;
    border: 1px solid rgba(29,29,31,.13);
    background: rgba(255,255,255,.82);
    color: #1d1d1f;
    box-shadow: 0 7px 20px rgba(37,39,46,.10);
    backdrop-filter: blur(14px) saturate(150%);
    -webkit-backdrop-filter: blur(14px) saturate(150%);
    font: 600 12px/1 var(--flz-font-sans);
    cursor: pointer;
    transition: transform .2s var(--flz-ease-glass), background-color .2s, color .2s, border-color .2s;
  }
  .flz-theme-toggle-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #1d1d1f;
    color: #fff;
  }
  .flz-theme-toggle:hover { transform: translateY(-1px); }
  .flz-theme-toggle:active { transform: scale(.97); }
  .flz-theme-toggle:focus-visible { outline: 3px solid rgba(10,132,255,.68); outline-offset: 3px; }

  .flz-stat-tile {
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 12px 14px; border-radius: var(--flz-radius-md);
    background: #1c1a17; border: 1px solid rgba(255,255,255,.10);
  }

  .flz-iconbtn:focus-visible,
  .flz-chip:focus-visible,
  .flz-btn-solid:focus-visible {
    outline: 2px solid rgba(255,255,255,.6);
    outline-offset: 2px;
  }

  .flz-badge {
    display: inline-flex; align-items: center; gap: 6px; height: 22px;
    padding: 0 9px; border-radius: 999px;
    background: rgba(244,242,239,.15); border: 1px solid rgba(244,242,239,.22);
    font: 500 10.5px/1 var(--flz-font-mono);
    letter-spacing: .06em; text-transform: uppercase; color: #F4F2EF;
    backdrop-filter: blur(8px); white-space: nowrap;
  }
  .flz-badge-dot {
    width: 6px; height: 6px; border-radius: 50%; background: #4ade80; flex-shrink: 0;
  }

  /* ── Mobile layout ─────────────────────────────────────────────────────── */
  @media (max-width: 640px) {
    /* Content wrapper: stack vertically, tight padding, room for bottom bar */
    .flz-content {
      flex-direction: column !important;
      padding: 24px 16px 88px !important;
      gap: 16px !important;
      min-height: 100vh;
      min-height: 100dvh;
    }
    /* IconRail → fixed bottom bar */
    .flz-rail {
      position: fixed !important;
      bottom: 0; left: 0; right: 0;
      z-index: 40;
      width: auto !important;
      flex-direction: row !important;
      align-self: stretch !important;
      border-radius: 0 !important;
      padding: 10px 0 max(10px, env(safe-area-inset-bottom)) !important;
      justify-content: center;
      gap: 20px !important;
    }
    /* MainSlab: full-bleed, tighter padding */
    .flz-slab {
      border-radius: 20px !important;
      padding: 20px !important;
      gap: 18px !important;
      min-height: 0 !important;
      overflow: visible !important;
    }
    /* Hero row: stack headline + stats */
    .flz-hero {
      flex-direction: column !important;
      gap: 18px !important;
      align-items: flex-start !important;
    }
    /* Don't let the headline stretch */
    .flz-hero > *:first-child {
      flex: none !important;
    }
    /* Stat tiles: equal-width row */
    .flz-stats {
      width: 100%;
      flex-shrink: 1 !important;
      gap: 8px !important;
    }
    .flz-stat-tile {
      width: 0 !important;
      height: auto !important;
      min-width: 0 !important;
      padding: 10px 10px !important;
      flex: 1 1 0% !important;
      aspect-ratio: 1;
    }
    /* Single column on mobile — the lead tile's 2-col span must not survive */
    .flz-grid { grid-template-columns: 1fr !important; grid-template-rows: none !important; }
    .flz-grid > * { grid-column: auto !important; min-height: 210px !important; }
    /* Filter chips: horizontal scroll */
    .flz-filters {
      flex-wrap: nowrap !important;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .flz-filters::-webkit-scrollbar { display: none; }
    /* Main content area: stack grid + right column */
    .flz-main-area {
      flex-direction: column !important;
      gap: 18px !important;
      min-height: auto !important;
      flex: none !important;
      overflow: visible !important;
    }
    .flz-main-area > div:first-child {
      overflow: visible !important;
      min-height: auto !important;
      flex: none !important;
    }
    /* Project grid: 2 columns, auto rows */
    .flz-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      grid-template-rows: auto auto auto !important;
      gap: 10px !important;
    }
    .flz-project-tile { min-height: 300px !important; }
    .flz-project-content { min-height: 148px; padding-top: 54px; }
    /* Right column: full width, stack */
    .flz-sidebar {
      width: 100% !important;
      flex-direction: column !important;
      height: auto !important;
    }
    /* Featured card: minimum height for the image */
    .flz-featured { min-height: 320px !important; flex: none !important; }
    /* Contact modal: near-full-width */
    .flz-modal { width: calc(100vw - 32px) !important; max-width: 560px !important; }
    /* Contact modal close button: keep inside viewport */
    .flz-modal-close { top: -10px !important; right: -4px !important; }
    /* Pager row header: wrap */
    .flz-pager-row { flex-wrap: wrap; gap: 10px !important; }
    .flz-pager-row .flz-iconbtn.glass { width: 28px !important; height: 28px !important; }
    /* ContactCard internals: stack on mobile */
    .flz-contact-inner { flex-direction: column !important; }
    .flz-contact-qr { width: 180px !important; height: 180px !important; align-self: center !important; }
  }

  /* HIG-inspired visual skin. Structure and responsive layout stay intact. */
  .flz-hub-root {
    --flz-text-primary: #1d1d1f;
    --flz-text-secondary: rgba(29,29,31,.68);
    --flz-text-muted: rgba(29,29,31,.46);
    --flz-glass-fill-raised: rgba(255,255,255,.7);
    --flz-glass-border: 1px solid rgba(255,255,255,.88);
    --flz-border-strong: rgba(29,29,31,.18);
    background:
      radial-gradient(circle at 84% 2%, rgba(202,218,244,.78), transparent 32rem),
      radial-gradient(circle at 10% 96%, rgba(247,219,205,.48), transparent 36rem),
      linear-gradient(180deg, #fbfbfd 0%, #f5f5f7 48%, #ececef 100%) !important;
    color-scheme: light;
  }
  .flz-ambient {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .flz-orb-key { background: radial-gradient(closest-side,rgba(108,164,247,.52),transparent 70%); }
  .flz-orb-bounce { background: radial-gradient(closest-side,rgba(247,175,144,.32),transparent 74%); }
  .flz-orb {
    position: absolute;
    pointer-events: none;
    transform: translateZ(0);
  }
  /* Keyed to the headline, not to the middle of the viewport. */
  .flz-orb-key {
    top: -16%;
    left: -6%;
    width: min(74vw, 880px);
    height: min(52vw, 620px);
    border-radius: 50%;
    opacity: .72;
  }
  .flz-orb-bounce {
    right: -14%;
    bottom: -22%;
    width: min(62vw, 720px);
    height: min(44vw, 520px);
    border-radius: 50%;
    opacity: .58;
  }
  /* Grain over everything: it breaks the plastic-gradient sheen and gives the
     flat fills a surface. Cheap — one tiled 120px SVG, no repaint. */
  .flz-grain {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    opacity: .32;
    mix-blend-mode: multiply;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.86' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E");
    background-size: 120px 120px;
  }
  .flz-slab {
    background: linear-gradient(145deg,rgba(255,255,255,.96),rgba(247,247,250,.94));
    border: 1px solid rgba(255,255,255,.9);
    box-shadow: inset 0 0 0 1px rgba(29,29,31,.05), 0 34px 90px rgba(37,39,46,.14);
    backdrop-filter: blur(24px) saturate(145%);
    -webkit-backdrop-filter: blur(24px) saturate(145%);
  }
  .flz-stat-tile,
  .flz-tile,
  .flz-sidebar > * {
    background-color: rgba(255,255,255,.9) !important;
    border-color: rgba(29,29,31,.11) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 14px 34px rgba(37,39,46,.10);
  }
  .flz-tile:hover {
    border-color: rgba(29,29,31,.14) !important;
    box-shadow: inset 0 0 0 1px rgba(29,29,31,.08), 0 22px 46px rgba(37,39,46,.13);
  }
  .flz-chip { border-color: rgba(29,29,31,.08); background: rgba(29,29,31,.035); color: rgba(29,29,31,.66); }
  .flz-chip:hover { background: rgba(29,29,31,.075); color: #1d1d1f; }
  .flz-chip.active { background: #1d1d1f; border-color: #1d1d1f; color: #fff; box-shadow: 0 7px 18px rgba(29,29,31,.16); }
  .flz-iconbtn { color: #1d1d1f; }
  .flz-rail {
    background: rgba(255,255,255,.92) !important;
    border: 1px solid rgba(29,29,31,.12) !important;
  }
  .flz-iconbtn.ghost { background: rgba(29,29,31,.055); }
  .flz-iconbtn.solid { background: #1d1d1f; color: #fff; box-shadow: 0 7px 18px rgba(29,29,31,.18); }
  .flz-iconbtn.glass { background: #fff; border-color: rgba(29,29,31,.14); box-shadow: 0 5px 14px rgba(37,39,46,.10); }
  .flz-iconbtn:disabled { opacity: .38; cursor: default; box-shadow: none; }
  .flz-btn-solid { background: #1d1d1f; color: #fff; box-shadow: 0 10px 24px rgba(29,29,31,.16); }
  .flz-iconbtn:active,
  .flz-chip:active,
  .flz-btn-solid:active { transform: scale(.96); }
  .flz-iconbtn:focus-visible,
  .flz-chip:focus-visible,
  .flz-btn-solid:focus-visible { outline: 3px solid rgba(10,132,255,.62); outline-offset: 3px; }
  .flz-badge { background: rgba(29,29,31,.7); border-color: rgba(255,255,255,.28); color: #fff; }
  .flz-modal { filter: drop-shadow(0 28px 70px rgba(37,39,46,.22)); }
  .flz-contact-card {
    background: #f7f7f9;
    border: 1px solid rgba(29,29,31,.14);
    box-shadow: 0 24px 64px rgba(37,39,46,.22);
  }
  /* Same glass surface as the sidebar cards. Fills the project-grid area; the
     message box takes up the spare height so there is no dead space. */
  .flz-message-panel {
    flex: 1;
    min-height: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 28px;
    box-sizing: border-box;
    border-radius: 18px;
    border: 1px solid var(--flz-glass-edge);
    background: var(--flz-glass);
    box-shadow: inset 0 1px 0 var(--flz-glass-specular-top), 0 6px 22px rgba(17, 19, 26, .07);
    backdrop-filter: blur(22px) saturate(165%);
    -webkit-backdrop-filter: blur(22px) saturate(165%);
  }
  .flz-message-intro h2 {
    margin: 0;
    color: var(--flz-text-primary);
    font: 400 clamp(28px, 2.6vw, 38px)/1.08 var(--flz-font-display);
    letter-spacing: -.01em;
  }
  .flz-message-intro p {
    margin: 6px 0 0;
    color: var(--flz-text-secondary);
    font: 400 13.5px/1.45 var(--flz-font-sans);
  }
  .flz-message-form { flex: 1; min-height: 0; display: flex; min-width: 0; flex-direction: column; gap: 14px; }
  .flz-message-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .flz-message-form > label { flex: 1; min-height: 0; }
  .flz-message-form label { display: flex; min-width: 0; flex-direction: column; gap: 5px; }
  .flz-message-form label > span { color: var(--flz-text-secondary); font: 500 12px/1 var(--flz-font-sans); }
  .flz-message-form input,
  .flz-message-form textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--flz-separator);
    border-radius: 12px;
    background: rgba(255,255,255,.72);
    color: var(--flz-text-primary);
    font: 400 14px/1.4 var(--flz-font-sans);
    transition: border-color .18s, box-shadow .18s;
  }
  .flz-message-form input { height: 46px; padding: 0 14px; }
  .flz-message-form textarea { flex: 1; min-height: 160px; padding: 13px 14px; resize: none; }
  .flz-message-form input::placeholder,
  .flz-message-form textarea::placeholder { color: var(--flz-text-muted); }
  .flz-message-form input:focus,
  .flz-message-form textarea:focus {
    outline: none;
    border-color: var(--flz-focus);
    box-shadow: 0 0 0 3px rgba(0, 113, 227, .16);
  }
  .flz-message-action { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 2px; }
  .flz-message-action .flz-btn-solid { min-height: 40px; flex-shrink: 0; }
  .flz-message-action .flz-btn-solid:disabled { opacity: .55; cursor: wait; }
  .flz-message-status { margin: 0; color: var(--flz-text-muted); font: 400 11.5px/1.4 var(--flz-font-sans); }
  .flz-message-status a { color: inherit; text-decoration: underline; }
  .flz-message-status.success { color: #1f8a4c; }
  .flz-message-status.error { color: #c4314b; }
  .flz-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding-top: 2px;
    color: var(--flz-text-muted);
    font: 500 10px/1.3 var(--flz-font-mono);
    letter-spacing: .025em;
  }
  .flz-footer-social { display: flex; align-items: center; gap: 2px; }
  .flz-footer-social a {
    display: inline-flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 8px;
    color: var(--flz-text-muted);
    transition: color .15s ease, background-color .15s ease;
  }
  .flz-footer-social a:hover { color: var(--flz-text-primary); background: rgba(127,127,127,.12); }
  .flz-footer-social a:focus-visible { outline: 2px solid var(--flz-text-primary); outline-offset: 1px; }
  .flz-footer-social svg { width: 15px; height: 15px; }

  /* Purpose-built dark theme: warm graphite surfaces with cool ambient color. */
  .flz-hub-root[data-theme="dark"] {
    --flz-text-primary: #f5f5f7;
    --flz-text-secondary: rgba(245,245,247,.72);
    --flz-text-muted: rgba(245,245,247,.52);
    --flz-glass-fill-raised: rgba(24,26,32,.88);
    --flz-glass-border: 1px solid rgba(255,255,255,.12);
    --flz-border-strong: rgba(255,255,255,.2);
    background:
      radial-gradient(circle at 78% 0%, rgba(43,60,94,.42), transparent 34rem),
      radial-gradient(circle at 8% 100%, rgba(78,42,57,.28), transparent 38rem),
      linear-gradient(155deg,#08090c 0%,#101218 48%,#090a0e 100%) !important;
    color-scheme: dark;
  }
  .flz-hub-root[data-theme="dark"] .flz-orb-key { background: radial-gradient(closest-side,rgba(58,117,224,.44),transparent 70%); }
  .flz-hub-root[data-theme="dark"] .flz-orb-bounce { background: radial-gradient(closest-side,rgba(193,67,111,.28),transparent 74%); }
  /* Multiply would only muddy an already-dark ground; screen keeps the tooth. */
  .flz-hub-root[data-theme="dark"] .flz-grain { mix-blend-mode: screen; opacity: .2; }
  .flz-hub-root[data-theme="dark"] .flz-slab {
    background: linear-gradient(145deg,rgba(23,25,31,.97),rgba(13,15,20,.95));
    border-color: rgba(255,255,255,.11);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 34px 90px rgba(0,0,0,.46);
  }
  .flz-hub-root[data-theme="dark"] .flz-stat-tile,
  .flz-hub-root[data-theme="dark"] .flz-tile,
  .flz-hub-root[data-theme="dark"] .flz-sidebar > * {
    background-color: rgba(25,27,33,.94) !important;
    border-color: rgba(255,255,255,.11) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 14px 34px rgba(0,0,0,.28);
  }
  .flz-hub-root[data-theme="dark"] .flz-tile:hover {
    border-color: rgba(255,255,255,.2) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 22px 48px rgba(0,0,0,.42);
  }
  .flz-hub-root[data-theme="dark"] .flz-project-content {
    color: #fff;
    background: linear-gradient(180deg,transparent 0%,rgba(5,6,9,.62) 35%,rgba(5,6,9,.93) 72%,rgba(5,6,9,.99) 100%);
  }
  .flz-hub-root[data-theme="dark"] .flz-project-title { color: #fff; }
  .flz-hub-root[data-theme="dark"] .flz-project-body { color: rgba(255,255,255,.88); }
  .flz-hub-root[data-theme="dark"] .flz-project-meta { color: rgba(255,255,255,.72); }
  .flz-hub-root[data-theme="dark"] .flz-chip {
    border-color: rgba(255,255,255,.11);
    background: rgba(255,255,255,.055);
    color: rgba(245,245,247,.7);
  }
  .flz-hub-root[data-theme="dark"] .flz-chip:hover { background: rgba(255,255,255,.1); color: #fff; }
  .flz-hub-root[data-theme="dark"] .flz-chip.active {
    background: #f5f5f7;
    border-color: #f5f5f7;
    color: #111216;
    box-shadow: 0 8px 24px rgba(0,0,0,.35);
  }
  .flz-hub-root[data-theme="dark"] .flz-rail {
    background: rgba(19,21,26,.92) !important;
    border-color: rgba(255,255,255,.13) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 22px 50px rgba(0,0,0,.42) !important;
  }
  .flz-hub-root[data-theme="dark"] .flz-iconbtn { color: #f5f5f7; }
  .flz-hub-root[data-theme="dark"] .flz-iconbtn.ghost { background: rgba(255,255,255,.06); }
  .flz-hub-root[data-theme="dark"] .flz-iconbtn.solid { background: #f5f5f7; color: #111216; }
  /* A white active tile glares on the dark rail; a raised tint reads as selected without it. */
  .flz-hub-root[data-theme="dark"] .flz-rail .flz-iconbtn.solid {
    background: rgba(255,255,255,.16) !important;
    color: #fff !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.12) !important;
  }
  .flz-hub-root[data-theme="dark"] [data-embed-play] {
    background: rgba(255,255,255,.14) !important;
    border: 1px solid rgba(255,255,255,.16) !important;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }
  .flz-hub-root[data-theme="dark"] .flz-iconbtn.glass {
    background: rgba(255,255,255,.08);
    border-color: rgba(255,255,255,.13);
    box-shadow: 0 5px 16px rgba(0,0,0,.26);
  }
  .flz-hub-root[data-theme="dark"] .flz-theme-toggle {
    background: rgba(20,22,27,.9);
    border-color: rgba(255,255,255,.14);
    color: #f5f5f7;
    box-shadow: 0 9px 26px rgba(0,0,0,.32);
  }
  .flz-hub-root[data-theme="dark"] .flz-theme-toggle-icon { background: #f5f5f7; color: #111216; }
  .flz-hub-root[data-theme="dark"] .flz-badge { background: rgba(7,8,11,.78); }
  .flz-hub-root[data-theme="dark"] .flz-contact-card {
    background: #111318;
    border-color: rgba(255,255,255,.14);
    box-shadow: 0 28px 72px rgba(0,0,0,.52);
  }
  .flz-hub-root[data-theme="dark"] .flz-message-form input,
  .flz-hub-root[data-theme="dark"] .flz-message-form textarea { background: rgba(0,0,0,.28); }
  .flz-hub-root[data-theme="dark"] .flz-message-status.success { color: #7ee2a3; }
  .flz-hub-root[data-theme="dark"] .flz-message-status.error { color: #ff8fa3; }

  /* Motion layer: transform/opacity only, so the preserved layout never shifts. */
  @keyframes flz-shell-in {
    from { opacity: 0; transform: translateY(18px) scale(.992); filter: blur(6px); }
    to { opacity: 1; transform: none; filter: blur(0); }
  }
  @keyframes flz-rail-in {
    from { opacity: 0; transform: translateX(-14px) scale(.94); }
    to { opacity: 1; transform: none; }
  }
  @keyframes flz-stat-pop {
    from { opacity: 0; transform: translateY(10px) scale(.96); }
    to { opacity: 1; transform: none; }
  }
  @keyframes flz-panel-rise {
    from { opacity: 0; transform: translateY(12px) scale(.985); }
    to { opacity: 1; transform: none; }
  }
  @keyframes flz-control-pop {
    0% { transform: scale(.96); }
    70% { transform: scale(1.025); }
    100% { transform: none; }
  }
  .flz-slab { animation: flz-shell-in .68s var(--flz-ease-glass) both; }
  .flz-rail { animation: flz-rail-in .58s var(--flz-ease-glass) 120ms both; }
  .flz-stats .flz-stat-tile { animation: flz-stat-pop .48s var(--flz-ease-glass) backwards; }
  .flz-stats .flz-stat-tile:nth-child(1) { animation-delay: 140ms; }
  .flz-stats .flz-stat-tile:nth-child(2) { animation-delay: 190ms; }
  .flz-stats .flz-stat-tile:nth-child(3) { animation-delay: 240ms; }
  .flz-sidebar > * { animation: flz-panel-rise .55s var(--flz-ease-glass) backwards; }
  .flz-sidebar > :nth-child(1) { animation-delay: 280ms; }
  .flz-sidebar > :nth-child(2) { animation-delay: 340ms; }
  .flz-chip.active { animation: flz-control-pop .3s var(--flz-ease-glass); }
  .flz-stat-tile { transition: transform .25s var(--flz-ease-glass), box-shadow .25s var(--flz-ease-glass); }
  .flz-iconbtn { transition: background .16s, color .16s, transform .2s var(--flz-ease-glass), box-shadow .2s var(--flz-ease-glass); }

  @media (hover: hover) {
    .flz-stat-tile:hover { transform: translateY(-2px); box-shadow: inset 0 0 0 1px rgba(29,29,31,.08), 0 18px 38px rgba(37,39,46,.11); }
    .flz-iconbtn:hover { transform: scale(1.045); }
  }
  @media (prefers-reduced-motion: reduce) {
    .flz-slab,
    .flz-rail,
    .flz-stats .flz-stat-tile,
    .flz-sidebar > *,
    .flz-chip.active,
    .flz-stat-tile:hover,
    .flz-iconbtn:hover { transform: none !important; }
  }

  /* FLZ 2026 visual system
     A restrained content layer: opaque surfaces, one accent, one radius scale,
     and motion only where it communicates state. */
  .flz-hub-root {
    --flz-text-primary: #1d1d1f;
    --flz-text-secondary: #5f5f65;
    --flz-text-muted: #6e6e73; /* 4.7:1 on #f5f5f7 — WCAG AA for the 10–11px labels */
    --flz-surface: #ffffff;
    --flz-surface-secondary: #f5f5f7;
    --flz-surface-tertiary: #e8e8ed;
    --flz-separator: rgba(29, 29, 31, .14);
    /* One glass recipe, three parts: a translucent fill, a slightly brighter
       edge, and a single specular highlight along the top. Everything frosted
       on this page uses these and nothing else. */
    --flz-glass: rgba(255, 255, 255, .62);
    --flz-glass-edge: rgba(255, 255, 255, .78);
    --flz-glass-specular-top: rgba(255, 255, 255, .85);
    --flz-accent: #0066cc;
    --flz-focus: rgba(0, 113, 227, .72);
    --flz-radius-sm: 10px;
    --flz-radius-md: 16px;
    --flz-radius-lg: 20px;
    /* Ground sits a few steps below the glass fill on purpose: white-on-white
       cannot read as frosted, so the panels need something to be brighter than. */
    background: linear-gradient(180deg,#f2f3f7 0%,#eaecf2 54%,#e2e4ec 100%) !important;
  }
  .flz-hub-root[data-theme="dark"] {
    --flz-text-primary: #f5f5f7;
    --flz-text-secondary: #b7b7bd;
    --flz-text-muted: #98989f;
    --flz-surface: #1c1c1e;
    --flz-surface-secondary: #111113;
    --flz-surface-tertiary: #2c2c2e;
    --flz-separator: rgba(255, 255, 255, .14);
    --flz-glass: rgba(30, 32, 39, .58);
    --flz-glass-edge: rgba(255, 255, 255, .12);
    --flz-glass-specular-top: rgba(255, 255, 255, .09);
    --flz-accent: #2997ff;
    --flz-focus: rgba(41, 151, 255, .82);
    background: linear-gradient(180deg,#0c0d10 0%,#101116 54%,#0a0b0e 100%) !important;
  }
  .flz-hub-root[data-theme="dark"] .flz-orb-key { opacity: .5; }
  .flz-hub-root[data-theme="dark"] .flz-orb-bounce { opacity: .36; }
  .flz-content {
    width: min(100%, 1680px);
    margin-inline: auto;
    padding: 32px !important;
    gap: 20px !important;
  }
  .flz-slab {
    padding: 12px 8px 24px !important;
    gap: 26px !important;
    overflow: visible !important;
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    animation: none !important;
  }
  .flz-rail {
    width: 48px !important;
    padding: 4px !important;
    gap: 2px !important;
    border-radius: 16px !important;
    background: var(--flz-glass) !important;
    border: 1px solid var(--flz-glass-edge) !important;
    box-shadow: inset 0 1px 0 var(--flz-glass-specular-top), 0 4px 18px rgba(17, 19, 26, .08) !important;
    backdrop-filter: blur(20px) saturate(165%) !important;
    -webkit-backdrop-filter: blur(20px) saturate(165%) !important;
    animation: none !important;
  }
  .flz-rail > div:first-child { display: none !important; }
  .flz-rail a.flz-iconbtn { text-decoration: none; }
  .flz-iconbtn {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    color: var(--flz-text-secondary);
  }
  .flz-iconbtn.ghost { background: transparent !important; }
  .flz-iconbtn.solid {
    background: var(--flz-text-primary) !important;
    color: var(--flz-surface) !important;
    box-shadow: none !important;
  }
  .flz-iconbtn.glass {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--flz-glass) !important;
    color: var(--flz-text-primary) !important;
    border: 1px solid var(--flz-glass-edge) !important;
    box-shadow: inset 0 1px 0 var(--flz-glass-specular-top) !important;
    backdrop-filter: blur(16px) saturate(160%) !important;
    -webkit-backdrop-filter: blur(16px) saturate(160%) !important;
  }
  .flz-theme-toggle {
    min-width: 0;
    height: 36px;
    padding: 0 12px 0 7px;
    border-radius: 11px;
    background: var(--flz-glass) !important;
    border: 1px solid var(--flz-glass-edge) !important;
    color: var(--flz-text-primary) !important;
    box-shadow: inset 0 1px 0 var(--flz-glass-specular-top) !important;
    backdrop-filter: blur(18px) saturate(160%) !important;
    -webkit-backdrop-filter: blur(18px) saturate(160%) !important;
  }
  .flz-theme-toggle-icon {
    width: 22px;
    height: 22px;
    background: transparent !important;
    color: var(--flz-text-primary) !important;
  }
  .flz-autosalon-cta {
    position: relative;
    min-height: 36px;
    padding: 0 13px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    flex: 0 0 auto;
    border: 1px solid rgba(220, 231, 245, .48);
    border-radius: 11px;
    color: #ffd166;
    background-color: #12284b;
    background-image:
      linear-gradient(rgba(220, 231, 245, .08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(220, 231, 245, .08) 1px, transparent 1px);
    background-size: 12px 12px;
    box-shadow: inset 0 0 0 1px rgba(18, 40, 75, .2);
    font: 600 12px/1 var(--flz-font-sans);
    text-decoration: none;
    white-space: nowrap;
    transition: border-color 160ms var(--flz-ease-std), background-color 160ms var(--flz-ease-std), transform 160ms var(--flz-ease-std);
  }
  .flz-autosalon-cta:hover {
    border-color: #ffd166;
    background-color: #17345f;
  }
  .flz-autosalon-cta:active { transform: scale(.98); }
  .flz-autosalon-cta:focus-visible {
    outline: 3px solid var(--flz-focus);
    outline-offset: 3px;
  }
  .flz-chip {
    height: 36px;
    padding-inline: 14px;
    border-radius: 11px;
    border: 1px solid transparent !important;
    background: transparent !important;
    color: var(--flz-text-secondary) !important;
    font-weight: 500;
  }
  .flz-chip:hover { background: var(--flz-surface-tertiary) !important; color: var(--flz-text-primary) !important; }
  .flz-chip.active {
    background: var(--flz-text-primary) !important;
    border-color: var(--flz-text-primary) !important;
    color: var(--flz-surface) !important;
    box-shadow: none !important;
    animation: none !important;
  }
  .flz-stat-tile {
    width: 104px !important;
    height: 88px !important;
    padding: 13px 14px !important;
    border-radius: 14px !important;
    background: var(--flz-glass) !important;
    border: 1px solid var(--flz-glass-edge) !important;
    box-shadow: inset 0 1px 0 var(--flz-glass-specular-top), 0 4px 16px rgba(17, 19, 26, .06) !important;
    backdrop-filter: blur(20px) saturate(165%) !important;
    -webkit-backdrop-filter: blur(20px) saturate(165%) !important;
    animation: none !important;
  }
  .flz-main-area { gap: 20px !important; }
  .flz-grid {
    grid-template-rows: none !important;
    grid-auto-rows: minmax(250px, 1fr) !important;
    gap: 12px !important;
  }
  .flz-tile-in { animation: none !important; }
  .flz-tile.flz-project-tile,
  .flz-featured,
  .flz-sidebar > * {
    border-radius: 18px !important;
    border: 1px solid var(--flz-glass-edge) !important;
    box-shadow: inset 0 1px 0 var(--flz-glass-specular-top), 0 6px 22px rgba(17, 19, 26, .07) !important;
  }
  .flz-sidebar > * {
    background: var(--flz-glass) !important;
    backdrop-filter: blur(22px) saturate(165%) !important;
    -webkit-backdrop-filter: blur(22px) saturate(165%) !important;
  }
  .flz-tile.flz-project-tile { background: #111113 !important; }
  .flz-project-media::after {
    background: linear-gradient(180deg, rgba(0,0,0,.32) 0%, transparent 34%, rgba(0,0,0,.08) 58%, rgba(0,0,0,.54) 100%);
  }
  .flz-project-content,
  .flz-hub-root[data-theme="dark"] .flz-project-content {
    min-height: 154px;
    padding: 62px 16px 16px;
    background: linear-gradient(180deg, transparent, rgba(8,9,12,.74) 38%, rgba(8,9,12,.96) 76%, #08090c 100%);
  }
  .flz-project-kicker {
    border-radius: 8px;
    padding: 7px 9px;
    font-family: var(--flz-font-sans);
    font-size: 11px;
    letter-spacing: .04em;
  }
  .flz-project-open { border-radius: 10px; }
  .flz-project-title { font-size: 19px; text-shadow: 0 1px 12px rgba(0,0,0,.9); }
  .flz-project-body { font-size: 13px; color: rgba(255,255,255,.9); }
  .flz-project-meta {
    font-family: var(--flz-font-sans);
    font-size: 11px;
    letter-spacing: .02em;
    color: rgba(255,255,255,.74);
  }
  .flz-sidebar { width: 360px !important; gap: 12px !important; }
  .flz-badge {
    border-radius: 8px;
    background: rgba(12,12,14,.78) !important;
    font-family: var(--flz-font-sans);
    letter-spacing: .04em;
  }
  .flz-featured { position: relative; }
  .flz-empty-state {
    color: var(--flz-text-primary) !important;
    background: var(--flz-glass) !important;
    border: 1px solid var(--flz-glass-edge) !important;
    box-shadow: inset 0 1px 0 var(--flz-glass-specular-top) !important;
    backdrop-filter: blur(20px) saturate(160%) !important;
    -webkit-backdrop-filter: blur(20px) saturate(160%) !important;
  }
  .flz-empty-state {
    grid-column: 1 / -1;
    width: 100%;
    box-sizing: border-box;
    min-height: 220px;
    display: grid;
    place-items: center;
    padding: 24px;
    border-radius: 18px;
    color: var(--flz-text-secondary) !important;
    font-size: 14px;
    text-align: center;
  }
  .flz-project-tile:focus-visible,
  .flz-iconbtn:focus-visible,
  .flz-chip:focus-visible,
  .flz-btn-solid:focus-visible,
  .flz-theme-toggle:focus-visible {
    outline: 3px solid var(--flz-focus) !important;
    outline-offset: 3px;
  }
  @media (hover: hover) {
    .flz-tile:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.10) !important; }
    .flz-iconbtn:hover { transform: none; background: var(--flz-surface-tertiary) !important; }
    .flz-stat-tile:hover { transform: none; box-shadow: none !important; }
  }
  @media (max-width: 900px) {
    .flz-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
    .flz-sidebar { width: 100% !important; }
  }
  @media (max-width: 640px) {
    .flz-content { padding: 16px 14px 86px !important; }
    .flz-slab { padding: 4px 0 20px !important; gap: 22px !important; }
    .flz-rail {
      bottom: 10px !important;
      left: 50% !important;
      right: auto !important;
      width: auto !important;
      padding: 4px !important;
      gap: 2px !important;
      border-radius: 16px !important;
      transform: translateX(-50%);
    }
    .flz-hero { gap: 20px !important; }
    .flz-stats { gap: 7px !important; }
    .flz-stat-tile {
      width: 0 !important;
      min-width: 0 !important;
      aspect-ratio: auto !important;
      min-height: 82px;
      padding-inline: 10px !important;
    }
    /* A single counter fits beside the headline: scale both down into one row.
       With more than one counter the stacked layout above still applies. */
    .flz-hero:not(:has(.flz-stats > :nth-child(2))) {
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      align-items: center !important;
      gap: 12px !important;
    }
    .flz-hero:not(:has(.flz-stats > :nth-child(2))) > :first-child { flex: 1 1 auto !important; min-width: 0; }
    .flz-hero:not(:has(.flz-stats > :nth-child(2))) h1 { font-size: clamp(1.7rem, 8.4vw, 2.5rem) !important; }
    .flz-hero:not(:has(.flz-stats > :nth-child(2))) .flz-stats { width: auto; flex: none !important; }
    .flz-hero:not(:has(.flz-stats > :nth-child(2))) .flz-stat-tile {
      flex: none !important;
      box-sizing: border-box;
      width: 88px !important;
      height: 76px !important;
      min-height: 0;
      padding: 9px 10px !important;
    }
    .flz-hero:not(:has(.flz-stats > :nth-child(2))) .flz-stat-tile > :first-child { font-size: 8.5px !important; }
    .flz-hero:not(:has(.flz-stats > :nth-child(2))) .flz-stat-tile > :last-child > :first-child { font-size: 19px !important; }
    .flz-grid { grid-template-columns: 1fr !important; grid-auto-rows: minmax(300px, auto) !important; }
    .flz-project-tile { min-height: 330px !important; }
    .flz-theme-toggle { min-height: 44px; }
    /* Icon only on phones; the button keeps its aria-label. */
    .flz-theme-toggle { width: 44px; padding: 0 !important; justify-content: center; }
    .flz-theme-toggle > span:not(.flz-theme-toggle-icon) { display: none; }
    .flz-autosalon-cta { min-height: 44px; padding-inline: 11px; }
    .flz-chip { min-height: 44px; }
    .flz-iconbtn { min-width: 44px; min-height: 44px; }
    .flz-message-panel { padding: 18px; flex: none; }
    .flz-message-fields { grid-template-columns: 1fr; }
    .flz-message-action { align-items: stretch; flex-direction: column; }
    .flz-message-action .flz-btn-solid { width: 100%; justify-content: center; }
    .flz-footer { align-items: flex-start; flex-direction: column; padding-inline: 2px; }
  }

  /* Apple-style motion refinement: short travel, long deceleration, no bounce. */
  @keyframes flz-apple-shell-in {
    from { opacity: 0; transform: translateY(10px) scale(.996); }
    to { opacity: 1; transform: none; }
  }
  @keyframes flz-apple-rail-in {
    from { opacity: 0; transform: translateX(-8px) scale(.98); }
    to { opacity: 1; transform: none; }
  }
  @keyframes flz-apple-item-in {
    from { opacity: 0; transform: translateY(12px) scale(.992); }
    to { opacity: 1; transform: none; }
  }
  @keyframes flz-apple-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .flz-slab {
    animation: flz-apple-shell-in .72s cubic-bezier(.16,1,.3,1) both !important;
  }
  .flz-rail {
    animation: flz-apple-rail-in .64s cubic-bezier(.16,1,.3,1) 90ms both !important;
  }
  .flz-stat-tile {
    animation: flz-apple-item-in .56s cubic-bezier(.16,1,.3,1) backwards !important;
  }
  .flz-stats .flz-stat-tile:nth-child(1) { animation-delay: 100ms !important; }
  .flz-stats .flz-stat-tile:nth-child(2) { animation-delay: 145ms !important; }
  .flz-stats .flz-stat-tile:nth-child(3) { animation-delay: 190ms !important; }
  .flz-tile-in {
    animation: flz-apple-item-in .62s cubic-bezier(.16,1,.3,1) both !important;
    animation-delay: var(--flz-delay, 0ms) !important;
  }
  .flz-sidebar > * {
    animation: flz-apple-item-in .62s cubic-bezier(.16,1,.3,1) backwards !important;
  }
  .flz-sidebar > :nth-child(1) { animation-delay: 210ms !important; }
  .flz-sidebar > :nth-child(2) { animation-delay: 270ms !important; }
  .flz-backdrop { animation: flz-fade-in .28s ease-out both; }
  .flz-modal { animation: flz-modal-in .46s cubic-bezier(.16,1,.3,1) both; }
  .flz-tile,
  .flz-project-image,
  .flz-iconbtn,
  .flz-chip,
  .flz-theme-toggle,
  .flz-autosalon-cta {
    transition-duration: .36s;
    transition-timing-function: cubic-bezier(.16,1,.3,1);
  }
  @media (hover: hover) {
    .flz-tile:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(0,0,0,.12) !important; }
    .flz-tile:hover .flz-project-image { transform: scale(1.018); }
    .flz-iconbtn:hover { transform: scale(1.04); }
  }
  @media (max-width: 640px) {
    .flz-rail {
      animation: flz-apple-fade-in .5s ease-out 90ms both !important;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .flz-slab,
    .flz-rail,
    .flz-stat-tile,
    .flz-tile-in,
    .flz-sidebar > *,
    .flz-backdrop,
    .flz-modal {
      animation: none !important;
    }
    .flz-tile,
    .flz-project-image,
    .flz-iconbtn,
    .flz-chip,
    .flz-theme-toggle,
    .flz-autosalon-cta {
      transition-duration: 1ms !important;
    }
    .flz-tile:hover,
    .flz-tile:hover .flz-project-image,
    .flz-iconbtn:hover { transform: none !important; }
  }
`;

// ── Static data ──────────────────────────────────────────────────────────────
const PROJECTS: { id: number; tools: string; title: string; cat: string; age: string; grad: string; link: string; img: string; body: string }[] = [];

const CATEGORY_ORDER = ["Social", "Assets", "Characters", "Gameplay", "Automotive"];

// Five, not six: the lead tile takes two columns so the grid has a focal point
// instead of six interchangeable rectangles.
const PROJECTS_PER_PAGE = 5;

// ── Icon helpers ──────────────────────────────────────────────────────────────
const IconGrid = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IconInstagram = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.4" cy="6.6" r=".8" fill="currentColor" stroke="none" />
  </svg>
);
const IconTikTok = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 3v10.2a4.2 4.2 0 1 1-3.4-4.12" />
    <path d="M14 3c.5 2.7 2.2 4.3 5 4.7" />
  </svg>
);
const IconMessage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4.5 5.5h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4.5 3v-3a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" />
    <path d="m6.5 9 5.5 4 5.5-4" />
  </svg>
);
const IconIdCard = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
    <circle cx="8" cy="10" r="2.25" />
    <path d="M4.75 16c.65-2 1.75-3 3.25-3s2.6 1 3.25 3" />
    <path d="M14.25 9h4M14.25 12h4M14.25 15h2.75" />
  </svg>
);
const IconArrow = ({ size = 17, rotate = false }: { size?: number; rotate?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
       style={rotate ? { transform: "rotate(180deg)" } : undefined}>
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IconNE = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
  </svg>
);
const IconSun = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const IconMoon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.4 15.6A8.5 8.5 0 0 1 8.4 3.6 8.5 8.5 0 1 0 20.4 15.6Z" />
  </svg>
);

type Theme = "light" | "dark";
const THEME_STORAGE_KEY = "flz-public-theme";
const themeListeners = new Set<() => void>();

function getThemeSnapshot(): Theme {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "light";
}

function getServerThemeSnapshot(): Theme {
  return "light";
}

function subscribeToTheme(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) listener();
  };
  themeListeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    themeListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function setStoredTheme(theme: Theme) {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  themeListeners.forEach(listener => listener());
}

// ── Sub-components ────────────────────────────────────────────────────────────
type MainView = "projects" | "message";

function IconRail({ contactOpen, setContactOpen, activeView, setActiveView }: {
  contactOpen: boolean;
  setContactOpen: (v: boolean) => void;
  activeView: MainView;
  setActiveView: (view: MainView) => void;
}) {
  const railStyle: React.CSSProperties = {
    position: "relative", flexShrink: 0, width: 48, alignSelf: "center",
    padding: 8, display: "flex", flexDirection: "column", gap: 8, alignItems: "center",
    borderRadius: 999,
    background: "var(--flz-glass-fill-raised)",
    border: "var(--flz-glass-border)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.55),inset 0 -1px 0 rgba(255,255,255,.22),inset 1px 0 0 rgba(255,255,255,.16),inset -1px 0 0 rgba(255,255,255,.16),var(--flz-glass-inner-glow),var(--flz-shadow-lg)",
    backdropFilter: `blur(var(--flz-blur-xl)) saturate(var(--flz-saturate)) brightness(1.06)`,
    WebkitBackdropFilter: `blur(var(--flz-blur-xl)) saturate(var(--flz-saturate)) brightness(1.06)`,
  };
  return (
    <div className="flz-rail" style={railStyle}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none", background: "linear-gradient(180deg,rgba(255,255,255,.24) 0%,rgba(255,255,255,0) 14%),linear-gradient(0deg,rgba(255,255,255,.14) 0%,rgba(255,255,255,0) 12%)" }} />
      <span className="flz-railbtn"><button className={`flz-iconbtn ${activeView === "projects" ? "solid" : "ghost"}`} type="button" aria-label="Show projects" aria-pressed={activeView === "projects"} onClick={() => setActiveView("projects")}><IconGrid /></button></span>
      <span className="flz-railbtn"><button className={`flz-iconbtn ${activeView === "message" ? "solid" : "ghost"}`} type="button" aria-label="Message me" aria-pressed={activeView === "message"} onClick={() => setActiveView("message")}><IconMessage /></button></span>
      <span className="flz-railbtn"><button className={`flz-iconbtn ${contactOpen ? "solid" : "ghost"}`} type="button" aria-label="Open ID card" aria-expanded={contactOpen} aria-controls="flz-id-card-dialog" onClick={() => setContactOpen(!contactOpen)}><IconIdCard /></button></span>
    </div>
  );
}

function ContactCard() {
  const downloadVCard = () => {
    trackTelemetryEvent("vcard_download", "main");
    const vcard = [
      "BEGIN:VCARD", "VERSION:3.0",
      `FN:${PUBLIC_CONTACT_PROFILE.name}`, "N:Flosz;Bence;;;",
      "ORG:FLZ Works",
      `TITLE:${PUBLIC_CONTACT_PROFILE.interest}`,
      `URL:${PUBLIC_CONTACT_PROFILE.webUrl}`,
      "END:VCARD",
    ].join("\n");
    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "flz.vcf"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flz-contact-card" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 14, overflow: "hidden", padding: 18, borderRadius: 24 }}>
      <div className="flz-contact-inner" style={{ display: "flex", gap: 18, flex: 1, minHeight: 0 }}>
        {/* ID Card — sits directly on the dialog surface, no nested card. */}
        <div className="flz-id-card" style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 0, padding: "4px 2px" }}>
          <div style={{ font: `500 9.5px/1 var(--flz-font-mono)`, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--flz-text-muted)", borderBottom: "1px solid var(--flz-separator)", paddingBottom: 12, marginBottom: 16 }}>Contact</div>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flex: 1 }}>
            <div style={{ width: 72, height: 88, borderRadius: 12, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", overflow: "hidden", flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size contact portrait */}
              <img src="/profile.jpg" alt="Bence Flosz" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {PUBLIC_CONTACT_ROWS.map(([label, value]) => (
                <div key={label}>
                  <div style={{ font: `500 9.5px/1 var(--flz-font-mono)`, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--flz-text-muted)", marginBottom: 3 }}>{label}</div>
                  <div style={{ font: `500 13px/1.25 var(--flz-font-sans)`, color: "var(--flz-text-primary)" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={downloadVCard} style={{ marginTop: 18, width: "100%", padding: "10px 0", background: "rgba(255,196,88,.15)", border: "1px solid rgba(255,196,88,.3)", borderRadius: 12, cursor: "pointer", font: `600 9.5px/1 var(--flz-font-mono)`, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,196,88,.9)", transition: "background .14s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,196,88,.25)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,196,88,.15)")}
          >[ Download vCard ]</button>
        </div>
        {/* QR */}
        {/* QR fills the full height of the card; the white ground is kept only so it scans in dark mode. */}
        {/* Stretches to the ID card's height; 248px wide keeps it roughly square at that height. */}
        <div className="flz-contact-qr" style={{ flexShrink: 0, width: 248, alignSelf: "stretch", padding: 8, boxSizing: "border-box", borderRadius: 14, background: "#fff" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PUBLIC_CONTACT_QR_SRC} alt="QR code linking to flz.works" width={200} height={200} style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flz-stat-tile" style={{ width: 100, height: 100 }}>
      <div style={{ font: `500 9.5px/1 var(--flz-font-mono)`, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--flz-text-muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3 }}>
        <span style={{ font: `500 23px/1 var(--flz-font-mono)`, letterSpacing: "-.03em", color: "var(--flz-text-primary)" }}>{value}</span>
        {unit && <span style={{ font: `500 12px/1 var(--flz-font-sans)`, color: "var(--flz-text-secondary)", marginBottom: 2 }}>{unit}</span>}
      </div>
    </div>
  );
}

function ProjectTile({ project }: { project: typeof PROJECTS[number] }) {
  const tileStyle: React.CSSProperties = {
    position: "relative", overflow: "hidden",
    flex: 1, minWidth: 0, minHeight: 0,
    display: "flex", flexDirection: "column",
    borderRadius: 28,
    textDecoration: "none", color: "inherit",
  };
  // "Link" in the studio editor is what the tile opens; without one it stays inert.
  const external = /^https?:\/\//i.test(project.link);
  return (
    <a
      href={project.link || "#"}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flz-tile flz-project-tile"
      style={tileStyle}
    >
      <div className="flz-project-media" style={{ background: project.grad }}>
        {project.img && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- author-supplied URL, no loader */}
            <img
              src={project.img}
              alt=""
              className="flz-project-image"
            />
          </>
        )}
        <span className="flz-project-kicker">{project.tools}</span>
        <span className="flz-project-open flz-tile-arr" aria-hidden="true"><IconNE /></span>
      </div>
      <div className="flz-project-content">
        <h2 className="flz-project-title">{project.title}</h2>
        {project.body && (
          <p className="flz-project-body">{project.body}</p>
        )}
        <div className="flz-project-meta">
          {[project.cat, project.age].filter(Boolean).join(" · ")}
        </div>
      </div>
    </a>
  );
}

function DiscordCard({ url }: { url: string }) {
  const cardStyle: React.CSSProperties = {
    flexShrink: 0, padding: 18, borderRadius: 28,
    background: "#1c1a17", border: "1px solid rgba(255,255,255,.10)",
    display: "flex", flexDirection: "column", gap: 14,
    textDecoration: "none", color: "inherit",
  };

  const inner = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ font: `400 18px/1.1 var(--flz-font-display)`, color: "var(--flz-text-primary)" }}>The Discord</div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <span style={{ font: `400 13.5px/1.45 var(--flz-font-sans)`, color: "var(--flz-text-secondary)" }}>
          {url
            ? "Work-in-progress builds, and somewhere to tell me they're broken."
            : "soon"}
        </span>
        {url && <span className="flz-tile-arr" style={{ flexShrink: 0, color: "var(--flz-text-primary)" }}><IconNE /></span>}
      </div>
    </>
  );

  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flz-tile"
      style={cardStyle}
      onClick={() => trackTelemetryEvent("social_open", "main", "discord")}
    >
      {inner}
    </a>
  ) : (
    <div style={cardStyle}>{inner}</div>
  );
}

type SocialStat = {
  platform: "instagram" | "tiktok";
  followers: number | null;
  posts: number | null;
  live: boolean;
};

const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

const SOCIAL_CARDS = {
  instagram: {
    title: "Instagram",
    url: "https://www.instagram.com/vision.flz/",
    postsLabel: "posts",
  },
  tiktok: {
    title: "TikTok",
    url: "https://www.tiktok.com/@vision.flz",
    postsLabel: "videos",
  },
  youtube: {
    title: "YouTube",
    // No channel yet: the card renders without a link and reads "soon".
    url: "",
    postsLabel: "videos",
  },
} as const;

function SocialStatsCard({ platform, stat }: { platform: keyof typeof SOCIAL_CARDS; stat: SocialStat | undefined }) {
  const card = SOCIAL_CARDS[platform];
  const cardStyle: React.CSSProperties = {
    flexShrink: 0, padding: 18, borderRadius: 28,
    display: "flex", flexDirection: "column", gap: 14,
    textDecoration: "none", color: "inherit",
  };
  const figure = (value: number | null | undefined, label: string) => (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5 }}>
      <span style={{ font: `500 17px/1 var(--flz-font-mono)`, letterSpacing: "-.02em", color: "var(--flz-text-primary)" }}>
        {typeof value === "number" ? compactNumber.format(value) : "—"}
      </span>
      <span style={{ font: `400 13px/1 var(--flz-font-sans)`, color: "var(--flz-text-secondary)" }}>{label}</span>
    </span>
  );

  const inner = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ font: `400 18px/1.1 var(--flz-font-display)`, color: "var(--flz-text-primary)" }}>{card.title}</div>
        {stat?.live && (
          <span title="Live from the platform API" style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: 999, background: "#34c759", boxShadow: "0 0 0 3px rgba(52,199,89,.18)" }} />
        )}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        {card.url ? (
          <span style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px" }}>
            {figure(stat?.followers, "followers")}
            {figure(stat?.posts, card.postsLabel)}
          </span>
        ) : (
          <span style={{ font: `400 13.5px/1.45 var(--flz-font-sans)`, color: "var(--flz-text-secondary)" }}>soon</span>
        )}
        {card.url && <span className="flz-tile-arr" style={{ flexShrink: 0, color: "var(--flz-text-primary)" }}><IconNE /></span>}
      </div>
    </>
  );

  return card.url ? (
    <a
      href={card.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flz-tile"
      style={cardStyle}
      aria-label={`${card.title}: ${stat?.followers ?? "unknown"} followers, ${stat?.posts ?? "unknown"} ${card.postsLabel}`}
      onClick={() => trackTelemetryEvent("social_open", "main", platform)}
    >
      {inner}
    </a>
  ) : (
    <div style={cardStyle}>{inner}</div>
  );
}

function MessagePanel() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/portfolio/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, source: "main" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The message could not be sent.");
      setName("");
      setEmail("");
      setMessage("");
      setStatus("success");
    } catch (sendError) {
      setStatus("error");
      setError(sendError instanceof Error ? sendError.message : "The message could not be sent.");
    }
  };

  return (
    <section className="flz-message-panel flz-view" aria-labelledby="flz-message-title">
      <div className="flz-message-intro">
        <h2 id="flz-message-title">Have a project in mind?</h2>
        <p>Send a short note. I’ll reply by email.</p>
      </div>
      <form className="flz-message-form" onSubmit={sendMessage}>
        <div className="flz-message-fields">
          <label>
            <span>Name <span style={{ color: "var(--flz-text-muted)" }}>(optional)</span></span>
            <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={100} placeholder="Your name" />
          </label>
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={100} placeholder="you@example.com" required />
          </label>
        </div>
        <label>
          <span>Message</span>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} placeholder="Tell me what you’re building…" required />
        </label>
        <div className="flz-message-action">
          <p className={`flz-message-status ${status}`} role="status" aria-live="polite">
            {status === "success" ? "Message sent — thank you." : status === "error" ? error : (
              <>Stored only to reply to you. <Link href="/privacy#data">Privacy policy</Link></>
            )}
          </p>
          <button className="flz-btn-solid" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Send message"}
          </button>
        </div>
      </form>
    </section>
  );
}

function MainSlab({
  daysBuilding,
  settings,
  activeFilter,
  setActiveFilter,
  filters,
  visibleProjects,
  activeView,
  setActiveView,
  theme,
  onThemeToggle,
  socialStats,
}: {
  daysBuilding: string;
  settings: Record<string, string>;
  activeFilter: string;
  setActiveFilter: (f: string) => void;
  filters: string[];
  visibleProjects: typeof PROJECTS;
  activeView: MainView;
  setActiveView: (view: MainView) => void;
  theme: Theme;
  onThemeToggle: () => void;
  socialStats: SocialStat[];
}) {
  const [projectPage, setProjectPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(visibleProjects.length / PROJECTS_PER_PAGE));
  const safeProjectPage = Math.min(projectPage, pageCount - 1);

  const followers = settings.followers_count?.trim();
  const wishlists = settings.wishlists_count?.trim();
  const stats = [
    { label: "Building since", value: daysBuilding, unit: "days" },
    ...(followers ? [{ label: "Followers", value: followers, unit: undefined }] : []),
    ...(wishlists ? [{ label: "Wishlists", value: wishlists, unit: undefined }] : []),
  ];

  const slabStyle: React.CSSProperties = {
    position: "relative", flex: 1, minWidth: 0,
    display: "flex", flexDirection: "column", gap: 22,
    padding: 28, boxSizing: "border-box",
    borderRadius: 28, overflow: "hidden",
  };

  const wellStyle: React.CSSProperties = {
    flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: 14,
  };

  const tiles = visibleProjects.slice(
    safeProjectPage * PROJECTS_PER_PAGE,
    safeProjectPage * PROJECTS_PER_PAGE + PROJECTS_PER_PAGE,
  );
  // A wide lead tile only reads as deliberate when there is a grid behind it to
  // play against; below three tiles it just leaves a hole.
  const leadSpans = tiles.length >= 3;

  return (
    <div className="flz-slab" style={slabStyle}>
      {/* Nav row */}
      <div className="flz-enter" style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <span style={{ font: `400 26px/1 var(--flz-font-display)`, letterSpacing: "-.005em", color: "var(--flz-text-primary)" }}>
          Flz<span style={{ color: "var(--flz-text-muted)" }}>.</span>works
        </span>
        <button
          type="button"
          className="flz-theme-toggle"
          onClick={onThemeToggle}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          aria-pressed={theme === "dark"}
        >
          <span className="flz-theme-toggle-icon" aria-hidden="true">
            {theme === "dark" ? <IconSun /> : <IconMoon />}
          </span>
          <span>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
        <Link href="/autosalon" className="flz-autosalon-cta">
          <span>Enter autosalon</span>
          <IconNE />
        </Link>
      </div>

      {/* Hero row */}
      <div className="flz-enter flz-hero" style={{ "--flz-delay": "70ms", display: "flex", alignItems: "flex-end", gap: 32, flexWrap: "wrap" } as React.CSSProperties}>
        <div style={{ flex: "1 1 420px", minWidth: 0 }}>
          {/* Headline, sub-line, counters and the Discord link are edited in /studio. */}
          <h1 style={{ margin: 0, font: `400 clamp(2.5rem,1.6rem + 3.3vw,4rem)/1.03 var(--flz-font-display)`, letterSpacing: "-.014em", color: "var(--flz-text-primary)", whiteSpace: "pre-line", textWrap: "balance" }}>
            {settings.hero_headline?.trim() || "Munca is now\nin development."}
          </h1>
          {/* No fallback copy: an empty sub-line in /studio hides the paragraph. */}
          {settings.hero_subhead?.trim() && (
            <p style={{ margin: "14px 0 0", maxWidth: "48ch", font: `400 15px/1.55 var(--flz-font-sans)`, color: "var(--flz-text-secondary)" }}>
              {settings.hero_subhead.trim()}
            </p>
          )}
        </div>
        {/* Only counters with a real number earn a tile. A grid of placeholders
            reading "soon" is not a statistic, it is furniture. */}
        {stats.length > 0 && (
          <div className="flz-stats" style={{ flexShrink: 0, display: "flex", gap: 12 }}>
            {stats.map(stat => (
              <StatTile key={stat.label} label={stat.label} value={stat.value} unit={stat.unit} />
            ))}
          </div>
        )}
      </div>

      {/* Filter chips — only once there is something to choose between */}
      {filters.length > 2 && (
      <div className="flz-enter flz-filters" style={{ "--flz-delay": "140ms", display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" } as React.CSSProperties}>
        {filters.map(f => (
          <button key={f} type="button" aria-pressed={activeFilter === f && activeView === "projects"} className={`flz-chip${activeFilter === f && activeView === "projects" ? " active" : ""}`} onClick={() => { setProjectPage(0); setActiveFilter(f); setActiveView("projects"); }}>{f}</button>
        ))}
      </div>
      )}

      {/* Main content: routing well + right column */}
      <div className="flz-enter flz-main-area" style={{ "--flz-delay": "200ms", flex: 1, minHeight: 0, display: "flex", gap: 18 } as React.CSSProperties}>

        {/* Routing well (sunken glass) */}
        <div style={wellStyle}>
          {activeView === "message" ? <MessagePanel /> : (
            <div className="flz-view" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="flz-pager-row" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {/* Edited in /studio; falls back to "Featured". */}
                <div style={{ flexShrink: 0, whiteSpace: "nowrap", font: `400 22px/1.1 var(--flz-font-display)`, letterSpacing: "-.006em", color: "var(--flz-text-primary)" }}>{settings.projects_heading?.trim() || "Featured"}</div>
                {pageCount > 1 && (
                  <span style={{ flexShrink: 0, whiteSpace: "nowrap", font: `400 12px/1 var(--flz-font-mono)`, color: "var(--flz-text-muted)" }}>{safeProjectPage + 1}/{pageCount}</span>
                )}
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button className="flz-iconbtn glass" aria-label="Previous" disabled={safeProjectPage === 0} onClick={() => setProjectPage(Math.max(0, safeProjectPage - 1))}><IconArrow size={15} rotate /></button>
                  <button className="flz-iconbtn glass" aria-label="Next" disabled={safeProjectPage >= pageCount - 1} onClick={() => setProjectPage(Math.min(pageCount - 1, safeProjectPage + 1))}><IconArrow size={15} /></button>
                </div>
              </div>
              <div className="flz-grid" style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gridTemplateRows: "1fr 1fr", gap: 12 }}>
                {tiles.length === 0 && <div className="flz-empty-state" style={{ gridColumn: "1 / -1" }}>Nothing published here yet.</div>}
                {tiles.map((p, i) => (
                  <div
                    key={`${activeFilter}-${p.title ? p.id : `empty${i}`}`}
                    className={`flz-tile-in${i === 0 && leadSpans ? " flz-tile-lead" : ""}`}
                    style={{ "--flz-delay": `${i * 45}ms`, display: "flex", minWidth: 0, minHeight: 0, gridColumn: i === 0 && leadSpans ? "span 2" : undefined } as React.CSSProperties}
                  >
                    <ProjectTile project={p as typeof PROJECTS[number]} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flz-sidebar" style={{ flexShrink: 0, width: 360, display: "flex", flexDirection: "column", gap: 18, minHeight: 0, height: "100%" }}>

          {/* Featured card */}
          <div className="flz-tile flz-featured" style={{ flex: "1.25", minHeight: 320, display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 28, background: "#1c1a17", border: "1px solid rgba(255,255,255,.10)", textDecoration: "none", color: "inherit" }}>
            <div style={{ flex: 1, minHeight: 120, position: "relative", overflow: "hidden" }}>
              <ExternalEmbed
                src="https://sketchfab.com/models/cbb1b3572d0545f8a8fdbdb09836ebd6/embed?autostart=1&preload=1&transparent=1&ui_hint=0"
                title="Pentagon Athaan 2026 — live 3D model"
                provider="Sketchfab (Epic Games)"
                storageKey="sketchfab"
                playButton
                externalUrl="https://sketchfab.com/models/cbb1b3572d0545f8a8fdbdb09836ebd6"
                allow="autoplay; fullscreen; xr-spatial-tracking"
                iframeStyle={{ position: "absolute", inset: 0, zIndex: 6, width: "100%", height: "100%", border: "none" }}
              >
                {/* Local render shown until the visitor presses play; nothing is requested from Sketchfab before that.
                    The car sits at 67%/63% of the transparent render, so that point is pinned to the card centre. */}
                {/* eslint-disable-next-line @next/next/no-img-element -- static poster behind the consent gate */}
                <img src="/models/Effect/Athaan.webp" alt="Pentagon Athaan 2026 render" style={{ position: "absolute", width: "205%", maxWidth: "none", height: "auto", left: "50%", top: "50%", transform: "translate(-67%, -63%)" }} />
              </ExternalEmbed>
              {/* Title floats over the viewer; pointer-events off so the model stays draggable. */}
              <div style={{ position: "absolute", top: 12, left: 12, right: 12, zIndex: 7, pointerEvents: "none" }}>
                <div style={{ width: "fit-content", padding: "5px 10px", borderRadius: 12, background: "var(--flz-glass)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", font: `400 22px/1.14 var(--flz-font-display)`, letterSpacing: "-.006em", color: "var(--flz-text-primary)" }}>Pentagon Athaan 2026</div>              </div>
            </div>
          </div>

          <SocialStatsCard platform="instagram" stat={socialStats.find((stat) => stat.platform === "instagram")} />
          <SocialStatsCard platform="tiktok" stat={socialStats.find((stat) => stat.platform === "tiktok")} />
          <SocialStatsCard platform="youtube" stat={undefined} />
          {/* Discord card — the invite comes from the studio's site settings */}
          <DiscordCard url={settings.discord_url?.trim() || ""} />
        </div>
      </div>

      <footer className="flz-enter flz-footer" style={{ "--flz-delay": "270ms" } as React.CSSProperties}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>© 2026 Bence Flosz · FLZ Works</span>
          <div className="flz-footer-social">
            <a href="https://www.instagram.com/vision.flz/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" onClick={() => trackTelemetryEvent("social_open", "main", "instagram")}><IconInstagram /></a>
            <a href="https://www.tiktok.com/@vision.flz" target="_blank" rel="noopener noreferrer" aria-label="TikTok" onClick={() => trackTelemetryEvent("social_open", "main", "tiktok")}><IconTikTok /></a>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 14px" }}>
          <LegalLinks />
          <TelemetryConsent site="main" inline />
        </div>
      </footer>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PortfolioHubPage() {
  const [daysBuilding, setDaysBuilding] = useState("—");
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeView, setActiveView] = useState<MainView>("projects");
  const [contactOpen, setContactOpen] = useState(false);
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

  // Dynamic projects & settings state from DB
  const [projectsList, setProjectsList] = useState<typeof PROJECTS>(PROJECTS);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [socialStats, setSocialStats] = useState<SocialStat[]>([]);

  // Follower and post counters. The server refreshes from the platform APIs at
  // most every five minutes; polling keeps an open tab current.
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/flz/social-stats")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!cancelled && Array.isArray(data?.stats)) setSocialStats(data.stats);
        })
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(load, 5 * 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    // Fetch live projects & admin status
    fetch("/api/flz/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data?.isAdmin) setIsAdmin(true);
        if (data?.projects && Array.isArray(data.projects)) {
          const mapped = data.projects.filter((p: { visible?: boolean }) => p.visible !== false).map((p: {
            id: number;
            tools: string;
            title: string;
            category: string;
            publishedAt: string | null;
            visible?: boolean;
            gradient?: string | null;
            linkUrl?: string | null;
            imageUrl?: string | null;
            body?: string | null;
          }) => ({
            id: p.id,
            tools: p.tools,
            title: p.title,
            cat: p.category,
            age: relativeAge(p.publishedAt),
            grad: p.gradient || "radial-gradient(120% 130% at 24% 6%,rgba(216,195,166,.62),rgba(120,96,72,.12) 55%,transparent 76%)",
            link: p.linkUrl || "",
            img: p.imageUrl || "",
            body: p.body || "",
          }));
          setProjectsList(mapped);
        }
      })
      .catch(() => {});

    // Fetch site settings
    fetch("/api/flz/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings) {
          setSettings(data.settings);
          if (data.settings.building_start_date) {
            const start = new Date(data.settings.building_start_date).getTime();
            if (!isNaN(start)) {
              setDaysBuilding(String(Math.floor((Date.now() - start) / 86400000)));
              return;
            }
          }
        }
        const defaultStart = new Date("2023-09-01T00:00:00").getTime();
        setDaysBuilding(String(Math.floor((Date.now() - defaultStart) / 86400000)));
      })
      .catch(() => {
        const defaultStart = new Date("2023-09-01T00:00:00").getTime();
        setDaysBuilding(String(Math.floor((Date.now() - defaultStart) / 86400000)));
      });
  }, []);

  useEffect(() => {
    if (!contactOpen) return;
    const recordView = () => trackTelemetryEvent("vcard_view", "main");
    recordView();
    window.addEventListener(TELEMETRY_READY_EVENT, recordView);
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setContactOpen(false); };
    document.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener(TELEMETRY_READY_EVENT, recordView);
      document.removeEventListener("keydown", handler);
    };
  }, [contactOpen]);

  const visibleProjects =
    activeFilter === "All" ? projectsList : projectsList.filter(p => p.cat === activeFilter);
  // Only categories that actually hold something get a chip. CATEGORY_ORDER is
  // an ordering preference, not a promise that all five exist — offering a
  // filter that lands on an empty grid is chrome pretending to be content.
  const projectCategories = Array.from(new Set(projectsList.map((project) => project.cat.trim()).filter(Boolean)));
  const categories = [
    ...CATEGORY_ORDER.filter((category) => projectCategories.includes(category)),
    ...projectCategories.filter((category) => !CATEGORY_ORDER.includes(category)).sort((a, b) => a.localeCompare(b)),
  ];
  const filters = ["All", ...categories];

  const toggleTheme = () => {
    setStoredTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="flz-hub-root" data-theme={theme} style={{
      minHeight: "100vh",
      position: "relative",
      // Vertical overflow must stay scrollable: five project tiles plus the hero
      // exceed a laptop viewport, and clipping them hid content outright.
      overflowX: "hidden",
      background: "#100e0c",
      fontFamily: "var(--flz-font-sans), sans-serif",
    }}>
      <style dangerouslySetInnerHTML={{ __html: DS_TOKENS }} />

      {/* One key light, parked above the headline, and a warm bounce off the
          bottom-right to keep the glass from reading flat. Static on purpose:
          the glass has something to refract without the page fidgeting. */}
      <div className="flz-ambient" aria-hidden="true">
        <div className="flz-orb flz-orb-key" />
        <div className="flz-orb flz-orb-bounce" />
        <div className="flz-grain" />
      </div>

      {/* Admin Quick Editor Badge (Only visible when logged in as Admin) */}
      {isAdmin && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 60 }}>
          <a
            href="/studio/admin"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 999,
              background: "rgba(6, 182, 212, 0.22)",
              border: "1px solid rgba(6, 182, 212, 0.45)",
              color: "#38bdf8",
              font: "600 12px/1 var(--flz-font-mono)",
              textTransform: "uppercase",
              letterSpacing: ".08em",
              backdropFilter: "blur(16px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              textDecoration: "none",
              transition: "transform .2s, background .2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#38bdf8" }} />
            ⚡ Edit FLZ Works
          </a>
        </div>
      )}

      {/* Contact card floater */}
      {contactOpen && (
        <div className="flz-backdrop" style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.4)", backdropFilter: "blur(6px)" }}
          onClick={() => setContactOpen(false)}>
          <div id="flz-id-card-dialog" className="flz-modal" role="dialog" aria-modal="true" aria-label="FLZ Works ID card" style={{ width: 560, position: "relative" }} onClick={e => e.stopPropagation()}>
            <button
              autoFocus
              onClick={() => setContactOpen(false)}
              aria-label="Close contact card"
              className="flz-modal-close"
              style={{ position: "absolute", top: -14, right: -14, zIndex: 10, width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.28)", color: "#F4F2EF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", font: `500 18px/1 var(--flz-font-sans)` }}
            >×</button>
            <ContactCard />
          </div>
        </div>
      )}

      {/* Content */}
      <main lang="en" className="flz-content" style={{ position: "relative", zIndex: 1, display: "flex", gap: 24, padding: "40px 44px", minHeight: "100vh", boxSizing: "border-box" }}>
        <IconRail contactOpen={contactOpen} setContactOpen={setContactOpen} activeView={activeView} setActiveView={setActiveView} />
        <MainSlab
          daysBuilding={daysBuilding}
          settings={settings}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          filters={filters}
          visibleProjects={visibleProjects}
          activeView={activeView}
          setActiveView={setActiveView}
          theme={theme}
          onThemeToggle={toggleTheme}
          socialStats={socialStats}
        />
      </main>
    </div>
  );
}
