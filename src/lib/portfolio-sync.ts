import { readdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

export interface PortfolioArticleWithImages {
  id: string;
  folderName: string;
  title: string;
  description: string | null;
  date: string;
  visible: boolean;
  category: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Robust folder name parser
export function parseFolderName(folderName: string): { title: string; date: string } {
  // Regex to match dates like _2026_11_17 or _2025_10_6 at the end of the folder name
  const dateRegex = /_(\d{4})_(\d{1,2})_(\d{1,2})$/;
  const match = folderName.match(dateRegex);

  let title = folderName;
  let date = "";

  if (match) {
    const [datePart, year, month, day] = match;
    // Extract title by removing the date suffix
    title = folderName.slice(0, -datePart.length);
    // Standardize date to YYYY-MM-DD
    date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  } else {
    // Fallback if no date found
    date = "N/A";
  }

  // Format title: replace underscores with spaces, handle DONE prefix nicely
  let formattedTitle = title
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  // Beautify common prefixes
  if (formattedTitle.toUpperCase().startsWith("DONE ")) {
    formattedTitle = formattedTitle.slice(5) + " (Completed)";
  }

  return { title: formattedTitle, date };
}

// Smart default categorization, applied once when a folder is first seen.
function defaultCategoryFor(folderName: string): string {
  const nameLower = folderName.toLowerCase();
  if (nameLower.includes("lego")) {
    return "BRICKWORKS";
  }
  if (nameLower.includes("godot") || nameLower.includes("game")) {
    return "GAMES";
  }
  if (nameLower.includes("poster") || nameLower.includes("video") || nameLower.includes("render") || nameLower.includes("media")) {
    return "MEDIA";
  }
  if (nameLower.includes("car") || nameLower.includes("auto") || nameLower.includes("hypercar")) {
    return "CAR_DESIGN";
  }
  return "OTHER";
}

/**
 * Load every article row backing `Media/Portfolio`, creating rows for folders
 * that do not have one yet.
 *
 * This runs on every request of the public pages, so it stays at a fixed three
 * queries regardless of folder count rather than one lookup per folder.
 */
async function loadArticleRows(folders: string[]) {
  const existing = await prisma.portfolioArticle.findMany({
    where: { folderName: { in: folders } },
  });

  const byFolder = new Map(existing.map((article) => [article.folderName, article]));
  const missing = folders.filter((folder) => !byFolder.has(folder));

  if (missing.length) {
    await prisma.portfolioArticle.createMany({
      data: missing.map((folder) => {
        const { title, date } = parseFolderName(folder);
        return {
          folderName: folder,
          title,
          date: date || "N/A",
          visible: true,
          category: defaultCategoryFor(folder),
          description: `Portfolio project: ${title}. Automatically loaded from Media repository.`,
        };
      }),
      // A concurrent request may have inserted the same folder between the read
      // above and this write; let that row win instead of failing the render.
      skipDuplicates: true,
    });

    // createMany cannot return the inserted rows, so read back just the new ones.
    const created = await prisma.portfolioArticle.findMany({
      where: { folderName: { in: missing } },
    });
    for (const article of created) {
      byFolder.set(article.folderName, article);
    }
  }

  return byFolder;
}

export async function syncPortfolioArticles(): Promise<PortfolioArticleWithImages[]> {
  const portfolioRoot = path.join(process.cwd(), "Media", "Portfolio");

  let folders: string[] = [];
  try {
    const entries = await readdir(portfolioRoot, { withFileTypes: true });
    folders = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    console.error("Failed to read Media/Portfolio directory:", error);
    return [];
  }

  if (!folders.length) {
    return [];
  }

  const byFolder = await loadArticleRows(folders);
  const articles: PortfolioArticleWithImages[] = [];

  for (const folder of folders) {
    const dbArticle = byFolder.get(folder);

    // Only possible if the row lost a race and was deleted again; skip it
    // rather than rendering a half-built article.
    if (!dbArticle) {
      continue;
    }

    // Read images in the folder
    let images: string[] = [];
    try {
      const folderPath = path.join(portfolioRoot, folder);
      const files = await readdir(folderPath);
      images = files
        .filter((file) => {
          const ext = path.extname(file).toLowerCase();
          return [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext);
        })
        // Sort numerically if filenames are numbers (e.g. 3.png, 10.png)
        .sort((a, b) => {
          const numA = parseInt(path.basename(a, path.extname(a)), 10);
          const numB = parseInt(path.basename(b, path.extname(b)), 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
        });
    } catch (err) {
      console.error(`Failed to read images from folder ${folder}:`, err);
    }

    articles.push({
      ...dbArticle,
      images,
    });
  }

  // Sort articles by date descending (Newest first), placing N/A at the end
  return articles.sort((a, b) => {
    if (a.date === "N/A" && b.date !== "N/A") return 1;
    if (a.date !== "N/A" && b.date === "N/A") return -1;
    if (a.date === "N/A" && b.date === "N/A") return a.title.localeCompare(b.title);
    return b.date.localeCompare(a.date);
  });
}
