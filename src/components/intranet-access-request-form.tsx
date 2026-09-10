"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Mail, Send, User } from "lucide-react";

export function IntranetAccessRequestForm({ module = "autopiac" }: { module?: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");

    const formData = new FormData(event.currentTarget);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25000);
    let response: Response;

    try {
      response = await fetch("/api/intranet/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
        signal: controller.signal,
      });
    } catch {
      setError("Access request timed out. Check email delivery settings and try again.");
      setPending(false);
      window.clearTimeout(timeout);
      return;
    }

    window.clearTimeout(timeout);

    const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? "Access request failed. Check the host email configuration and try again.");
      setPending(false);
      return;
    }

    setMessage(payload?.message ?? "Request sent. Return to this page after approval.");
    event.currentTarget.reset();
    setPending(false);
  }

  return (
    <form onSubmit={submit} className="portfolio-glass-panel grid gap-4 rounded-lg p-5">
      <input type="hidden" name="module" value={module} />
      <label className="grid gap-2 text-sm font-bold text-zinc-200">
        Name
        <span className="relative">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <input
            name="name"
            required
            minLength={2}
            autoComplete="name"
            className="portfolio-input h-12 w-full rounded-lg pl-10 pr-3 outline-none"
          />
        </span>
      </label>
      <label className="grid gap-2 text-sm font-bold text-zinc-200">
        Email
        <span className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="portfolio-input h-12 w-full rounded-lg pl-10 pr-3 outline-none"
          />
        </span>
      </label>
      <p className="text-xs leading-relaxed text-zinc-300">
        Your name, email address and IP address are sent to the site owner so they can approve the request and
        prevent abuse. The request is deleted 30 days after it or the granted access expires.{" "}
        <Link href="/privacy#intranet" className="font-semibold text-white underline underline-offset-2">
          Privacy policy
        </Link>
      </p>
      {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100">{message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="portfolio-liquid-button portfolio-liquid-button-active inline-flex h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-black disabled:opacity-60"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        {pending ? "Sending" : "Request one-time access"}
      </button>
    </form>
  );
}
