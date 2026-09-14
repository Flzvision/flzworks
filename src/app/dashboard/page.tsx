import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { checkIsAdminEmail } from "@/lib/flz-security";

export const dynamic = "force-dynamic";

export default async function DashboardRedirect() {
  const user = await getCurrentUser();

  if (user && (user.role === "ADMIN" || checkIsAdminEmail(user.email))) {
    redirect("/studio");
  }

  // The marketplace dashboard this used to fall through to is gone, and there
  // is no non-admin dashboard on the portfolio, so send everyone else home.
  redirect("/");
}
