import { NextResponse } from "next/server";
import { verifyAdminUser } from "@/lib/flz-security";
import { getSocialMetricsSnapshot } from "@/lib/social-metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await verifyAdminUser();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const metrics = await getSocialMetricsSnapshot();
    return NextResponse.json(
      { metrics },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Failed to read social metrics:", error);
    return NextResponse.json({ error: "Failed to read social metrics" }, { status: 500 });
  }
}
