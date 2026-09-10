import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, legalLinkClass } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Legal notice",
  description: "Operator and hosting information for flz.works.",
  alternates: { canonical: "/legal" },
};

export default function LegalNoticePage() {
  return (
    <LegalPage title="Legal notice">
      <LegalSection id="operator" title="Operator">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[180px_1fr]">
          <dt className="font-semibold text-[#1d1d1f]">Name</dt>
          <dd>Bence Flosz (FLZ Works)</dd>
          <dt className="font-semibold text-[#1d1d1f]">Status</dt>
          <dd>Private individual. flz.works is a non-commercial personal portfolio; no goods or services are sold.</dd>
          <dt className="font-semibold text-[#1d1d1f]">Location</dt>
          <dd>Budapest, Hungary</dd>
          <dt className="font-semibold text-[#1d1d1f]">Contact</dt>
          <dd>
            Message form on the <Link href="/" className={legalLinkClass}>home page</Link>
          </dd>
        </dl>
      </LegalSection>

      <LegalSection id="hosting" title="Hosting provider">
        <p>
          Railway Corporation, San Francisco, California, USA —{" "}
          <a href="https://railway.com" className={legalLinkClass} rel="noopener noreferrer" target="_blank">railway.com</a>
        </p>
      </LegalSection>

      <LegalSection id="more" title="More information">
        <p>
          See the <Link href="/privacy" className={legalLinkClass}>privacy policy</Link>,{" "}
          <Link href="/cookies" className={legalLinkClass}>cookie policy</Link> and{" "}
          <Link href="/terms" className={legalLinkClass}>terms of use</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
