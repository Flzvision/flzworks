import type { Metadata } from "next";
import { Outfit, Syne } from "next/font/google";

// Self-hosted by next/font at build time, so visitors never request Google Fonts.
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const syne = Syne({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-syne" });

export const metadata: Metadata = {
  title: {
    template: "%s — flz.works/uidesign",
    default: "UI Design Showcase — flz.works",
  },
  description:
    "A curated gallery of premium UI/UX design systems by flz.works — featuring glassmorphism, WebGL refraction, and cutting-edge interaction patterns.",
};

export default function UiDesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      lang="en"
      className={`uidesign-root font-sans ${outfit.variable} ${syne.variable}`}
      style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
    >
      {children}
    </div>
  );
}
