/**
 * Message contract between the studio shell and the site rendered inside its
 * iframe.
 *
 * The shell and the frame are separate documents, so every interaction between
 * them crosses a postMessage boundary. Both sides import these types so the two
 * halves cannot drift apart silently.
 *
 * Nothing here grants any authority. Edit mode only suppresses the site's own
 * click handling and reports which regions are annotated as editable — every
 * mutation still goes through the authenticated studio API routes. That means a
 * stray `?flzEdit=1` in a visitor's URL cannot expose anything; it is also why
 * the frame waits for a same-origin handshake before engaging, so such a URL
 * does not leave a visitor unable to click.
 */

/** Marks a frame as belonging to the studio, so it knows to expect a handshake. */
export const EDIT_FRAME_PARAM = "flzEdit";

/** Attribute an editable region carries: `data-flz-editable="kind:ref"`. */
export const EDITABLE_ATTR = "data-flz-editable";

/** Optional human-readable name: `data-flz-label="Hero headline"`. */
export const EDITABLE_LABEL_ATTR = "data-flz-label";

/** What part of the data model a region maps to. */
export type EditableKind = "setting" | "project" | "article" | "social";

export const EDITABLE_KINDS: readonly EditableKind[] = [
  "setting",
  "project",
  "article",
  "social",
];

export function isEditableKind(value: string): value is EditableKind {
  return (EDITABLE_KINDS as readonly string[]).includes(value);
}

/** A region of the live page the rail can edit. */
export interface EditableSection {
  /** Stable identity for this region within the page: `${kind}:${ref}`. */
  id: string;
  kind: EditableKind;
  /** The record this maps to — a FlzSetting key, FlzProject id, and so on. */
  ref: string;
  /** What to call it in the rail. */
  label: string;
  /** Document position, so the rail can order regions the way the page does. */
  top: number;
}

/** Shell → frame. */
export type StudioMessage =
  | { type: "studio:enable-edit" }
  | { type: "studio:disable-edit" }
  | { type: "studio:rescan" }
  | { type: "studio:highlight"; id: string | null }
  | { type: "studio:scroll-to"; id: string };

/** Frame → shell. */
export type FrameMessage =
  | { type: "frame:ready"; path: string }
  | { type: "frame:sections"; path: string; sections: EditableSection[] }
  | { type: "frame:selected"; id: string }
  | { type: "frame:navigated"; path: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Both parsers below reject anything that is not a well-formed message of the
 * expected direction. A postMessage listener receives traffic from browser
 * extensions and dev tooling too, so an unrecognised shape has to be ignored
 * rather than assumed.
 */
export function parseStudioMessage(data: unknown): StudioMessage | null {
  if (!isRecord(data) || typeof data.type !== "string") return null;

  switch (data.type) {
    case "studio:enable-edit":
    case "studio:disable-edit":
    case "studio:rescan":
      return { type: data.type };
    case "studio:highlight":
      return {
        type: "studio:highlight",
        id: typeof data.id === "string" ? data.id : null,
      };
    case "studio:scroll-to":
      return typeof data.id === "string" ? { type: "studio:scroll-to", id: data.id } : null;
    default:
      return null;
  }
}

export function parseFrameMessage(data: unknown): FrameMessage | null {
  if (!isRecord(data) || typeof data.type !== "string") return null;

  switch (data.type) {
    case "frame:ready":
      return typeof data.path === "string" ? { type: "frame:ready", path: data.path } : null;
    case "frame:navigated":
      return typeof data.path === "string" ? { type: "frame:navigated", path: data.path } : null;
    case "frame:selected":
      return typeof data.id === "string" ? { type: "frame:selected", id: data.id } : null;
    case "frame:sections": {
      if (typeof data.path !== "string" || !Array.isArray(data.sections)) return null;
      const sections: EditableSection[] = [];
      for (const raw of data.sections) {
        if (!isRecord(raw)) continue;
        const { id, kind, ref, label, top } = raw;
        if (
          typeof id !== "string" ||
          typeof kind !== "string" ||
          !isEditableKind(kind) ||
          typeof ref !== "string" ||
          typeof label !== "string" ||
          typeof top !== "number"
        ) {
          continue;
        }
        sections.push({ id, kind, ref, label, top });
      }
      return { type: "frame:sections", path: data.path, sections };
    }
    default:
      return null;
  }
}

/** Splits a `data-flz-editable` value into its kind and ref. */
export function parseEditableAttr(
  value: string,
): { kind: EditableKind; ref: string } | null {
  const separator = value.indexOf(":");
  if (separator <= 0) return null;

  const kind = value.slice(0, separator);
  const ref = value.slice(separator + 1);
  if (!isEditableKind(kind) || !ref) return null;

  return { kind, ref };
}
