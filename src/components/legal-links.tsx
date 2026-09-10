import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/cookies", label: "Cookies" },
  { href: "/terms", label: "Terms" },
  { href: "/terms#refunds", label: "Refunds" },
  { href: "/legal", label: "Legal notice" },
] as const;

export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={className}>
      <ul style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", margin: 0, padding: 0, listStyle: "none" }}>
        {LEGAL_LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href} style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
