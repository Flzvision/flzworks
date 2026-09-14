/**
 * The public pages the studio can open in its frame.
 *
 * Grouped so the rail's picker stays readable now that the prototypes are
 * editable too. Adding a public route means adding it here — the frame will
 * happily load anything, but this is what the picker offers.
 */
export interface EditablePage {
  path: string;
  label: string;
  group: string;
}

export const EDITABLE_PAGES: EditablePage[] = [
  { path: "/", label: "Home", group: "Site" },
  { path: "/autosalon", label: "Autosalon", group: "Site" },
  { path: "/autosalon-new", label: "Autosalon (blueprint)", group: "Site" },
  { path: "/id", label: "ID card", group: "Site" },

  { path: "/uidesign", label: "Index", group: "Prototypes" },
  { path: "/uidesign/portfolio-hub", label: "Portfolio hub", group: "Prototypes" },
  { path: "/uidesign/control-center", label: "Control center", group: "Prototypes" },
  { path: "/uidesign/dynamic-island", label: "Dynamic island", group: "Prototypes" },
  { path: "/uidesign/liquid-glass", label: "Liquid glass", group: "Prototypes" },
  { path: "/uidesign/lucent-ui", label: "Lucent UI", group: "Prototypes" },
  { path: "/uidesign/widget-space", label: "Widget space", group: "Prototypes" },
];

export const EDITABLE_PAGE_GROUPS = Array.from(
  new Set(EDITABLE_PAGES.map((page) => page.group)),
);

export function labelForPath(path: string): string {
  return EDITABLE_PAGES.find((page) => page.path === path)?.label ?? path;
}
