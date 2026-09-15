"use client";

import { useMemo, useState } from "react";
import { Archive, Inbox, Mail, MailOpen, RotateCcw, Trash2 } from "lucide-react";
import { EmptyState, Panel, SectionHead, Spinner, type Notify } from "./ui";
import s from "./studio.module.css";

export type MessageStatus = "NEW" | "READ" | "ARCHIVED";

export interface StudioMessage {
  id: string;
  name: string | null;
  email: string | null;
  message: string;
  source: string;
  status: MessageStatus;
  createdAt: string;
  updatedAt: string;
}

type MessageFilter = "inbox" | "unread" | "archived";

function formatMessageDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function MessagesPanel({ initial, notify }: { initial: StudioMessage[]; notify: Notify }) {
  const [messages, setMessages] = useState(initial);
  const [filter, setFilter] = useState<MessageFilter>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const unreadCount = messages.filter((item) => item.status === "NEW").length;
  // The open message always stays in the list. Opening an unread one marks it
  // read, which would otherwise drop it out of the Unread filter the instant
  // you started reading it.
  const filtered = useMemo(() => messages.filter((item) => {
    if (item.id === selectedId) return true;
    if (filter === "archived") return item.status === "ARCHIVED";
    if (filter === "unread") return item.status === "NEW";
    return item.status !== "ARCHIVED";
  }), [filter, messages, selectedId]);

  const updateStatus = async (id: string, status: MessageStatus) => {
    setBusyId(id);
    try {
      const response = await fetch(`/api/flz/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.message) throw new Error(payload?.error || "Could not update message");
      setMessages((current) => current.map((item) => item.id === id ? {
        ...item,
        status: payload.message.status,
        updatedAt: payload.message.updatedAt,
      } : item));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not update message", "error");
    } finally {
      setBusyId(null);
    }
  };

  const openMessage = (item: StudioMessage) => {
    setSelectedId((current) => current === item.id ? null : item.id);
    setConfirmDeleteId(null);
    if (item.status === "NEW") void updateStatus(item.id, "READ");
  };

  const deleteMessage = async (id: string) => {
    setBusyId(id);
    try {
      const response = await fetch(`/api/flz/messages/${id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Could not delete message");
      setMessages((current) => current.filter((item) => item.id !== id));
      setSelectedId(null);
      setConfirmDeleteId(null);
      notify("Message deleted");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not delete message", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <SectionHead
        eyebrow="Contact"
        title="Messages"
        description="Messages submitted through the FLZ Works and Autosalon contact forms. Nothing is forwarded to a mailbox."
      />

      <Panel
        icon={<Inbox size={16} />}
        title="Inbox"
        right={<span className={s.messageUnreadCount}>{unreadCount} unread</span>}
      >
        <div className={s.messageFilters} role="group" aria-label="Filter messages">
          {([
            ["inbox", "Inbox"],
            ["unread", "Unread"],
            ["archived", "Archived"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`${s.segmentBtn} ${filter === id ? s.segmentBtnActive : ""}`}
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Mail size={21} />}
            title={filter === "archived" ? "No archived messages" : "Your inbox is clear"}
            body="New contact-form submissions will appear here."
          />
        ) : (
          <div className={s.messageList}>
            {filtered.map((item) => {
              const open = selectedId === item.id;
              const busy = busyId === item.id;
              return (
                <article key={item.id} className={`${s.messageItem} ${item.status === "NEW" ? s.messageItemUnread : ""}`}>
                  <button type="button" className={s.messageSummary} aria-expanded={open} onClick={() => openMessage(item)}>
                    <span className={s.messageState} aria-hidden="true">{item.status === "NEW" ? <Mail size={16} /> : <MailOpen size={16} />}</span>
                    <span className={s.messageSender}>
                      <strong>{item.name || "Anonymous"}</strong>
                      <span>{item.email || "No reply email"}</span>
                    </span>
                    <span className={s.messagePreview}>{item.message}</span>
                    <span className={s.messageMeta}>
                      <span>{item.source === "main" ? "FLZ Works" : item.source === "autosalon" ? "Autosalon" : "Portfolio"}</span>
                      <time dateTime={item.createdAt}>{formatMessageDate(item.createdAt)}</time>
                    </span>
                  </button>

                  {open && (
                    <div className={s.messageDetail}>
                      <p>{item.message}</p>
                      <div className={s.messageActions}>
                        {busy && <Spinner size={14} />}
                        {item.status !== "ARCHIVED" ? (
                          <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnGhost}`} disabled={busy} onClick={() => void updateStatus(item.id, item.status === "NEW" ? "READ" : "NEW")}>
                            {item.status === "NEW" ? <MailOpen size={14} /> : <Mail size={14} />}
                            {item.status === "NEW" ? "Mark read" : "Mark unread"}
                          </button>
                        ) : null}
                        <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnGhost}`} disabled={busy} onClick={() => void updateStatus(item.id, item.status === "ARCHIVED" ? "READ" : "ARCHIVED")}>
                          {item.status === "ARCHIVED" ? <RotateCcw size={14} /> : <Archive size={14} />}
                          {item.status === "ARCHIVED" ? "Restore" : "Archive"}
                        </button>
                        <span className={s.messageActionSpacer} />
                        {confirmDeleteId === item.id ? (
                          <>
                            <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnGhost}`} onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                            <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnDanger}`} disabled={busy} onClick={() => void deleteMessage(item.id)}>Delete permanently</button>
                          </>
                        ) : (
                          <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnDanger}`} disabled={busy} onClick={() => setConfirmDeleteId(item.id)}>
                            <Trash2 size={14} /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
