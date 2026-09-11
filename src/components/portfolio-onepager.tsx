"use client";

import { useState, useEffect } from "react";
import type { InstagramMediaItem } from "@/lib/instagram";
import Image from "next/image";
import Link from "next/link";
import type { PortfolioArticleWithImages } from "@/lib/portfolio-sync";
import { Image as ImageIcon, X } from "lucide-react";
import { ExternalEmbed } from "@/components/external-embed";
import { LegalLinks } from "@/components/legal-links";
import { TelemetryConsent } from "@/components/telemetry-consent";
import { ThemeCanvas } from "@/components/theme-canvas";
import { TELEMETRY_READY_EVENT, trackTelemetryEvent } from "@/lib/telemetry-client";
import type { TelemetrySite } from "@/lib/telemetry";
import { PUBLIC_CONTACT_PROFILE, PUBLIC_CONTACT_QR_SRC, PUBLIC_CONTACT_ROWS } from "@/lib/public-contact-profile";

const CATEGORY_LABELS: Record<string, string> = {
  CAR_DESIGN: "3D & Environments",
  BRICKWORKS: "Brickworks",
  GAMES: "Games",
  MEDIA: "Media",
  OTHER: "Other",
};

type ArchiveCategory = "ALL" | "AUTOMOTIVE" | "BRICKWORKS" | "GAMES" | "MEDIA";

interface PortfolioOnepagerProps {
  instagramMedia: InstagramMediaItem[];
  articles: PortfolioArticleWithImages[];
  forceNamecardOpen?: boolean;
}

