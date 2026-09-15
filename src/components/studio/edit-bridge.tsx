"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EDITABLE_ATTR,
  EDITABLE_LABEL_ATTR,
  type EditableSection,
  type FrameMessage,
  parseEditableAttr,
  parseStudioMessage,
} from "@/lib/studio/edit-protocol";

const SELECTED_ATTR = "data-flz-selected";

/**
 * Looks a region up by its id.
 *
 * Done by scanning rather than with an attribute selector: the id contains a
 * colon and comes from page markup, and escaping it correctly for a quoted
 * attribute selector is a trap (`CSS.escape` is for identifiers and would
 * escape the colon, so the selector would never match).
 */
function findByEditableId(id: string): Element | null {
  for (const node of Array.from(document.querySelectorAll(`[${EDITABLE_ATTR}]`))) {
    if (node.getAttribute(EDITABLE_ATTR) === id) return node;
  }
  return null;
}

/**
 * Mounted on every public page. For an ordinary visitor it renders nothing and
 * registers nothing — it only wakes up when the studio shell, running in the
 * same origin one frame up, asks it to.
 *
 * While awake it does two jobs: it stops the site from handling its own input,
 * and it reports the regions annotated with `data-flz-editable` so the rail can
 * offer controls for them.
 */
export function EditBridge() {
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const post = useCallback((message: FrameMessage) => {
    if (window.parent === window) return;
    window.parent.postMessage(message, window.location.origin);
  }, []);

  const scan = useCallback((): EditableSection[] => {
    const seen = new Set<string>();
    const sections: EditableSection[] = [];

    for (const node of Array.from(document.querySelectorAll(`[${EDITABLE_ATTR}]`))) {
      const parsed = parseEditableAttr(node.getAttribute(EDITABLE_ATTR) ?? "");
      if (!parsed) continue;

      const id = `${parsed.kind}:${parsed.ref}`;
      // A record can legitimately appear twice on a page (say a project in both
      // a featured strip and the grid); the rail wants one entry per record.
      if (seen.has(id)) continue;
      seen.add(id);

      sections.push({
        id,
        kind: parsed.kind,
        ref: parsed.ref,
        label:
          node.getAttribute(EDITABLE_LABEL_ATTR)?.trim() ||
          node.textContent?.trim().slice(0, 60) ||
          parsed.ref,
        top: node.getBoundingClientRect().top + window.scrollY,
      });
    }

    sections.sort((a, b) => a.top - b.top);
    return sections;
  }, []);

  const report = useCallback(() => {
    post({ type: "frame:sections", path: window.location.pathname, sections: scan() });
  }, [post, scan]);

  // Handshake. The frame announces itself, then waits to be told to engage —
  // the URL parameter alone never activates edit mode, so a visitor who somehow
  // lands on a studio URL still gets a fully working site.
  useEffect(() => {
    if (window.parent === window) return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const message = parseStudioMessage(event.data);
      if (!message) return;

      switch (message.type) {
        case "studio:enable-edit":
          setActive(true);
          break;
        case "studio:disable-edit":
          setActive(false);
          setSelected(null);
          break;
        case "studio:rescan":
          report();
          break;
        case "studio:highlight":
          setSelected(message.id);
          break;
        case "studio:scroll-to":
          findByEditableId(message.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
          break;
      }
    };

    window.addEventListener("message", onMessage);
    post({ type: "frame:ready", path: window.location.pathname });

    return () => window.removeEventListener("message", onMessage);
  }, [post, report]);

  // Input suppression: captured at the document before the event can descend to
  // React's root container, so none of the site's own handlers run.
  useEffect(() => {
    if (!active) return;

    const swallow = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const onClick = (event: MouseEvent) => {
      swallow(event);
      const target = event.target;
      const node = target instanceof Element ? target.closest(`[${EDITABLE_ATTR}]`) : null;
      const id = node?.getAttribute(EDITABLE_ATTR);
      if (id) {
        setSelected(id);
        post({ type: "frame:selected", id });
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      // Let modifier combos through so reload and devtools still work.
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        swallow(event);
      }
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerdown", swallow, true);
    document.addEventListener("mousedown", swallow, true);
    document.addEventListener("submit", swallow, true);
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerdown", swallow, true);
      document.removeEventListener("mousedown", swallow, true);
      document.removeEventListener("submit", swallow, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [active, post]);

  // Mark the selected region with an attribute rather than generating a
  // selector for it, so page-authored ids never reach a stylesheet.
  useEffect(() => {
    if (!active) return;

    for (const node of Array.from(document.querySelectorAll(`[${SELECTED_ATTR}]`))) {
      node.removeAttribute(SELECTED_ATTR);
    }
    if (selected) findByEditableId(selected)?.setAttribute(SELECTED_ATTR, "true");
  }, [active, selected]);

  // Keep the rail's list in step with a page that renders regions lazily or
  // reflows. Bursts collapse into one report per frame.
  useEffect(() => {
    if (!active) return;

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        report();
      });
    };

    schedule();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [active, report]);

  if (!active) return null;

  return (
    <style
      // Outlines are drawn with box-shadow so they never affect layout — the
      // whole point of edit mode is that you are looking at the real page.
      dangerouslySetInnerHTML={{
        __html: `
          [${EDITABLE_ATTR}] {
            cursor: pointer !important;
            border-radius: 6px;
            transition: box-shadow 120ms ease, background-color 120ms ease;
          }
          [${EDITABLE_ATTR}]:hover {
            box-shadow: 0 0 0 2px rgba(0,102,204,.55), 0 0 0 6px rgba(0,102,204,.14) !important;
          }
          [${SELECTED_ATTR}="true"] {
            box-shadow: 0 0 0 2px rgba(0,102,204,1), 0 0 0 7px rgba(0,102,204,.18) !important;
          }
          @media (prefers-color-scheme: dark) {
            [${EDITABLE_ATTR}]:hover {
              box-shadow: 0 0 0 2px rgba(41,151,255,.6), 0 0 0 6px rgba(41,151,255,.16) !important;
            }
            [${SELECTED_ATTR}="true"] {
              box-shadow: 0 0 0 2px rgba(41,151,255,1), 0 0 0 7px rgba(41,151,255,.22) !important;
            }
          }
        `,
      }}
    />
  );
}
