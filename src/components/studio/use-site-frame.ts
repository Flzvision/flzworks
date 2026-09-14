"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type EditableSection,
  EDIT_FRAME_PARAM,
  parseFrameMessage,
  type StudioMessage,
} from "@/lib/studio/edit-protocol";

export interface SiteFrameState {
  /** Attach to the `<iframe>` that hosts the site. */
  frameRef: React.RefObject<HTMLIFrameElement | null>;
  /** Path currently loaded in the frame, as the frame reports it. */
  path: string;
  /** Editable regions on that page, in document order. */
  sections: EditableSection[];
  /** Region the user picked, either in the page or in the rail. */
  selected: string | null;
  /** True once the frame has completed the handshake. */
  ready: boolean;
  /** Whether the site's own input handling is currently suppressed. */
  editing: boolean;
  setEditing: (editing: boolean) => void;
  select: (id: string | null) => void;
  /** Point the frame at another page. */
  navigate: (path: string) => void;
  /** Ask the frame to re-scan, e.g. after a save changes the page. */
  rescan: () => void;
  /** Reload the frame so a save is reflected in what it renders. */
  reload: () => void;
  /** Use as the iframe's `key`: changing it remounts the frame. */
  frameKey: string;
}

/** Adds the marker the bridge looks for, preserving any existing query. */
export function editFrameUrl(path: string): string {
  const [base, query] = path.split("?");
  const params = new URLSearchParams(query);
  params.set(EDIT_FRAME_PARAM, "1");
  return `${base}?${params.toString()}`;
}

/**
 * Owns the studio side of the frame protocol: tracks what the frame is showing,
 * relays commands to it, and keeps the rail's section list current.
 */
export function useSiteFrame(initialPath: string): SiteFrameState {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [path, setPath] = useState(initialPath);
  const [sections, setSections] = useState<EditableSection[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditingState] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const send = useCallback((message: StudioMessage) => {
    frameRef.current?.contentWindow?.postMessage(message, window.location.origin);
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Same-origin only: the frame is our own site, and postMessage traffic
      // from extensions or embedded third parties must not drive the rail.
      if (event.origin !== window.location.origin) return;
      if (frameRef.current && event.source !== frameRef.current.contentWindow) return;

      const message = parseFrameMessage(event.data);
      if (!message) return;

      switch (message.type) {
        case "frame:ready":
          setReady(true);
          setPath(message.path);
          break;
        case "frame:navigated":
          // A fresh document means the previous page's regions are gone.
          setPath(message.path);
          setSections([]);
          setSelected(null);
          break;
        case "frame:sections":
          setPath(message.path);
          setSections(message.sections);
          break;
        case "frame:selected":
          setSelected(message.id);
          break;
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // The frame reloads on navigation, so re-assert edit mode whenever it
  // completes a handshake rather than only when the toggle changes.
  useEffect(() => {
    if (!ready) return;
    send({ type: editing ? "studio:enable-edit" : "studio:disable-edit" });
  }, [ready, editing, send]);

  const setEditing = useCallback((next: boolean) => {
    setEditingState(next);
    if (!next) setSelected(null);
  }, []);

  const select = useCallback(
    (id: string | null) => {
      setSelected(id);
      send({ type: "studio:highlight", id });
      if (id) send({ type: "studio:scroll-to", id });
    },
    [send],
  );

  const navigate = useCallback((next: string) => {
    setReady(false);
    setSections([]);
    setSelected(null);
    setPath(next);
  }, []);

  const rescan = useCallback(() => send({ type: "studio:rescan" }), [send]);

  // Remount rather than reassigning the element's src: React owns the element,
  // and a new key gives a clean document and a fresh handshake.
  const reload = useCallback(() => {
    setReady(false);
    setSections([]);
    setReloadToken((token) => token + 1);
  }, []);

  return {
    frameRef,
    path,
    sections,
    selected,
    ready,
    editing,
    setEditing,
    select,
    navigate,
    rescan,
    reload,
    frameKey: `${path}#${reloadToken}`,
  };
}
