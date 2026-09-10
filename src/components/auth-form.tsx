"use client";

import { FormEvent, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { Lock, Mail, User, Loader2 } from "lucide-react";
import type { Dictionary, Locale } from "@/lib/i18n";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_FEDCM_CONFIG_URL = "https://accounts.google.com/gsi/fedcm.json";

type FedCmToken =
  | string
  | {
      id_token?: FedCmToken;
      idToken?: FedCmToken;
      credential?: FedCmToken;
      token?: FedCmToken;
    };

type FedCmCredential = Credential & {
  token?: FedCmToken;
  id_token?: FedCmToken;
  idToken?: FedCmToken;
  credential?: FedCmToken;
};

type GoogleAuthMode = "checking" | "fedcm" | "gis";

function subscribeToBrowserCapability() {
  return () => undefined;
}

function getGoogleAuthModeSnapshot(): GoogleAuthMode {
  const userAgent = navigator.userAgent;
  const isPhoneOrTablet =
    /Android|iPhone|iPad|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);
  const supportsDirectFedCm = "IdentityCredential" in window;
  return !isPhoneOrTablet && supportsDirectFedCm ? "fedcm" : "gis";
}

function getGoogleAuthModeServerSnapshot(): GoogleAuthMode {
  return "checking";
}

type FedCmRequestOptions = CredentialRequestOptions & {
  identity: {
    mode: "active";
    providers: Array<{
      configURL: string;
      clientId: string;
      params: {
        response_type: "id_token";
        scope: "openid email profile";
        nonce: string;
        ss_domain: string;
      };
    }>;
  };
};

function unpackFedCmIdToken(token: FedCmToken | undefined, depth = 0): string | null {
  if (!token || depth > 3) return null;

  if (typeof token === "string") {
    const value = token.trim();
    if (value.split(".").length === 3) return value;

    if (value.startsWith("{")) {
      try {
        return unpackFedCmIdToken(JSON.parse(value) as FedCmToken, depth + 1);
      } catch {
        return null;
      }
    }

    return null;
  }

  return (
    unpackFedCmIdToken(token.id_token, depth + 1) ??
    unpackFedCmIdToken(token.idToken, depth + 1) ??
    unpackFedCmIdToken(token.credential, depth + 1) ??
    unpackFedCmIdToken(token.token, depth + 1)
  );
}

function readFedCmIdToken(credential: FedCmCredential | null) {
  return (
    unpackFedCmIdToken(credential?.token) ??
    unpackFedCmIdToken(credential?.id_token) ??
    unpackFedCmIdToken(credential?.idToken) ??
    unpackFedCmIdToken(credential?.credential)
  );
}

