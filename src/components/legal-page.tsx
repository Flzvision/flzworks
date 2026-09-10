import Link from "next/link";
import type { ReactNode } from "react";
import { LegalLinks } from "@/components/legal-links";

export const LEGAL_LAST_UPDATED = "10 September 2026";

export const legalLinkClass = "font-medium text-[#0066cc] underline underline-offset-2 hover:text-[#004f9e]";

export function LegalPage({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div lang="en" className="flex min-h-screen w-full flex-col bg-[#f5f5f7] font-sans text-[#1d1d1f] antialiased">
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
        <Link href="/" className={legalLinkClass}>
          ← Back to flz.works
        </Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-[#5f5f65]">Last updated: {LEGAL_LAST_UPDATED}</p>
        {intro && <div className="mt-6 text-base leading-relaxed text-[#3a3a3f]">{intro}</div>}
        <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-[#3a3a3f]">{children}</div>
      </main>
      <footer className="border-t border-black/10">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-sm text-[#5f5f65] sm:px-8">
          <span>© 2026 Bence Flosz</span>
          <LegalLinks />
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-8">
      <h2 id={`${id}-title`} className="text-xl font-semibold tracking-tight text-[#1d1d1f]">
        {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5">{children}</ul>;
}
