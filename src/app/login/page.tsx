import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";
import type { SearchParamsInput } from "@/lib/search-params";
import { GoogleSignInButton } from "@/components/auth-form";
import { checkIsAdminEmail } from "@/lib/flz-security";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParamsInput> }) {
  const params = await searchParams;
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale(params)]);

  if (user) {
    const target = user.role === "ADMIN" || checkIsAdminEmail(user.email) ? "/studio" : "/";
    redirect(`${target}?lang=${locale}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-6 text-2xl font-black text-slate-950">Bejelentkezés</h1>
        <div className="glass-panel flex justify-center rounded-lg p-6">
          <GoogleSignInButton redirectTo="/studio" locale={locale} />
        </div>
      </div>
    </div>
  );
}