export function GoogleSignInButton({
  redirectTo,
  locale,
  onStart,
  onError,
}: {
  redirectTo: string;
  locale: Locale;
  onStart?: () => void;
  onError?: (err: string) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const detectedAuthMode = useSyncExternalStore(
    subscribeToBrowserCapability,
    getGoogleAuthModeSnapshot,
    getGoogleAuthModeServerSnapshot,
  );
  const [forceGisFallback, setForceGisFallback] = useState(false);
  const authMode: GoogleAuthMode = forceGisFallback ? "gis" : detectedAuthMode;
  const [gisReady, setGisReady] = useState(false);
  const gisButtonRef = useRef<HTMLDivElement>(null);

  const handleCredentialResponse = useCallback(
    async (credential: string, nonce: string) => {
      setLoading(true);
      setError("");
      if (onStart) onStart();

      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential, nonce }),
        });

        const data = await res.json();

        if (data.error === "NO_ADMIN") {
          setLoading(false);
          setDenied(true);
          setTimeout(() => {
            router.push("/");
            router.refresh();
          }, 3000);
          return;
        }

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Google Sign-In failed.");
        }

        const destination = data.redirect || redirectTo;
        router.push(`${destination}${destination.includes("?") ? "&" : "?"}lang=${locale}`);
        router.refresh();
      } catch (err: unknown) {
        console.error(err);
        const message = err instanceof Error ? err.message : "Google Sign-In failed.";
        setError(message);
        if (onError) onError(message);
        setLoading(false);
      }
    },
    [router, redirectTo, locale, onStart, onError],
  );

  useEffect(() => {
    if (authMode !== "gis" || !gisReady || !GOOGLE_CLIENT_ID || !gisButtonRef.current) {
      return;
    }

    if (typeof google === "undefined") {
      return;
    }

    const nonce = crypto.randomUUID();
    const container = gisButtonRef.current;
    const width = Math.max(200, Math.min(320, container.clientWidth || 320));
    container.replaceChildren();

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        const idToken = unpackFedCmIdToken(response.credential);
        if (!idToken) {
          const message = "Google returned an invalid ID token. Open this page in Chrome or Safari.";
          setError(message);
          if (onError) onError(message);
          return;
        }
        void handleCredentialResponse(idToken, nonce);
      },
      auto_select: false,
      itp_support: true,
      use_fedcm_for_button: true,
      button_auto_select: false,
      nonce,
      ux_mode: "popup",
    });
    google.accounts.id.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "pill",
      width,
      locale,
    });
  }, [authMode, gisReady, handleCredentialResponse, locale, onError]);

  const signInWithGoogle = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      if (!GOOGLE_CLIENT_ID || !navigator.credentials?.get) {
        throw new Error("This browser does not support Google account sign-in.");
      }

      const nonce = crypto.randomUUID();
      const request: FedCmRequestOptions = {
        identity: {
          mode: "active",
          providers: [
            {
              configURL: GOOGLE_FEDCM_CONFIG_URL,
              clientId: GOOGLE_CLIENT_ID,
              params: {
                response_type: "id_token",
                scope: "openid email profile",
                nonce,
                ss_domain: window.location.origin,
              },
            },
          ],
        },
      };

      const credential = (await navigator.credentials.get(request)) as FedCmCredential | null;
      const idToken = readFedCmIdToken(credential);
      if (!idToken) {
        setForceGisFallback(true);
        setLoading(false);
        return;
      }

      await handleCredentialResponse(idToken, nonce);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Google Sign-In failed.";
      setError(message);
      if (onError) onError(message);
      setLoading(false);
    }
  }, [handleCredentialResponse, onError]);

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  if (denied) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="rounded-full bg-rose-100 p-3">
          <Lock className="h-6 w-6 text-rose-600" />
        </div>
        <p className="text-lg font-bold text-slate-900">You do not have admin privileges.</p>
        <p className="text-sm text-slate-500">You are signed out. Heading back to the homescreen...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {authMode === "gis" && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onReady={() => setGisReady(true)}
          onError={() => {
            const message = "Google Sign-In could not be loaded. Open this page in Chrome or Safari.";
            setError(message);
            if (onError) onError(message);
          }}
        />
      )}
      {authMode === "gis" ? (
        <div
          ref={gisButtonRef}
          className={`min-h-11 w-full max-w-80 ${loading ? "pointer-events-none opacity-70" : ""}`}
        />
      ) : (
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading || authMode === "checking"}
          className="inline-flex min-h-11 w-full max-w-80 items-center justify-center gap-3 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-70"
        >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" focusable="false">
          <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
          <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.43l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.13H3.06v2.62A10 10 0 0 0 12 22Z" />
          <path fill="#FBBC05" d="M6.4 13.86A6 6 0 0 1 6.08 12c0-.65.11-1.28.32-1.86V7.52H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.48l3.34-2.62Z" />
          <path fill="#EA4335" d="M12 6.01c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.94 5.52l3.34 2.62c.79-2.37 3-4.13 5.6-4.13Z" />
        </svg>
        <span>{loading ? "Signing in…" : "Sign in with Google"}</span>
        </button>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Signing in...
        </div>
      )}
      {error && (
        <p role="alert" className="max-w-xs text-center text-sm font-medium text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthForm({
  mode,
  t,
  locale,
}: {
  mode: "login" | "register";
  t: Dictionary;
  locale: Locale;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const redirectTo = searchParams.get("redirect") ?? "/studio";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error || t.forms.error);
      setPending(false);
      return;
    }

    router.push(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}lang=${locale}`);
    router.refresh();
  }

  return (
    <div className="glass-panel grid gap-4 rounded-lg p-6">
      {/* Google Login Button */}
      <GoogleSignInButton
        redirectTo={redirectTo}
        locale={locale}
        onError={(msg) => setError(msg)}
      />

      <div className="relative my-1 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <span className="relative bg-white/80 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
          or email
        </span>
      </div>

      <form onSubmit={submit} className="grid gap-4">
        {mode === "register" && (
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            {t.forms.name}
            <span className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                name="name"
                required
                className="h-11 w-full pl-10 pr-3 font-normal outline-none transition"
              />
            </span>
          </label>
        )}

        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          {t.forms.email}
          <span className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              name="email"
              type="email"
              required
              className="h-11 w-full pl-10 pr-3 font-normal outline-none transition"
            />
          </span>
        </label>

        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          {t.forms.password}
          <span className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="h-11 w-full pl-10 pr-3 font-normal outline-none transition"
            />
          </span>
        </label>

        {error && <p className="rounded-lg bg-rose-50/80 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="liquid-button-primary inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-black text-white transition disabled:opacity-60"
        >
          {mode === "login" ? t.auth.loginCta : t.auth.registerCta}
        </button>

        {mode === "register" && (
          <p className="text-xs leading-relaxed text-slate-600">
            {locale === "hu" ? (
              <>
                A regisztrációval elfogadod a{" "}
                <Link href="/terms" className="font-semibold text-cyan-800 underline">felhasználási feltételeket</Link>, és
                tudomásul veszed az{" "}
                <Link href="/privacy#data" className="font-semibold text-cyan-800 underline">adatkezelési tájékoztatót</Link>.
              </>
            ) : (
              <>
                By creating an account you agree to the{" "}
                <Link href="/terms" className="font-semibold text-cyan-800 underline">Terms of use</Link> and acknowledge the{" "}
                <Link href="/privacy#data" className="font-semibold text-cyan-800 underline">Privacy policy</Link>.
              </>
            )}
          </p>
        )}
      </form>
    </div>
  );
}
