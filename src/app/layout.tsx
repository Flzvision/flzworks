import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/lib/i18n-server";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://flz.works"),
  title: {
    default: "FLZ — Bence Flosz | 3D Artist & Software Engineer",
    template: "%s | FLZ Works",
  },
  description:
    "Portfolio of Bence Flosz — Gazdaságinformatikus (BGE), Indie Game Developer, 3D Artist, and Backend Developer based in Budapest.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col text-slate-950">
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var p=localStorage.getItem("autopiac.palette")||"aqua";var g=localStorage.getItem("autopiac.glass")||"clear";document.documentElement.dataset.themePalette=p;document.documentElement.dataset.glass=g;}catch(e){}`,
          }}
        />
        <noscript>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#03040a] text-white p-6 text-center">
            <div className="max-w-lg space-y-4">
              <h1 className="text-3xl font-black tracking-tight">FLZ WORKS</h1>
              <p className="text-sm font-mono text-white/80 leading-relaxed">
                Portfolio of Bence Flosz — Gazdaságinformatikus (BGE), Indie Game Developer, 3D Artist, and Backend Developer based in Budapest.
              </p>
              <p className="text-xs text-white/60">
                This interactive 3D portfolio and application suite requires JavaScript. Please enable JavaScript in your browser for the full experience.
              </p>
              <div className="pt-4 text-xs font-mono flex flex-wrap justify-center gap-4 text-cyan-400">
                <a href="mailto:floszbeni@gmail.com" className="underline hover:text-cyan-300">
                  Email: floszbeni@gmail.com
                </a>
                <a
                  href="https://github.com/Flzvision"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-cyan-300"
                >
                  GitHub
                </a>
                <a
                  href="https://www.linkedin.com/in/bence-flosz-56134535a/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-cyan-300"
                >
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </noscript>
        {/* Squircle clip path — superellipse n=4, k=0.9091, referenced as url(#squircle) */}
        <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute", pointerEvents: "none" }}>
          <defs>
            <clipPath id="squircle" clipPathUnits="objectBoundingBox">
              <path d="M 0.5 0 C 0.9545 0, 1 0.0455, 1 0.5 C 1 0.9545, 0.9545 1, 0.5 1 C 0.0455 1, 0 0.9545, 0 0.5 C 0 0.0455, 0.0455 0, 0.5 0 Z" />
            </clipPath>
          </defs>
        </svg>
        {children}
      </body>
    </html>
  );
}
