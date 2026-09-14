import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const resetSeedData = process.env.RESET_SEED_DATA === "true";
  const productionResetAllowed = process.env.ALLOW_PRODUCTION_SEED_RESET === "true";

  if (resetSeedData && process.env.NODE_ENV === "production" && !productionResetAllowed) {
    throw new Error(
      "Refusing to reset seed data in production. Set ALLOW_PRODUCTION_SEED_RESET=true only for an intentional emergency reset.",
    );
  }

  // Password comes from the environment so no admin credential is committed.
  // Without it an existing admin is still refreshed; only creation needs one.
  const adminEmail = "floszbeni@gmail.com";
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existingAdmin) {
    await prisma.user.update({
      where: { email: adminEmail },
      data: { name: "Bence Flosz", role: "ADMIN" },
    });
  } else if (seedAdminPassword) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Bence Flosz",
        passwordHash: await bcrypt.hash(seedAdminPassword, 12),
        role: "ADMIN",
      },
    });
  } else {
    console.warn(
      `No ${adminEmail} user and no SEED_ADMIN_PASSWORD set - skipping admin seed.`,
    );
  }

  // ── Seed FLZ.works Projects & Hero Settings ────────────────────────────────
  const flzProjectCount = await prisma.flzProject.count();
  if (flzProjectCount === 0 || resetSeedData) {
    if (resetSeedData) {
      await prisma.flzProject.deleteMany({});
    }

    const initialProjects = [
      {
        title: "Ronin — swordsman",
        tools: "Blender · ZBrush",
        category: "Characters",
        gradient: "radial-gradient(120% 130% at 24% 6%,rgba(216,195,166,.62),rgba(120,96, 72,.12) 55%,transparent 76%)",
        body: "Hand-painted, 24k tris, game-ready character breakdown from block-out to pose.",
        featured: true,
        visible: true,
        sortOrder: 1,
      },
      {
        title: "Kessler R-7 coupe",
        tools: "Blender · Substance",
        category: "Automotive",
        gradient: "radial-gradient(120% 130% at 78% 6%,rgba(169,182,160,.58),rgba(95,107,82,.12) 55%,transparent 76%)",
        body: "Cyberpunk retro-futuristic automotive model with PBR material breakdown.",
        featured: false,
        visible: true,
        sortOrder: 2,
      },
      {
        title: "Dust Runner demo",
        tools: "Unity · Godot",
        category: "Gameplay",
        gradient: "radial-gradient(120% 130% at 30% 82%,rgba(176,166,192,.55),rgba(95, 86,112,.12) 55%,transparent 76%)",
        body: "High-octane desert hovering mechanics built with custom physics controllers.",
        featured: false,
        visible: true,
        sortOrder: 3,
      },
      {
        title: "Impact VFX pack",
        tools: "HLSL · Niagara",
        category: "Assets",
        gradient: "radial-gradient(120% 130% at 72% 24%,rgba(199,169,160,.58),rgba(122,90, 80,.12) 55%,transparent 76%)",
        body: "Stylized explosion and impact visual effects with customizable shaders.",
        featured: false,
        visible: true,
        sortOrder: 4,
      },
      {
        title: "Skybound ch.3 boss",
        tools: "Unity · C#",
        category: "Gameplay",
        gradient: "radial-gradient(120% 130% at 20% 28%,rgba(201,183,154,.58),rgba(138,122,85,.12) 55%,transparent 76%)",
        body: "Multi-phase boss encounter with complex AI state machine and arena hazards.",
        featured: false,
        visible: true,
        sortOrder: 5,
      },
      {
        title: "Modular crate kit",
        tools: "Blender · Hard-surface",
        category: "Assets",
        gradient: "radial-gradient(120% 130% at 62% 72%,rgba(159,180,184,.55),rgba(86, 108,112,.12) 55%,transparent 76%)",
        body: "Modular hard-surface prop pack designed for rapid level decoration.",
        featured: false,
        visible: true,
        sortOrder: 6,
      },
    ];

    for (const project of initialProjects) {
      await prisma.flzProject.create({ data: project });
    }
  }

  const defaultSettings = [
    { key: "hero_headline", value: "Games and 3D,\nbuilt in public." },
    { key: "building_start_date", value: "2023-09-01" },
    { key: "followers_count", value: "soon" },
    { key: "wishlists_count", value: "soon" },
    { key: "discord_url", value: "https://discord.gg" },
  ];

  for (const setting of defaultSettings) {
    await prisma.flzSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
