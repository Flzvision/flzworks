"use client";

import { useEffect } from "react";

/**
 * Keeps the document canvas in step with whatever the current page is painting.
 *
 * iOS Safari does not stop at the page: it fills the strip behind the status bar
 * and the one behind the bottom toolbar with the *document* background, and it
 * tints the toolbars from `<meta name="theme-color">`. A dark page whose colour
 * lives on an inner wrapper therefore gets white bands top and bottom on iPhone.
 *
 * Mounting this inside a page hands both of those the page's own colour, and
 * restores the previous values on unmount so a route change doesn't leave a
 * stale tint behind.
 */
export function ThemeCanvas({
  color,
  colorScheme,
}: {
  /** The colour Safari should paint behind the system bars — usually the page background. */
  color: string;
  /** Drives form controls and scrollbars; also tells Safari which bar style to use. */
  colorScheme?: "light" | "dark";
}) {
  useEffect(() => {
    const root = document.documentElement;
    const previousCanvas = root.style.getPropertyValue("--app-canvas");
    const previousScheme = root.style.colorScheme;

    root.style.setProperty("--app-canvas", color);
    if (colorScheme) root.style.colorScheme = colorScheme;

    // Next renders its own theme-color metas with a `media` attribute; this one
    // is unqualified so it wins for the current page regardless of the OS theme.
    const META_ID = "app-theme-color";
    let meta = document.getElementById(META_ID) as HTMLMetaElement | null;
    let created = false;
    if (!meta) {
      meta = document.createElement("meta");
      meta.id = META_ID;
      meta.name = "theme-color";
      document.head.appendChild(meta);
      created = true;
    }
    meta.content = color;

    return () => {
      if (previousCanvas) root.style.setProperty("--app-canvas", previousCanvas);
      else root.style.removeProperty("--app-canvas");
      root.style.colorScheme = previousScheme;
      if (created) meta?.remove();
    };
  }, [color, colorScheme]);

  return null;
}
