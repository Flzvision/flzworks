import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/id", "/autosalon", "/uidesign", "/uidesign/*", "/privacy", "/cookies", "/terms", "/legal"],
        disallow: [
          "/studio",
          "/autosalon-new",
          "/intranet/",
          "/dashboard",
          "/login",
          "/register",
          "/sell",
          "/favorites",
          "/saved-searches",
          "/cars/",
          "/api/",
        ],
      },
    ],
    sitemap: "https://flz.works/sitemap.xml",
  };
}
