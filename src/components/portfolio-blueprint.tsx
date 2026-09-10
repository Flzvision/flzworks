"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ExternalEmbed } from "@/components/external-embed";
import { LegalLinks } from "@/components/legal-links";
import type { PortfolioArticleWithImages } from "@/lib/portfolio-sync";
import type { SocialEntry, SocialPlatform } from "@/lib/social-config";

const SKETCHFAB_MODEL_ID = "cbb1b3572d0545f8a8fdbdb09836ebd6";
const SKETCHFAB_SRC = `https://sketchfab.com/models/${SKETCHFAB_MODEL_ID}/embed?autostart=0&preload=1&transparent=1&ui_hint=0`;
const HERO_POSTER = "/models/Effect/Athaan.webp";

// Sticky top-bar height used to offset in-page anchor scrolling + scroll-spy.
const BAR_OFFSET = 54;

type SectionId = "featured" | "automotive" | "social" | "contact";

const NAV_ITEMS: { key: string; label: string; id: SectionId }[] = [
  { key: "F", label: "FEATURED", id: "featured" },
  { key: "A", label: "3D & ENVIRONMENTS", id: "automotive" },
  { key: "S", label: "SOCIAL", id: "social" },
  { key: "C", label: "CONTACT", id: "contact" },
];

/** Build the drafting sheet label: `SHT 007 — MIRSAIREN C`. */
function sheetLabel(index: number, title: string): string {
  const num = String(index + 1).padStart(3, "0");
  return `SHT ${num} — ${title.toUpperCase()}`;
}

function mediaUrl(folder: string, file: string, width: number): string {
  return `/api/portfolio/media/${folder}/${file}?w=${width}`;
}

interface PortfolioBlueprintProps {
  articles: PortfolioArticleWithImages[];
  transmissions: SocialEntry[];
}

interface GalleryState {
  folderName: string;
  images: string[];
  index: number;
}

