import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection, legalLinkClass } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Terms of use, copyright and refund information for flz.works.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      intro={
        <p>
          These terms apply to flz.works and its sub-pages. By using the site you accept them. If you do not agree,
          please do not use the site.
        </p>
      }
    >
      <LegalSection id="about" title="1. About the site">
        <p>
          flz.works is a non-commercial personal portfolio run by Bence Flosz, a private individual based in
          Budapest, Hungary. Operator details are listed in the{" "}
          <Link href="/legal" className={legalLinkClass}>legal notice</Link>.
        </p>
      </LegalSection>

      <LegalSection id="copyright" title="2. Copyright and trademarks">
        <p>
          Unless stated otherwise, all artwork, 3D models, renders, videos, designs and text on this site are
          © Bence Flosz. You may view them and share links to them. Copying, republishing, modifying or using them
          commercially, including for training AI models, requires prior written permission.
        </p>
        <p>
          Some concept designs reference existing vehicles or brands. Those names and trademarks belong to their
          owners; the designs are independent fan and portfolio work and are not affiliated with or endorsed by
          those companies.
        </p>
      </LegalSection>

      <LegalSection id="use" title="3. Acceptable use">
        <LegalList>
          <li>Do not attempt to break, overload or gain unauthorised access to the site, its intranet or its accounts.</li>
          <li>Do not send spam, malicious content or other people&apos;s personal data through the forms.</li>
          <li>Intranet access is personal and may be revoked or blocked at any time, for example after abuse.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="prototypes" title="4. Prototypes and demo content">
        <p>
          The intranet, including the AutoPiac showroom, contains prototypes. Vehicles, listings, prices and other data
          shown there are for demonstration only and are not offers to sell, buy or broker anything.
        </p>
      </LegalSection>

      <LegalSection id="refunds" title="5. Payments and refunds">
        <p>
          flz.works does not sell goods, digital content or services and does not take payments, so there is nothing
          to refund and no refund policy applies. If paid products are ever offered, the price, your statutory 14-day
          right of withdrawal under Hungarian Government Decree 45/2014 and the refund process will be explained
          clearly before any purchase.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="6. Links and liability">
        <p>
          The site links to external services (such as Instagram, TikTok, LinkedIn, GitHub and Sketchfab), which have
          their own terms and privacy policies. The site owner has no control over their content.
        </p>
        <p>
          The site is provided as is, without any guarantee of availability or accuracy. To the extent permitted by
          law, the owner is not liable for damage resulting from its use. This does not limit liability for
          intentional or grossly negligent conduct, or for harm to life, physical integrity or health.
        </p>
      </LegalSection>

      <LegalSection id="law" title="7. Governing law and changes">
        <p>
          These terms are governed by Hungarian law. If you are a consumer, you keep the mandatory protections of the
          country where you live. The terms may be updated; the date at the top shows the latest version. Questions
          can be sent through the message form on the <Link href="/" className={legalLinkClass}>home page</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
