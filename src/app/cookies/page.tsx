import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, legalLinkClass } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Cookie policy",
  description: "Cookies and browser storage used on flz.works.",
  alternates: { canonical: "/cookies" },
};

const FIRST_PARTY = [
  {
    name: "autopiac_session",
    type: "Cookie (HTTP-only)",
    purpose: "Keeps you signed in after you log in. Strictly necessary.",
    duration: "30 days, or until you log out",
  },
  {
    name: "flz_intranet_access_v2",
    type: "Cookie (HTTP-only)",
    purpose: "Grants access to an intranet module after your request was approved. Strictly necessary.",
    duration: "Until the approved access period ends (1 hour or longer, as granted)",
  },
  {
    name: "autopiac_lang",
    type: "Cookie",
    purpose: "Remembers the language you chose on the marketplace pages.",
    duration: "1 year",
  },
  {
    name: "flz.telemetry.consent",
    type: "Local storage",
    purpose: "Remembers whether you allowed or declined analytics.",
    duration: "Until you clear your browser data",
  },
  {
    name: "flz-public-theme, autopiac.palette, autopiac.glass",
    type: "Local storage",
    purpose: "Remember light/dark mode and appearance settings you picked.",
    duration: "Until you clear your browser data",
  },
  {
    name: "flz.embed.sketchfab",
    type: "Session storage",
    purpose: "Remembers that you chose to load the 3D viewer in this tab.",
    duration: "Until the tab is closed",
  },
] as const;

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie policy"
      intro={
        <p>
          flz.works does not use advertising or analytics cookies. It only uses the first-party cookies and browser
          storage listed below, which are needed for features you actively use or which remember your own choices.
          Under Hungarian and EU e-privacy rules these do not require prior consent.
        </p>
      }
    >
      <LegalSection id="first-party" title="1. Cookies and storage set by flz.works">
        <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">First-party cookies and browser storage</caption>
            <thead className="bg-[#e8e8ed] text-[#1d1d1f]">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Name</th>
                <th scope="col" className="px-4 py-3 font-semibold">Type</th>
                <th scope="col" className="px-4 py-3 font-semibold">Purpose</th>
                <th scope="col" className="px-4 py-3 font-semibold">Duration</th>
              </tr>
            </thead>
            <tbody>
              {FIRST_PARTY.map((row) => (
                <tr key={row.name} className="border-t border-black/10 align-top">
                  <th scope="row" className="px-4 py-3 font-mono text-xs font-medium text-[#1d1d1f]">{row.name}</th>
                  <td className="px-4 py-3">{row.type}</td>
                  <td className="px-4 py-3">{row.purpose}</td>
                  <td className="px-4 py-3">{row.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection id="analytics" title="2. Analytics">
        <p>
          The optional visitor analytics are cookieless: they only run after you click <em>Allow</em> in the consent banner, and
          your choice is kept in local storage. Change it at any time with the <em>Cookies/analytics</em> button in
          the page footer. Details are in the{" "}
          <Link href="/privacy#analytics" className={legalLinkClass}>privacy policy</Link>.
        </p>
      </LegalSection>

      <LegalSection id="third-party" title="3. Third-party cookies">
        <p>
          <strong>Google</strong>: the sign-in and registration pages load Google Sign-In, which may set or read
          Google cookies when you use it.
        </p>
        <p>
          <strong>Sketchfab (Epic Games)</strong>: nothing from Sketchfab is loaded until you press the play button on the
          3D model (or <em>Load 3D model</em> on pages that show that prompt). After that the viewer may set its own cookies.
        </p>
        <p>
          You can delete or block cookies in your browser settings. Blocking the strictly necessary cookies prevents
          sign-in and intranet access from working.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
