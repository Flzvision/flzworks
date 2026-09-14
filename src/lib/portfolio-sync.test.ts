import { describe, expect, it, vi } from "vitest";
import { parseFolderName, syncPortfolioArticles } from "./portfolio-sync";
import { prisma } from "./prisma";
import type { PortfolioArticle } from "@prisma/client";
import { readdir } from "fs/promises";

vi.mock("fs/promises", () => ({
  readdir: vi.fn(),
}));

vi.mock("./prisma", () => ({
  prisma: {
    portfolioArticle: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

describe("portfolio-sync", () => {
  it("parses folder name correctly", () => {
    const { title, date } = parseFolderName("mirsairen_concept_2026_11_17");
    expect(title).toBe("Mirsairen Concept");
    expect(date).toBe("2026-11-17");
  });

  it("assigns categories based on folder/title keywords", async () => {
    // Mock readdir to return some folders on first call, and string filenames on subsequent calls
    vi.mocked(readdir).mockImplementation(async (dirPath: any, options?: any) => {
      if (options && options.withFileTypes) {
        return [
          { name: "lego_technic_car_2026_11_17", isDirectory: () => true },
          { name: "godot_game_project_2026_11_18", isDirectory: () => true },
          { name: "poster_design_2026_11_19", isDirectory: () => true },
          { name: "mirsairen_hypercar_2026_11_20", isDirectory: () => true },
          { name: "unknown_project_2026_11_21", isDirectory: () => true },
        ] as any;
      }
      return ["1.png", "2.jpg"];
    });

    // The sync reads existing rows, inserts the folders it did not find, then
    // reads those back. Start with an empty table so every folder is created,
    // and serve the read-back from what createMany was handed.
    const createdRows: PortfolioArticle[] = [];
    // The read-back is handed the same array createMany fills in, so the first
    // call sees an empty table and the second sees the freshly inserted rows.
    vi.mocked(prisma.portfolioArticle.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(createdRows);

    vi.mocked(prisma.portfolioArticle.createMany).mockImplementation((args) => {
      const rows = Array.isArray(args?.data) ? args.data : [args!.data];
      for (const row of rows) {
        createdRows.push({
          id: `mocked-${row.folderName}`,
          ...row,
          description: row.description ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as PortfolioArticle);
      }
      return Promise.resolve({ count: rows.length }) as ReturnType<
        typeof prisma.portfolioArticle.createMany
      >;
    });

    const result = await syncPortfolioArticles();

    // One read for existing rows, one insert, one read-back — never one query
    // per folder, however many folders there are.
    expect(vi.mocked(prisma.portfolioArticle.findMany)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(prisma.portfolioArticle.createMany)).toHaveBeenCalledTimes(1);

    expect(createdRows.map((row) => row.category)).toEqual([
      "BRICKWORKS",
      "GAMES",
      "MEDIA",
      "CAR_DESIGN",
      "OTHER",
    ]);

    // Check that images are correctly attached
    expect(result[0].images).toEqual(["1.png", "2.jpg"]);
  });
});
