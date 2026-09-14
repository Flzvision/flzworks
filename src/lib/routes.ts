export const GUIDE_PROTOTYPE_BASE_PATH = "/intranet/guide_prototype";
export const TREE_PROTOTYPE_BASE_PATH = "/intranet/tree_prototype";

export const GUIDE_PROTOTYPE_INTRANET_MODULE = "guide_prototype";
export const TREE_PROTOTYPE_INTRANET_MODULE = "tree_prototype";

export const ALLOWED_INTRANET_MODULES = [
  GUIDE_PROTOTYPE_INTRANET_MODULE,
  TREE_PROTOTYPE_INTRANET_MODULE,
] as const;

export type IntranetModule = typeof ALLOWED_INTRANET_MODULES[number];

export function withLang(path: string, locale: string) {
  return `${path}${path.includes("?") ? "&" : "?"}lang=${locale}`;
}