export function PortfolioOnepager({ instagramMedia, articles, forceNamecardOpen }: PortfolioOnepagerProps) {
  const telemetrySite: TelemetrySite = forceNamecardOpen ? "main" : "autosalon";
  const [selectedArticle, setSelectedArticle] = useState<PortfolioArticleWithImages | null>(null);
  const [activeGallery, setActiveGallery] = useState<{
    folderName: string;
    images: string[];
    index: number;
  } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ArchiveCategory>("ALL");
  const [uiHidden, setUiHidden] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [imageAlign, setImageAlign] = useState<"fit" | "crop">("crop");

  // Namecard and Contact Form states
  const [isNamecardOpen, setIsNamecardOpen] = useState(forceNamecardOpen || false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [formStatus, setFormStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [formError, setFormError] = useState("");

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;

    // Validate the email format when one is provided so replies aren't lost.
    const email = contactEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormStatus("error");
      setFormError("Please enter a valid email address.");
      return;
    }

    setFormStatus("sending");
    setFormError("");

    try {
      const res = await fetch("/api/portfolio/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          message: contactMessage,
          source: "autosalon",
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to send email");
      }

      setFormStatus("success");
      setContactName("");
      setContactEmail("");
      setContactMessage("");
    } catch (err) {
      setFormStatus("error");
      setFormError(err instanceof Error ? err.message : "An error occurred.");
    }
  };

  const downloadVCard = () => {
    trackTelemetryEvent("vcard_download", telemetrySite);
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Flosz;Bence;Norbert;;",
      `FN:${PUBLIC_CONTACT_PROFILE.name}`,
      "ORG:FLZ Works",
      `TITLE:${PUBLIC_CONTACT_PROFILE.interest}`,
      `URL:${PUBLIC_CONTACT_PROFILE.webUrl}`,
      "END:VCARD"
    ].join("\n");

    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "bence_flosz.vcf");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };


  // Lock scroll when lightbox or detail modal is active
  useEffect(() => {
    if (activeGallery || selectedArticle) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeGallery, selectedArticle]);

  useEffect(() => {
    if (!isNamecardOpen) return;
    const recordView = () => trackTelemetryEvent("vcard_view", telemetrySite);
    recordView();
    window.addEventListener(TELEMETRY_READY_EVENT, recordView);
    return () => window.removeEventListener(TELEMETRY_READY_EVENT, recordView);
  }, [isNamecardOpen, telemetrySite]);

  // Escape closes the namecard and project dialogs (the lightbox handles its own keys).
  useEffect(() => {
    if (activeGallery || !(selectedArticle || (isNamecardOpen && !forceNamecardOpen))) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selectedArticle) setSelectedArticle(null);
      else setIsNamecardOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activeGallery, selectedArticle, isNamecardOpen, forceNamecardOpen]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!activeGallery) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveGallery(null);
      } else if (e.key === "ArrowRight") {
        setActiveGallery((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            index: (prev.index + 1) % prev.images.length,
          };
        });
      } else if (e.key === "ArrowLeft") {
        setActiveGallery((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            index: (prev.index - 1 + prev.images.length) % prev.images.length,
          };
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeGallery]);

  // Showroom mode: exit on Escape only (no hostile global click capture that
  // would swallow every interaction, including the 3D viewer drag). Let an open
  // modal/lightbox consume Escape first so a single press doesn't both close the
  // modal and drop showroom mode.
  useEffect(() => {
    if (!uiHidden) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selectedArticle || activeGallery || isNamecardOpen) return;
      setUiHidden(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [uiHidden, selectedArticle, activeGallery, isNamecardOpen]);

  // Global keyboard shortcuts: navigation ([F]/[S]/[C]) + showroom toggle ([H]).
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't hijack browser/OS shortcuts.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Ignore while typing in a field or an editable element.
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      // Ignore while a modal or the lightbox is open.
      if (selectedArticle || activeGallery || isNamecardOpen) return;

      switch (e.key.toLowerCase()) {
        case "f":
          scrollToSection("hero");
          break;
        case "s":
          scrollToSection("signals");
          break;
        case "c":
          document
            .getElementById("contact-form-section")
            ?.scrollIntoView({ behavior: "smooth" });
          break;
        case "h":
          setUiHidden((v) => !v);
          break;
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [selectedArticle, activeGallery, isNamecardOpen]);

  // IntersectionObserver to set active section for top bar highlights
  useEffect(() => {
    const sections = ["hero", "filmstrip", "signals", "contact-form-section", "contact"];
    const observers = sections.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(id);
            }
          });
        },
        { threshold: 0.2 }
      );
      observer.observe(el);
      return { observer, el, id };
    });
    return () => {
      observers.forEach((obs) => {
        if (obs) obs.observer.unobserve(obs.el);
      });
    };
  }, []);

  const publicArticles = articles.filter((a) => a.visible);
  const filteredArticles = publicArticles.filter((article) => {
    if (selectedCategory === "ALL") return true;
    if (selectedCategory === "AUTOMOTIVE") return article.category === "CAR_DESIGN";
    return article.category === selectedCategory;
  });

  return (
    <div className="bp-root min-h-screen selection:bg-[#ffd166]/20 selection:text-[#ffd166]">
      {/* --bp-bg, so iOS Safari carries the blueprint navy into the status bar
          and the bottom toolbar instead of banding the page with white. */}
      <ThemeCanvas color="#12284b" colorScheme="dark" />
      <TelemetryConsent site={telemetrySite} />
      {/* Header */}
      <header className={`bp-topbar ${uiHidden ? "hidden" : ""}`} style={{ display: uiHidden ? 'none' : 'flex' }}>
        <Link className="bp-logo" href="/" aria-label="FLZ.WORKS — open landing page">
          FLZ.WORKS
        </Link>
        <nav className="bp-nav">
          <button
            className={`bp-nav-item ${activeSection === "hero" ? "is-active" : ""}`}
            onClick={() => scrollToSection("hero")}
          >
            <span className="bp-nav-key">[F]</span> FEATURED
          </button>
          <button
            className={`bp-nav-item ${activeSection === "signals" ? "is-active" : ""}`}
            onClick={() => {
              scrollToSection("signals");
            }}
          >
            <span className="bp-nav-key">[S]</span> SIGNALS
          </button>
        </nav>
      </header>

      <main lang="en">
      {/* Hero Section */}
      <section id="hero" className="bp-hero">
        <div className="bp-hero-media">
          <ExternalEmbed
            src="https://sketchfab.com/models/cbb1b3572d0545f8a8fdbdb09836ebd6/embed?autostart=1&preload=1&transparent=1&ui_hint=0"
            title="Pentagon Athaan 2026 — live 3D model"
            provider="Sketchfab (Epic Games)"
            storageKey="sketchfab"
            allow="autoplay; fullscreen; xr-spatial-tracking"
            iframeClassName="bp-hero-iframe"
          />
        </div>
        <div className="bp-hero-title">
          <div className="bp-hero-eyebrow">PENTAGON ATHAAN 2026 · LIVE MODEL — DRAG TO ORBIT</div>
          <h1 className="bp-hero-headline">
            DRAWN, MODELED, RENDERED.
          </h1>
        </div>
      </section>

      {/* Sheet Index (Filmstrip) */}
      <section id="filmstrip" className="bp-filmstrip">
        <div className="bp-filmstrip-head">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="bp-section-label bp-accent">■ LOG</span>
            <div className="flex gap-2 font-mono text-[9px] tracking-wider uppercase">
              <button
                type="button"
                aria-pressed={selectedCategory === "ALL"}
                onClick={() => setSelectedCategory("ALL")}
                className={`px-2 py-0.5 border border-[#dce7f5]/20 hover:border-[#dce7f5]/50 transition-colors ${selectedCategory === "ALL" ? "text-[#ffd166] border-[#ffd166]" : "text-[#dce7f5]/80"
                  }`}
              >
                [ALL]
              </button>
              <button
                type="button"
                aria-pressed={selectedCategory === "AUTOMOTIVE"}
                onClick={() => setSelectedCategory("AUTOMOTIVE")}
                className={`px-2 py-0.5 border border-[#dce7f5]/20 hover:border-[#dce7f5]/50 transition-colors ${selectedCategory === "AUTOMOTIVE" ? "text-[#ffd166] border-[#ffd166]" : "text-[#dce7f5]/80"
                  }`}
              >
                [3D & ENVIRONMENTS]
              </button>
            </div>
          </div>
          <span className="bp-scroll-hint">SCROLL →</span>
        </div>

        {/* Relative wrapper for track and floating scroll helper */}
        <div className="relative">
          <div id="filmstrip-track" className="bp-filmstrip-track">
            {filteredArticles.map((article) => {
              const firstImg =
                article.images.length > 0
                  ? `/api/portfolio/media/${article.folderName}/${article.images[0]}?w=640`
                  : null;

              return (
                <button
                  key={article.id}
                  className="bp-sheet"
                  onClick={() => setSelectedArticle(article)}
                >
                  <div className="bp-sheet-img">
                    {firstImg ? (
                      <Image
                        src={firstImg}
                        alt={article.title}
                        fill
                        className="bp-sheet-img-el object-cover"
                        sizes="250px"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#dce7f5]/5 text-[#dce7f5]/75 text-[9px]">
                        NO IMAGE
                      </div>
                    )}
                  </div>
                  <div className="bp-sheet-caption">
                    {article.title.toUpperCase()}
                  </div>
                </button>
              );
            })}
            {filteredArticles.length === 0 && (
              <div className="py-12 text-[#dce7f5]/50 text-[10px] uppercase tracking-widest pl-8">
                No sheets in this category
              </div>
            )}
          </div>

          {/* Floating scroll button on the right side over the track */}
          <button
            className="bp-filmstrip-scroll-btn"
            onClick={() => {
              const track = document.getElementById("filmstrip-track");
              if (track) {
                const maxScroll = track.scrollWidth - track.clientWidth;
                if (track.scrollLeft < maxScroll - 15) {
                  track.scrollBy({ left: 300, behavior: "smooth" });
                } else {
                  scrollToSection("transmissions");
                }
              }
            }}
            aria-label="Scroll right or down"
          >
            →
          </button>
        </div>
      </section>

      {/* Transmissions — now an identical horizontal filmstrip */}
      <section id="signals" className="bp-filmstrip bp-transmissions">
        <div className="bp-filmstrip-head">
          <span className="bp-section-label bp-accent">■ SOCIALS — IG / TIKTOK / LINKEDIN</span>
          <span className="bp-scroll-hint">SCROLL →</span>
        </div>

        <div className="relative">
          <div id="transmissions-track" className="bp-filmstrip-track">
            {/* Instagram */}
            <a
              href="https://www.instagram.com/vision.flz/"
              target="_blank"
              rel="noopener noreferrer"
              className="bp-sheet"
              onClick={() => trackTelemetryEvent("social_open", telemetrySite, "instagram")}
            >
              <div className="bp-sheet-img">
                {instagramMedia.length > 0 && (instagramMedia[0].thumbnail_url || instagramMedia[0].media_url) ? (
                  <Image
                    src={instagramMedia[0].thumbnail_url || instagramMedia[0].media_url || ""}
                    alt="Instagram feed"
                    fill
                    className="bp-sheet-img-el object-cover"
                    sizes="250px"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#dce7f5]/5 transition-colors hover:bg-[#dce7f5]/10">
                    <span className="text-2xl font-bold tracking-wider text-[#ffd166]">IG</span>
                    <span className="text-[8px] opacity-80 mt-1">INSTAGRAM.COM/VISION.FLZ</span>
                  </div>
                )}
              </div>
              <div className="bp-sheet-caption">IG — @VISION.FLZ</div>
            </a>

            {/* TikTok */}
            <a
              href="https://www.tiktok.com/@vision.flz"
              target="_blank"
              rel="noopener noreferrer"
              className="bp-sheet"
              onClick={() => trackTelemetryEvent("social_open", telemetrySite, "tiktok")}
            >
              <div className="bp-sheet-img flex flex-col items-center justify-center bg-[#dce7f5]/5 transition-colors hover:bg-[#dce7f5]/10">
                <span className="text-2xl font-bold tracking-wider text-[#ffd166]">TT</span>
                <span className="text-[8px] opacity-80 mt-1">TIKTOK.COM/@VISION.FLZ</span>
              </div>
              <div className="bp-sheet-caption">TIKTOK — @VISION.FLZ</div>
            </a>

            {/* LinkedIn */}
            <a
              href="https://www.linkedin.com/in/bence-flosz-56134535a/"
              target="_blank"
              rel="noopener noreferrer"
              className="bp-sheet"
              onClick={() => trackTelemetryEvent("social_open", telemetrySite, "linkedin")}
            >
              <div className="bp-sheet-img flex flex-col items-center justify-center bg-[#dce7f5]/5 transition-colors hover:bg-[#dce7f5]/10">
                <span className="text-2xl font-bold tracking-wider text-[#ffd166]">LI</span>
                <span className="text-[8px] opacity-80 mt-1">LINKEDIN PROFILE</span>
              </div>
              <div className="bp-sheet-caption">LINKEDIN — BENCE FLOSZ</div>
            </a>
          </div>

          {/* Floating scroll button on the right side over the track */}
          <button
            className="bp-filmstrip-scroll-btn"
            onClick={() => {
              const track = document.getElementById("transmissions-track");
              if (track) {
                const maxScroll = track.scrollWidth - track.clientWidth;
                if (track.scrollLeft < maxScroll - 15) {
                  track.scrollBy({ left: 300, behavior: "smooth" });
                } else {
                  scrollToSection("contact");
                }
              }
            }}
            aria-label="Scroll right or down"
          >
            →
          </button>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact-form-section" className="bp-contact-form-sec">
        <div className="bp-form-container">
          <div className="bp-section-label bp-accent mb-4">■ SEND A MESSAGE</div>
          <form onSubmit={handleSendEmail} className="bp-form-technical-table">
            <div className="bp-form-row font-mono">
              <div className="bp-form-cell">
                <label htmlFor="contact-name" className="bp-form-cell-label">NAME</label>
                <input
                  id="contact-name"
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="YOUR NAME"
                  className="bp-form-cell-input"
                  maxLength={100}
                />
              </div>
              <div className="bp-form-cell">
                <label htmlFor="contact-email" className="bp-form-cell-label">EMAIL (OPTIONAL — NEEDED FOR A REPLY)</label>
                <input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="YOUR.EMAIL@DOMAIN.COM"
                  className="bp-form-cell-input"
                  maxLength={100}
                />
              </div>
            </div>
            <div className="bp-form-row font-mono">
              <div className="bp-form-cell full-width">
                <label htmlFor="contact-message" className="bp-form-cell-label">MESSAGE</label>
                <textarea
                  id="contact-message"
                  required
                  rows={4}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="WRITE YOUR MESSAGE HERE..."
                  className="bp-form-cell-textarea"
                  maxLength={5000}
                />
              </div>
            </div>
            <div className="bp-form-submit-row font-mono">
              <button type="submit" disabled={formStatus === "sending"} className="bp-form-submit-btn">
                {formStatus === "sending" ? "SENDING..." : "SEND MESSAGE →"}
              </button>
              {formStatus === "success" && (
                <span className="bp-form-status-msg success">
                  MESSAGE SENT SUCCESSFULLY.
                </span>
              )}
              {formStatus === "error" && (
                <span className="bp-form-status-msg error" role="alert">
                  ERROR: {formError.toUpperCase()}
                </span>
              )}
            </div>
          </form>
          <p className="mt-3 font-mono text-[10px] leading-relaxed text-[#dce7f5]/80">
            Your message and optional name and email are stored only to read and answer it.{" "}
            <Link href="/privacy#data" className="text-[#ffd166] underline">Privacy policy</Link>
          </p>
          <LegalLinks className="mt-2 font-mono text-[10px] text-[#dce7f5]/80" />
        </div>
      </section>

      </main>

      {/* Footer / Titleblock */}
      <footer id="contact" className="bp-titleblock" lang="en">
        <div className="bp-titleblock-cell">
          <div className="bp-titleblock-label">IMAGINED BY</div>
          <div className="bp-titleblock-value">FLZ</div>
        </div>
        <div className="bp-titleblock-cell">
          <div className="bp-titleblock-label">CREATED BY</div>
          <div className="bp-titleblock-value">FLZ WORKS</div>
        </div>
        <div className="bp-titleblock-cell">
          <div className="bp-titleblock-label">GAMES BY</div>
          <div className="bp-titleblock-value">FLZ STUDIO</div>
        </div>
        <div className="bp-titleblock-cell">
          <div className="bp-titleblock-label">GITHUB</div>
          <div className="bp-titleblock-value bp-accent">
            <a
              className="bp-titleblock-link"
              href="https://github.com/Flzvision"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackTelemetryEvent("social_open", telemetrySite, "github")}
            >
              GITHUB PROFILE ↗
            </a>
          </div>
        </div>
      </footer>

      {/* Floating ID Card Trigger Button (FAB) — only show if not forced open on /id page */}
      {!forceNamecardOpen && !uiHidden && (
        <button
          className="bp-id-fab"
          onClick={() => setIsNamecardOpen(true)}
          aria-label="Open virtual namecard"
        >
          <span className="bp-id-fab-icon">[ID]</span>
          <span className="bp-id-fab-text">NAMECARD</span>
        </button>
      )}

      {/* Showroom-mode exit hint — the only affordance shown while UI is hidden */}
      {uiHidden && (
        <button
          type="button"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 font-mono text-[10px] tracking-widest uppercase text-[#12284b] bg-[#ffd166]/90 hover:bg-[#ffe599] px-3 py-1.5 transition-colors"
          onClick={() => setUiHidden(false)}
        >
          Press [H] or [Esc] to exit showroom
        </button>
      )}

      {/* Virtual Namecard Modal Overlay */}
      {isNamecardOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bp-modal-overlay p-4 ${
            forceNamecardOpen ? "bg-[#12284b]" : ""
          }`}
          onClick={() => !forceNamecardOpen && setIsNamecardOpen(false)}
        >
          {/* Card & QR Wrapper */}
          <div
            className="flex flex-col md:flex-row gap-4 items-stretch max-w-[560px] md:max-w-[720px] w-full"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal={!forceNamecardOpen}
            aria-label="Bence Flosz virtual namecard"
          >
            {/* QR Card (Left Side) — White background, black QR Code, full height of ID Card */}
            <div
              style={{ backgroundColor: "#ffffff" }}
              className="p-3 flex flex-col items-center justify-center shrink-0 w-full md:w-auto bp-namecard-qr-aside"
            >
              <Image
                src={PUBLIC_CONTACT_QR_SRC}
                alt="QR code linking to flz.works"
                width={300}
                height={300}
                className="w-full h-auto md:h-full md:w-auto object-contain max-w-full"
                unoptimized
              />
            </div>


            {/* ID Card (Right Side) */}
            <div
              className="relative flex-1 bp-namecard-box rounded-none shadow-2xl p-6 flex flex-col border-2"
            >
              {/* Close Button */}
              {!forceNamecardOpen && (
                <button
                  aria-label="Close namecard"
                  onClick={() => setIsNamecardOpen(false)}
                  className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bp-modal-close"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Blueprint Header */}
              <div className="border-b pb-4 mb-4 font-mono text-[9px] tracking-widest text-[#ffd166] flex justify-between bp-namecard-header">
                <span>{"FLZ WORKS // IDENTITY CARD"}</span>
              </div>

              {/* Card Body */}
              <div className="flex gap-4 items-start flex-1 mb-6">
                {/* Photo/Avatar area */}
                <div className="w-20 h-24 border flex flex-col items-center justify-center bg-[#dce7f5]/5 relative overflow-hidden shrink-0 bp-namecard-photo">
                  <Image
                    src="/profile.jpg"
                    alt="Bence Flosz"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="space-y-2.5 font-mono">
                    {PUBLIC_CONTACT_ROWS.map(([label, value]) => (
                      <div key={label}>
                        <div className="text-[8px] tracking-widest text-[#dce7f5]/50">{label}</div>
                        <div className="text-[11px] text-[#dce7f5] normal-case break-all">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* vCard download trigger */}
              <button
                onClick={downloadVCard}
                className="w-full bg-[#ffd166] hover:bg-[#ffe599] text-[#12284b] font-mono text-[9px] font-bold tracking-widest py-2.5 transition-colors uppercase bp-namecard-download-btn"
              >
                [DOWNLOAD VCARD]
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Immersive Project Detail Modal */}
      {selectedArticle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bp-modal-overlay p-4 md:p-10 overflow-y-auto animate-fadeIn"
          onClick={() => setSelectedArticle(null)}
        >
          <div
            className="relative w-full max-w-5xl bp-modal-card rounded-none overflow-hidden shadow-2xl transition-all duration-500 scale-100 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={selectedArticle.title}
          >
            {/* Header */}
            <div className="flex items-center justify-between bp-modal-header">
              <div>
                <span className="text-[9px] font-mono tracking-widest uppercase bp-accent">
                  {CATEGORY_LABELS[selectedArticle.category] || "Other"}
                </span>
                <h3 className="font-sans text-xl md:text-2xl font-bold mt-1 uppercase tracking-tight">
                  {selectedArticle.title}
                </h3>
              </div>
              <button
                aria-label="Close details"
                onClick={() => setSelectedArticle(null)}
                className="w-11 h-11 flex items-center justify-center bp-modal-close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bp-modal-content space-y-8">
              {/* Description */}
              <div className="max-w-3xl">
                <p className="bp-modal-desc">
                  {selectedArticle.description || "Project description and technical specifications."}
                </p>
              </div>

              {/* Media Grid */}
              {selectedArticle.images.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#dce7f5]/10 pb-2 mb-4 flex-wrap gap-2">
                    <h4 className="bp-modal-media-title flex items-center gap-2 m-0 border-0 pb-0">
                      <ImageIcon className="h-3 w-3" />
                      PROJECT SHEET MEDIA ({selectedArticle.images.length})
                    </h4>
                    <div className="flex items-center gap-2 font-mono text-[9px] tracking-wider uppercase">
                      <span className="text-[#dce7f5]/40">ALIGN:</span>
                      <button
                        onClick={() => setImageAlign("crop")}
                        className={`px-2 py-0.5 border transition-colors ${
                          imageAlign === "crop" ? "text-[#ffd166] border-[#ffd166]" : "text-[#dce7f5]/60 border-[#dce7f5]/20 hover:border-[#dce7f5]/50"
                        }`}
                      >
                        [CROP]
                      </button>
                      <button
                        onClick={() => setImageAlign("fit")}
                        className={`px-2 py-0.5 border transition-colors ${
                          imageAlign === "fit" ? "text-[#ffd166] border-[#ffd166]" : "text-[#dce7f5]/60 border-[#dce7f5]/20 hover:border-[#dce7f5]/50"
                        }`}
                      >
                        [FIT]
                      </button>
                    </div>
                  </div>
                  <div className="bp-modal-grid">
                    {selectedArticle.images.map((img, idx) => {
                      const imgPath = `/api/portfolio/media/${selectedArticle.folderName}/${img}?w=800`;
                      return (
                        <button
                          type="button"
                          key={img}
                          onClick={() => {
                            setActiveGallery({
                              folderName: selectedArticle.folderName,
                              images: selectedArticle.images,
                              index: idx,
                            });
                          }}
                          className="bp-modal-img-wrap"
                          aria-label={`Open image ${idx + 1} of ${selectedArticle.images.length} full screen`}
                        >
                          <Image
                            src={imgPath}
                            alt={`${selectedArticle.title} — image ${idx + 1}`}
                            fill
                            className={`${
                              imageAlign === "fit" ? "object-contain bg-[#12284b]" : "object-cover"
                            } hover:scale-102 transition-transform duration-500`}
                            sizes="(max-width: 768px) 100vw, 33vw"
                            unoptimized
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {activeGallery && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bp-lightbox-overlay animate-fadeIn"
          onClick={() => setActiveGallery(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Image ${activeGallery.index + 1} of ${activeGallery.images.length}`}
        >
          <button
            aria-label="Close gallery"
            className="absolute top-6 right-6 w-11 h-11 flex items-center justify-center bp-lightbox-btn rounded-none cursor-pointer z-10"
            onClick={() => setActiveGallery(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <button
            aria-label="Previous image"
            className="absolute left-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bp-lightbox-btn rounded-none cursor-pointer z-10 font-mono"
            onClick={(e) => {
              e.stopPropagation();
              setActiveGallery((prev) =>
                prev ? { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length } : null
              );
            }}
          >
            <span>←</span>
          </button>
          <button
            aria-label="Next image"
            className="absolute right-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bp-lightbox-btn rounded-none cursor-pointer z-10 font-mono"
            onClick={(e) => {
              e.stopPropagation();
              setActiveGallery((prev) =>
                prev ? { ...prev, index: (prev.index + 1) % prev.images.length } : null
              );
            }}
          >
            <span>→</span>
          </button>
          <div className="relative max-w-5xl w-full h-[85vh] mx-6" onClick={(e) => e.stopPropagation()}>
            <Image
              src={`/api/portfolio/media/${activeGallery.folderName}/${activeGallery.images[activeGallery.index]}?w=1920`}
              alt={`Project image ${activeGallery.index + 1} of ${activeGallery.images.length}`}
              fill
              className="object-contain"
              sizes="100vw"
              unoptimized
            />
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] text-[#dce7f5]/70 tracking-widest">
            {activeGallery.index + 1} / {activeGallery.images.length}
          </div>
        </div>
      )}
    </div>
  );
}
