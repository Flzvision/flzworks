import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection, legalLinkClass } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How flz.works collects, uses and protects personal data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro={
        <p>
          This policy explains what personal data flz.works and its sub-pages (such as /autosalon, /id, /uidesign and
          the invite-only intranet) process, why, and what rights you have under the EU General Data Protection
          Regulation (GDPR) and Hungarian Act CXII of 2011 (Infotv.).
        </p>
      }
    >
      <LegalSection id="controller" title="1. Who is responsible">
        <p>
          The data controller is <strong>Bence Flosz</strong>, a private individual based in Budapest, Hungary, who runs
          flz.works as a non-commercial personal portfolio (&ldquo;FLZ Works&rdquo;).
        </p>
        <p>
          To contact the controller about privacy, use the <strong>Message me</strong> form on the{" "}
          <Link href="/" className={legalLinkClass}>home page</Link> and mention &ldquo;privacy request&rdquo; in your
          message. There is no designated data protection officer.
        </p>
      </LegalSection>

      <LegalSection id="data" title="2. What data is processed and why">
        <h3 className="font-semibold text-[#1d1d1f]">Visiting the site</h3>
        <p>
          When you open a page, the hosting provider necessarily processes technical connection data (your IP address,
          the time of the request and basic browser information) to deliver the page and keep the service secure. Legal
          basis: legitimate interest in operating a secure website (GDPR Art. 6(1)(f)). These logs are kept only for
          the provider&apos;s short-term operational retention period.
        </p>

        <h3 id="analytics" className="scroll-mt-8 font-semibold text-[#1d1d1f]">Optional analytics (only with your consent)</h3>
        <p>
          If you click <em>Allow</em> in the consent banner, the site records a random session ID, which site section and page you
          opened, how long the page was visible, and whether you opened a social link or the vCard. No IP address,
          user agent, referrer, cookie or cross-site identifier is stored. If your browser sends a Global Privacy
          Control or Do Not Track signal, analytics stay off. Legal basis: consent (GDPR Art. 6(1)(a)). You can
          withdraw at any time with the <em>Cookies/analytics</em> button in the page footer. Visit records are
          deleted after 370 days.
        </p>

        <h3 className="font-semibold text-[#1d1d1f]">Message form</h3>
        <p>
          When you send a message, your email address, your message and (optionally) your name are stored so that
          the controller can read and answer it. Legal basis: taking steps at your request and the legitimate interest
          in replying (GDPR Art. 6(1)(b) and (f)). Messages are kept until the conversation is finished and they are
          deleted; you can ask for earlier deletion at any time.
        </p>

        <h3 id="intranet" className="scroll-mt-8 font-semibold text-[#1d1d1f]">Intranet access requests</h3>
        <p>
          The private intranet (for example the AutoPiac showroom) is invite-only. When you request access, your name,
          email address, IP address and the time of the request are stored, and an approval email containing these
          details is sent to the site owner. The IP address is also used to limit repeated requests and to block
          abuse. Legal basis: legitimate interest in controlling access and preventing abuse (GDPR Art. 6(1)(f)).
          Requests are deleted 30 days after the request or the granted access expires. An approved request sets an
          access cookie (see the <Link href="/cookies" className={legalLinkClass}>cookie policy</Link>).
        </p>

        <h3 className="font-semibold text-[#1d1d1f]">Accounts and sign-in</h3>
        <p>
          Some areas (the AutoPiac prototype and the site owner&apos;s Studio) require an account. For email
          registration your name, email address and a securely hashed password are stored; with Google Sign-In,
          Google shares your name and email address. Content you create there (for example listings, favourites or
          saved searches) is stored with your account. Legal basis: providing the service you asked for (GDPR Art.
          6(1)(b)). Account data is kept until you ask for the account to be deleted.
        </p>

        <h3 id="embeds" className="scroll-mt-8 font-semibold text-[#1d1d1f]">Embedded 3D viewer</h3>
        <p>
          3D models are shown with a viewer from Sketchfab (Epic Games). Nothing is requested from Sketchfab until you press the play button on the model (a
          local image is shown until then), and the choice is not remembered; once loaded, Sketchfab receives your IP address and may set its own cookies under{" "}
          <a href="https://www.epicgames.com/site/privacypolicy" className={legalLinkClass} rel="noopener noreferrer" target="_blank">
            Epic Games&apos; privacy policy
          </a>
          . Legal basis: consent (GDPR Art. 6(1)(a)).
        </p>
      </LegalSection>

      <LegalSection id="recipients" title="3. Service providers">
        <p>Personal data is not sold and is not used for advertising. It is only shared with these providers, as needed:</p>
        <LegalList>
          <li>
            <strong>Railway Corporation</strong> (USA): hosting, database and file storage.{" "}
            <a href="https://railway.com/legal/privacy" className={legalLinkClass} rel="noopener noreferrer" target="_blank">Privacy policy</a>
          </li>
          <li>
            <strong>Resend</strong> (USA): delivery of intranet approval emails.{" "}
            <a href="https://resend.com/legal/privacy-policy" className={legalLinkClass} rel="noopener noreferrer" target="_blank">Privacy policy</a>
          </li>
          <li>
            <strong>Google</strong> (Ireland/USA): Google Sign-In on the sign-in and registration pages, and a fallback
            email service.{" "}
            <a href="https://policies.google.com/privacy" className={legalLinkClass} rel="noopener noreferrer" target="_blank">Privacy policy</a>
          </li>
          <li>
            <strong>Sketchfab / Epic Games</strong>: only when you press play to load a 3D model.
          </li>
        </LegalList>
        <p>
          Where a provider processes data outside the European Economic Area, the transfer relies on the safeguards
          that provider offers, such as the EU–US Data Privacy Framework or the European Commission&apos;s Standard
          Contractual Clauses.
        </p>
        <p>
          Project images from the owner&apos;s own Instagram and TikTok accounts are copied to and served from
          flz.works, so viewing them does not contact those platforms. Links to social profiles open the external
          site, where that platform&apos;s own privacy policy applies.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="4. Your rights">
        <p>Under the GDPR you have the right to:</p>
        <LegalList>
          <li>access the personal data held about you and receive a copy;</li>
          <li>have inaccurate data corrected, and have data erased or its processing restricted;</li>
          <li>receive data you provided in a portable format;</li>
          <li>object to processing based on legitimate interest;</li>
          <li>withdraw consent at any time, without affecting processing that happened before.</li>
        </LegalList>
        <p>
          Send requests through the message form; they will be answered within one month. You can also lodge a
          complaint with the Hungarian supervisory authority, the Nemzeti Adatvédelmi és Információszabadság Hatóság
          (NAIH), 1055 Budapest, Falk Miksa utca 9–11,{" "}
          <a href="https://naih.hu" className={legalLinkClass} rel="noopener noreferrer" target="_blank">naih.hu</a>, or
          with the authority where you live, or go to court.
        </p>
      </LegalSection>

      <LegalSection id="other" title="5. Other information">
        <p>
          No automated decision-making or profiling takes place. Providing data is voluntary, but the message form,
          access requests and accounts cannot work without the fields marked as required.
        </p>
        <p>
          If this policy changes, the date at the top is updated. Cookie and browser storage details are listed in the{" "}
          <Link href="/cookies" className={legalLinkClass}>cookie policy</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
