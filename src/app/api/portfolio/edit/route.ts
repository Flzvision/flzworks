import { NextResponse } from "next/server";
import { verifyAdminUser } from "@/lib/flz-security";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Updates one portfolio article.
 *
 * The update is PARTIAL: only fields actually present in the body are written.
 * Two surfaces call this — the studio's Articles panel, which holds a full
 * draft, and the editor rail's inspector, which only changes visibility and
 * category. When it was a whole-object write, the rail resent the title, date
 * and description it had been handed at page load, so toggling visibility there
 * silently reverted any edit the panel had saved in the meantime.
 */
export async function POST(request: Request) {
  const auth = await verifyAdminUser();

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { id, title, description, date, visible, category } = body ?? {};

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "An article id is required." }, { status: 400 });
    }

    const data: Prisma.PortfolioArticleUpdateInput = {};

    // A caller that sends a field must send a usable one; a caller that omits
    // it keeps whatever is stored.
    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return NextResponse.json({ error: "A title is required." }, { status: 400 });
      }
      data.title = title;
    }

    if (date !== undefined) {
      if (typeof date !== "string" || !date.trim()) {
        return NextResponse.json({ error: "A date is required." }, { status: 400 });
      }
      data.date = date;
    }

    if (description !== undefined) {
      data.description = description === null ? null : String(description);
    }

    if (visible !== undefined) {
      data.visible = Boolean(visible);
    }

    if (category !== undefined) {
      if (typeof category !== "string" || !category.trim()) {
        return NextResponse.json({ error: "A category is required." }, { status: 400 });
      }
      data.category = category;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const updated = await prisma.portfolioArticle.update({ where: { id }, data });

    return NextResponse.json({ success: true, article: updated });
  } catch (error) {
    console.error("Failed to update portfolio article:", error);
    return NextResponse.json({ error: "Failed to update article." }, { status: 500 });
  }
}