export function PortfolioBlueprint({ articles, transmissions }: PortfolioBlueprintProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("featured");
  const [selected, setSelected] = useState<{ article: PortfolioArticleWithImages; index: number } | null>(null);
  const [gallery, setGallery] = useState<GalleryState | null>(null);

  const scrollToSection = useCallback((id: SectionId) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - BAR_OFFSET;
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
  }, []);

  // Keyboard shortcuts: F / A / S / C jump to sections.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const match = NAV_ITEMS.find((item) => item.key === e.key.toUpperCase());
      if (match) {
        e.preventDefault();
        scrollToSection(match.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scrollToSection]);

  // Scroll-spy: the last section whose top has passed under the bar is active.
  useEffect(() => {
    const ids = NAV_ITEMS.map((item) => item.id);
    const update = () => {
      let current: SectionId = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= BAR_OFFSET + 8) {
          current = id;
        }
      }
      setActiveSection(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Lock body scroll while an overlay is open.
  useEffect(() => {
    if (selected || gallery) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selected, gallery]);

  // Lightbox keyboard navigation.
  useEffect(() => {
    if (!gallery) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGallery(null);
      else if (e.key === "ArrowRight") {
        setGallery((p) => (p ? { ...p, index: (p.index + 1) % p.images.length } : null));
      } else if (e.key === "ArrowLeft") {
        setGallery((p) => (p ? { ...p, index: (p.index - 1 + p.images.length) % p.images.length } : null));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gallery]);

  const sheetCount = articles.length;

  return (
    <div className="bp-root">
      {/* ── 1. Top bar ── */}
      <header className="bp-topbar">
        <button
          type="button"
          className="bp-logo"
          onClick={() => scrollToSection("featured")}
          aria-label="FLZ.WORKS — back to top"
        >
          FLZ.WORKS
        </button>
        <nav className="bp-nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className={`bp-nav-item${activeSection === item.id ? " is-active" : ""}`}
              aria-current={activeSection === item.id ? "true" : undefined}
            >
              <span className="bp-nav-key">[{item.key}]</span> {item.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── 2. Live 3D hero (full-bleed) ── */}
      <section id="featured" className="bp-hero" aria-label="Featured — live 3D model">
        <SketchfabHero />
        <div className="bp-hero-title">
          <div className="bp-hero-eyebrow">
            PENTAGON ATHAAN 2026 · LIVE MODEL — DRAG TO ORBIT
          </div>
          <h1 className="bp-hero-headline">
            DRAWN, MODELED, RENDERED<span className="bp-accent"></span>
          </h1>
        </div>
      </section>

      {/* ── 3. Works filmstrip (Sheet index) ── */}
      <Filmstrip articles={articles} onSelect={(article, index) => setSelected({ article, index })} />

      {/* ── 4. Transmissions (social embed strip) ── */}
      <section id="social" className="bp-transmissions" aria-label="Transmissions — social">
        <div className="bp-section-label bp-accent">
          ■ TRANSMISSIONS — X / IG / TIKTOK / LINKEDIN
        </div>
        <div className="bp-transmissions-grid">
          {transmissions.map((t) => (
            <TransmissionCard key={t.platform} entry={t} />
          ))}
        </div>
      </section>

      {/* ── 5. Title-block footer ── */}
      <footer id="contact" className="bp-footer">
        <div className="bp-titleblock">
          <div className="bp-titleblock-cell">
            <div className="bp-titleblock-label">DRAWN BY</div>
            <div className="bp-titleblock-value">BENCE FLOSZ</div>
          </div>
          <div className="bp-titleblock-cell">
            <div className="bp-titleblock-label">STUDIO</div>
            <div className="bp-titleblock-value">FLZ WORKS</div>
          </div>
          <div className="bp-titleblock-cell">
            <div className="bp-titleblock-label">DATE</div>
            <div className="bp-titleblock-value">2026</div>
          </div>
          <div className="bp-titleblock-cell">
            <div className="bp-titleblock-label">LEGAL</div>
            <div className="bp-titleblock-value">
              <LegalLinks />
            </div>
          </div>
        </div>
        <div className="bp-substrip">
          <a href="/studio" className="bp-substrip-link">INTERNAL · STUDIO EDITOR ↗</a>
        </div>
      </footer>

      {/* ── Project detail (sheet) modal ── */}
      {selected && (
        <ProjectModal
          article={selected.article}
          index={selected.index}
          onClose={() => setSelected(null)}
          onOpenImage={(imgIndex) =>
            setGallery({
              folderName: selected.article.folderName,
              images: selected.article.images,
              index: imgIndex,
            })
          }
        />
      )}

      {/* ── Fullscreen image lightbox ── */}
      {gallery && (
        <Lightbox
          gallery={gallery}
          onClose={() => setGallery(null)}
          onPrev={() =>
            setGallery((p) => (p ? { ...p, index: (p.index - 1 + p.images.length) % p.images.length } : null))
          }
          onNext={() =>
            setGallery((p) => (p ? { ...p, index: (p.index + 1) % p.images.length } : null))
          }
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Live 3D hero — lazy-load the Sketchfab iframe once it scrolls into view;
   show a static poster frame until then so first paint stays cheap.
   ───────────────────────────────────────────────────────────────────────── */
function SketchfabHero() {
  // The poster stays until the visitor opts in to loading the Sketchfab viewer.
  return (
    <div className="bp-hero-media">
      <ExternalEmbed
        src={SKETCHFAB_SRC}
        title="Pentagon Athaan 2026 — live 3D model"
        provider="Sketchfab (Epic Games)"
        storageKey="sketchfab"
        allow="autoplay; fullscreen; xr-spatial-tracking"
        iframeClassName="bp-hero-iframe"
      >
        <div className="bp-hero-poster">
          <Image
            src={HERO_POSTER}
            alt="Pentagon Athaan 2026 concept car render"
            fill
            priority
            sizes="100vw"
            className="bp-hero-poster-img"
          />
        </div>
      </ExternalEmbed>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Works filmstrip — horizontally scrolling sheet index of every project.
   ───────────────────────────────────────────────────────────────────────── */
function Filmstrip({
  articles,
  onSelect,
}: {
  articles: PortfolioArticleWithImages[];
  onSelect: (article: PortfolioArticleWithImages, index: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // Fade the "SCROLL →" hint once the user moves the filmstrip.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollLeft > 12);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Optional drag-to-scroll for pointer devices.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let down = false;
    let startX = 0;
    let startLeft = 0;
    const onDown = (e: PointerEvent) => {
      down = true;
      startX = e.clientX;
      startLeft = el.scrollLeft;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) el.classList.add("is-dragging");
      el.scrollLeft = startLeft - dx;
    };
    const onUp = () => {
      down = false;
      // Defer clearing so the click that follows a drag is suppressed.
      requestAnimationFrame(() => el.classList.remove("is-dragging"));
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <section id="automotive" className="bp-filmstrip" aria-label="Sheet index — works & log">
      <div className="bp-filmstrip-head">
        <span className="bp-section-label bp-accent">■ SHEET INDEX — WORKS &amp; LOG</span>
        <span className={`bp-scroll-hint${scrolled ? " is-faded" : ""}`}>SCROLL →</span>
      </div>
      <div className="bp-filmstrip-track" ref={trackRef}>
        {articles.map((article, i) => {
          const firstImage = article.images[0];
          const src = firstImage ? mediaUrl(article.folderName, firstImage, 640) : null;
          return (
            <button
              key={article.id}
              type="button"
              className="bp-sheet"
              onClick={() => {
                if (trackRef.current?.classList.contains("is-dragging")) return;
                onSelect(article, i);
              }}
            >
              <div className="bp-sheet-img">
                {src ? (
                  <Image
                    src={src}
                    alt={article.title}
                    fill
                    sizes="250px"
                    className="bp-sheet-img-el"
                    unoptimized
                    draggable={false}
                  />
                ) : (
                  <div className="bp-sheet-img-empty">NO IMAGE</div>
                )}
              </div>
              <div className="bp-sheet-caption">{sheetLabel(i, article.title)}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Project detail modal — blueprint "sheet" view of a single project.
   ───────────────────────────────────────────────────────────────────────── */
function ProjectModal({
  article,
  index,
  onClose,
  onOpenImage,
}: {
  article: PortfolioArticleWithImages;
  index: number;
  onClose: () => void;
  onOpenImage: (imgIndex: number) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="bp-modal-scrim" onClick={onClose} role="dialog" aria-modal="true" aria-label={article.title}>
      <div className="bp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bp-modal-head">
          <div>
            <div className="bp-modal-eyebrow">
              {sheetLabel(index, article.title)}
              {article.date && article.date !== "N/A" ? ` · ${article.date}` : ""}
            </div>
            <div className="bp-modal-title">{article.title}</div>
          </div>
          <button type="button" className="bp-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="bp-modal-body">
          {article.description && (
            <p className="bp-modal-desc">{article.description}</p>
          )}
          {article.images.length > 0 ? (
            <>
              <div className="bp-modal-plate">
                PLATE INDEX — {article.images.length} SHEET{article.images.length === 1 ? "" : "S"}
              </div>
              <div className="bp-modal-grid">
                {article.images.map((img, idx) => (
                  <button
                    key={img}
                    type="button"
                    className="bp-modal-thumb"
                    onClick={() => onOpenImage(idx)}
                    aria-label={`Open image ${idx + 1}`}
                  >
                    <Image
                      src={mediaUrl(article.folderName, img, 800)}
                      alt={`${article.title} — ${idx + 1}`}
                      fill
                      sizes="(max-width: 768px) 50vw, 320px"
                      className="bp-modal-thumb-img"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="bp-modal-empty">NO SHEETS ON FILE</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Fullscreen image lightbox.
   ───────────────────────────────────────────────────────────────────────── */
function Lightbox({
  gallery,
  onClose,
  onPrev,
  onNext,
}: {
  gallery: GalleryState;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const current = gallery.images[gallery.index];
  return (
    <div className="bp-lightbox" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Image ${gallery.index + 1} of ${gallery.images.length}`}>
      <button type="button" className="bp-lightbox-close" onClick={onClose} aria-label="Close">
        ✕
      </button>
      <button
        type="button"
        className="bp-lightbox-nav bp-lightbox-prev"
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        aria-label="Previous"
      >
        ←
      </button>
      <button
        type="button"
        className="bp-lightbox-nav bp-lightbox-next"
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        aria-label="Next"
      >
        →
      </button>
      <div className="bp-lightbox-stage" onClick={(e) => e.stopPropagation()}>
        <Image
          src={mediaUrl(gallery.folderName, current, 1920)}
          alt={`Project image ${gallery.index + 1} of ${gallery.images.length}`}
          fill
          sizes="100vw"
          className="bp-lightbox-img"
          unoptimized
        />
      </div>
      <div className="bp-lightbox-counter">
        {gallery.index + 1} / {gallery.images.length}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Transmissions — one card per platform showing the latest post as an image
   that links out to the post. Falls back to the drafting placeholder when no
   image is configured for that platform (managed in the Studio editor).
   ───────────────────────────────────────────────────────────────────────── */
const PLACEHOLDER_TAG: Record<SocialPlatform, string> = {
  instagram: "ig_embed",
  tiktok: "tt_embed",
  linkedin: "li_embed",
};

function TransmissionCard({ entry }: { entry: SocialEntry }) {
  const hasImage = Boolean(entry.imageUrl);
  const href = entry.postUrl || undefined;

  return (
    <div className="bp-transmission">
      <div className="bp-transmission-label">{entry.label}</div>
      {hasImage ? (
        <a
          className="bp-transmission-media"
          href={href}
          target={href ? "_blank" : undefined}
          rel={href ? "noreferrer" : undefined}
          aria-label={`${entry.label} — latest post`}
        >
          <Image
            src={entry.imageUrl}
            alt={`${entry.label} latest post`}
            fill
            sizes="(max-width: 520px) 100vw, (max-width: 900px) 50vw, 25vw"
            className="bp-transmission-img"
            unoptimized
          />
        </a>
      ) : (
        <div className="bp-transmission-placeholder">{PLACEHOLDER_TAG[entry.platform]}</div>
      )}
    </div>
  );
}
