"use client";

import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ExternalLink,
  ImagePlus,
  Layers,
  Pencil,
  Plus,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  EmptyState,
  Field,
  Modal,
  SearchBox,
  SectionHead,
  Segment,
  Spinner,
  Switch,
  type Notify,
} from "./ui";
import { CATEGORIES, GRADIENT_PRESETS, type FlzProjectData } from "./types";
import { relativeAge, toDateInputValue } from "@/lib/flz-date";
import s from "./studio.module.css";

type StatusFilter = "all" | "live" | "hidden" | "featured";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Visible" },
  { value: "hidden", label: "Hidden" },
  { value: "featured", label: "Featured" },
];

function blankProject(sortOrder: number): Partial<FlzProjectData> {
  return {
    title: "",
    tools: "Blender · Unity",
    category: "Characters",
    publishedAt: toDateInputValue(new Date()),
    gradient: GRADIENT_PRESETS[0].value,
    body: "",
    imageUrl: "",
    linkUrl: "",
    featured: false,
    visible: true,
    sortOrder,
  };
}

export function ProjectsPanel({
  projects,
  setProjects,
  notify,
}: {
  projects: FlzProjectData[];
  setProjects: Dispatch<SetStateAction<FlzProjectData[]>>;
  notify: Notify;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<Partial<FlzProjectData> | null>(null);
  const [deleting, setDeleting] = useState<FlzProjectData | null>(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const [reordering, setReordering] = useState(false);

  const categories = useMemo(() => {
    const known = new Set<string>(CATEGORIES);
    for (const p of projects) known.add(p.category);
    return ["All", ...known];
  }, [projects]);

  const isFiltered = query.trim() !== "" || category !== "All" || status !== "all";

  const visibleList = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesQuery =
        q === "" ||
        p.title.toLowerCase().includes(q) ||
        p.tools.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.body ?? "").toLowerCase().includes(q);
      const matchesCategory = category === "All" || p.category === category;
      const matchesStatus =
        status === "all" ||
        (status === "live" && p.visible) ||
        (status === "hidden" && !p.visible) ||
        (status === "featured" && p.featured);
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [projects, query, category, status]);

  const markPending = (id: string, on: boolean) =>
    setPending((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)));

  const patch = async (project: FlzProjectData, body: Partial<FlzProjectData>, done: string) => {
    markPending(project.id, true);
    try {
      const res = await fetch(`/api/flz/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.project) throw new Error(data?.error || "Update failed");
      // Functional update: two cards toggled in quick succession must not
      // overwrite each other with a list captured before the first response.
      setProjects((prev) => prev.map((p) => (p.id === project.id ? data.project : p)));
      notify(done);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      markPending(project.id, false);
    }
  };

  /** Swap a card with its neighbour, then renumber so ties can never stall it. */
  const move = async (id: string, direction: -1 | 1) => {
    const from = projects.findIndex((p) => p.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= projects.length) return;

    const reordered = [...projects];
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    const renumbered = reordered.map((p, index) => ({ ...p, sortOrder: index + 1 }));
    const previous = projects;
    setReordering(true);
    setProjects(renumbered);

    try {
      const res = await fetch("/api/flz/projects/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projects: renumbered.map(({ id: projectId, sortOrder }) => ({
            id: projectId,
            sortOrder,
          })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Could not save the new order");
      }
      notify("Order saved");
    } catch (err) {
      setProjects(previous);
      notify(err instanceof Error ? err.message : "Could not save the new order", "error");
    } finally {
      setReordering(false);
    }
  };

  const submit = async (values: Partial<FlzProjectData>) => {
    setSaving(true);
    const isEdit = Boolean(values.id);
    try {
      const res = await fetch(
        isEdit ? `/api/flz/projects/${values.id}` : "/api/flz/projects",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            sortOrder: values.sortOrder ?? projects.length + 1,
          }),
        },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.project) throw new Error(data?.error || "Could not save the post");

      // Re-sort so the #N badges, the reorder arrows and the public grid all
      // agree with the sortOrder that was just stored.
      setProjects((prev) =>
        (isEdit
          ? prev.map((p) => (p.id === data.project.id ? data.project : p))
          : [...prev, data.project]
        ).sort((a, b) => a.sortOrder - b.sortOrder),
      );
      setEditing(null);
      notify(isEdit ? `“${data.project.title}” updated` : `“${data.project.title}” created`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not save the post", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (project: FlzProjectData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/flz/projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete the post");
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      setDeleting(null);
      notify(`“${project.title}” deleted`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not delete the post", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionHead
        title="Posts"
      >
        <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setEditing(blankProject(projects.length + 1))}>
          <Plus size={15} strokeWidth={2.5} /> New post
        </button>
      </SectionHead>

      <div className={s.toolbar}>
        <div className={s.toolbarRow}>
          <SearchBox value={query} onChange={setQuery} placeholder="Search title, tools, description…" />
          <Segment
            value={status}
            options={STATUS_OPTIONS}
            onChange={setStatus}
            ariaLabel="Filter by status"
          />
        </div>
        <div className={s.chipRow}>
          <span className={s.chipRowLabel}>Category</span>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              className={`${s.chip} ${category === c ? s.chipActive : ""}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {visibleList.length === 0 ? (
        <EmptyState
          icon={<Layers size={26} />}
          title={projects.length === 0 ? "No posts yet" : "Nothing matches those filters"}
          body={
            projects.length === 0
              ? "Add your first post and it appears on flz.works right away."
              : "Try a different category or clear the filters to see the whole grid again."
          }
        >
          {isFiltered && (
            <button
              type="button"
              className={s.btn}
              onClick={() => {
                setQuery("");
                setCategory("All");
                setStatus("all");
              }}
            >
              Clear filters
            </button>
          )}
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setEditing(blankProject(projects.length + 1))}>
            <Plus size={15} strokeWidth={2.5} /> New post
          </button>
        </EmptyState>
      ) : (
        <div className={s.grid}>
          {visibleList.map((p) => {
            const index = projects.findIndex((o) => o.id === p.id);
            const busy = pending.includes(p.id);
            return (
              <article key={p.id} className={`${s.card} ${p.visible ? "" : s.cardDim}`}>
                <div className={s.cardBand}>
                  <div className={s.cardBandFill} style={{ background: p.gradient || "none" }} />
                  {p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- author-supplied URL, no loader
                    <img
                      src={p.imageUrl}
                      alt=""
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )}
                  <div className={s.cardBandTop}>
                    <span className={s.cardOrder}>#{index + 1}</span>
                    {p.featured && (
                      <span className={`${s.badge} ${s.badgeAmber}`}>
                        <Star size={9} fill="currentColor" /> Featured
                      </span>
                    )}
                  </div>
                </div>

                <div className={s.cardBody}>
                  <h3 className={s.cardTitle}>{p.title}</h3>
                  <div className={s.cardMeta}>
                    {p.category}
                    {relativeAge(p.publishedAt) ? ` · ${relativeAge(p.publishedAt)}` : ""} · {p.tools}
                  </div>
                  {p.body && <p className={s.cardDesc}>{p.body}</p>}
                  {p.linkUrl && (
                    <a
                      className={s.cardLink}
                      href={p.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={11} /> {p.linkUrl}
                    </a>
                  )}
                </div>

                <div className={s.cardFoot}>
                  <button
                    type="button"
                    className={`${s.pill} ${p.visible ? s.pillLive : s.pillHidden}`}
                    disabled={busy}
                    onClick={() =>
                      patch(
                        p,
                        { visible: !p.visible },
                        p.visible ? `“${p.title}” hidden` : `“${p.title}” visible`,
                      )
                    }
                    title={p.visible ? "Hide from flz.works" : "Show on flz.works"}
                  >
                    {busy && <Spinner size={11} />}
                    {p.visible ? "Visible" : "Hidden"}
                  </button>

                  <button
                    type="button"
                    className={`${s.iconBtn} ${p.featured ? s.iconBtnOn : ""}`}
                    disabled={busy}
                    onClick={() =>
                      patch(
                        p,
                        { featured: !p.featured },
                        p.featured ? "Removed from featured" : `“${p.title}” is featured`,
                      )
                    }
                    aria-pressed={p.featured}
                    aria-label={p.featured ? "Remove featured flag" : "Mark as featured"}
                    title={p.featured ? "Remove featured flag" : "Mark as featured"}
                  >
                    <Star size={14} fill={p.featured ? "currentColor" : "none"} />
                  </button>

                  <span className={s.cardFootSpacer} />

                  <button
                    type="button"
                    className={s.iconBtn}
                    disabled={isFiltered || reordering || index === 0}
                    onClick={() => move(p.id, -1)}
                    aria-label="Move up"
                    title={isFiltered ? "Clear filters to reorder" : "Move up"}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    className={s.iconBtn}
                    disabled={isFiltered || reordering || index === projects.length - 1}
                    onClick={() => move(p.id, 1)}
                    aria-label="Move down"
                    title={isFiltered ? "Clear filters to reorder" : "Move down"}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    className={s.iconBtn}
                    onClick={() => setEditing(p)}
                    aria-label={`Edit ${p.title}`}
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className={`${s.iconBtn} ${s.iconBtnDanger}`}
                    onClick={() => setDeleting(p)}
                    aria-label={`Delete ${p.title}`}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <ProjectDialog
          initial={editing}
          categories={categories.filter((c) => c !== "All")}
          saving={saving}
          onClose={() => setEditing(null)}
          onSubmit={submit}
        />
      )}

      {deleting && (
        <Modal
          title="Delete post"
          narrow
          onClose={() => setDeleting(null)}
          footer={
            <>
              <span className={s.modalFootSpacer} />
              <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={`${s.btn} ${s.btnDanger}`}
                disabled={saving}
                onClick={() => remove(deleting)}
              >
                {saving ? <Spinner /> : <Trash2 size={15} />} Delete
              </button>
            </>
          }
        >
          <p className={s.modalText}>
            <strong>{deleting.title}</strong> will be removed from the studio and from flz.works.
            This cannot be undone.
          </p>
          <p className={s.modalText}>
            To take it off the site without losing it, close this and switch the card to{" "}
            <strong>Hidden</strong> instead.
          </p>
        </Modal>
      )}
    </>
  );
}

/* ── Create / edit dialog ───────────────────────────────────────────────── */

function ProjectDialog({
  initial,
  categories,
  saving,
  onClose,
  onSubmit,
}: {
  initial: Partial<FlzProjectData>;
  categories: string[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: Partial<FlzProjectData>) => void;
}) {
  const [form, setForm] = useState<Partial<FlzProjectData>>(initial);
  const [touched, setTouched] = useState(false);
  const [customGradient, setCustomGradient] = useState(
    Boolean(form.gradient) && !GRADIENT_PRESETS.some((g) => g.value === form.gradient),
  );

  const set = <K extends keyof FlzProjectData>(key: K, value: FlzProjectData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const errors = {
    title: form.title?.trim() ? "" : "A title is required.",
    tools: form.tools?.trim() ? "" : "Name at least one tool.",
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const submit = () => {
    setTouched(true);
    if (hasErrors) {
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]')
          ?.focus();
      });
      return;
    }
    onSubmit({
      ...form,
      title: form.title?.trim(),
      tools: form.tools?.trim(),
      publishedAt: form.publishedAt?.trim() || null,
      body: form.body?.trim() || null,
      imageUrl: form.imageUrl?.trim() || null,
      linkUrl: form.linkUrl?.trim() || null,
      sortOrder: form.sortOrder ?? initial.sortOrder,
    });
  };

  return (
    <Modal
      title={initial.id ? "Edit post" : "New post"}
      onClose={onClose}
      confirmCloseMessage={dirty ? "Discard the unsaved post changes?" : undefined}
      footer={
        <>
          <span className={s.helper}>
            {form.visible === false ? "Saved as hidden" : "Visible on flz.works"}
          </span>
          <span className={s.modalFootSpacer} />
          <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={`${s.btn} ${s.btnPrimary}`}
            disabled={saving}
            onClick={submit}
          >
            {saving ? <Spinner /> : <Save size={15} />} Save post
          </button>
        </>
      }
    >
      <div className={s.modalGroup}>
        <div className={s.groupLabel}>Basics</div>
        <Field label="Title" required error={touched ? errors.title : ""}>
          <input
            className={`${s.input} ${touched && errors.title ? s.inputInvalid : ""}`}
            value={form.title ?? ""}
            placeholder="Ronin — stylized swordsman"
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>

        <div className={s.grid2}>
          <Field
            label="Tools"
            required
            hint="Shown above the card title."
            error={touched ? errors.tools : ""}
          >
            <input
              className={`${s.input} ${touched && errors.tools ? s.inputInvalid : ""}`}
              value={form.tools ?? ""}
              placeholder="Blender · ZBrush"
              onChange={(e) => set("tools", e.target.value)}
            />
          </Field>
          <Field label="Category" required>
            <select
              className={s.select}
              value={form.category ?? categories[0]}
              onChange={(e) => set("category", e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className={s.grid2}>
          <Field
            label="Date"
            hint={
              form.publishedAt
                ? `${relativeAge(form.publishedAt)}. Only shown here in the studio, not on the public card.`
                : "When the work was made. Older work is fine."
            }
          >
            <input
              type="date"
              className={`${s.input} ${s.inputMono}`}
              value={toDateInputValue(form.publishedAt)}
              max={toDateInputValue(new Date())}
              onChange={(e) => set("publishedAt", e.target.value)}
            />
          </Field>
          <Field label="Sort order" hint="Lower shows first. Arrows in the grid do this too.">
            <input
              type="number"
              className={`${s.input} ${s.inputMono}`}
              value={form.sortOrder ?? ""}
              onChange={(e) => {
                // An emptied field means "leave it alone", not "pin to the front".
                const next = Number.parseInt(e.target.value, 10);
                setForm((prev) => ({
                  ...prev,
                  sortOrder: Number.isNaN(next) ? undefined : next,
                }));
              }}
            />
          </Field>
        </div>
      </div>

      <div className={s.modalGroup}>
        <div className={s.groupLabel}>Card wash</div>
        <div className={s.swatchGrid}>
          {GRADIENT_PRESETS.map((preset) => {
            const active = form.gradient === preset.value;
            return (
              <button
                key={preset.label}
                type="button"
                className={`${s.swatch} ${active ? s.swatchActive : ""}`}
                aria-pressed={active}
                onClick={() => {
                  set("gradient", preset.value);
                  setCustomGradient(false);
                }}
              >
                <span className={s.swatchFill} style={{ background: preset.value }} />
                {active && (
                  <span className={s.swatchCheck}>
                    <Check size={13} strokeWidth={3} />
                  </span>
                )}
                <span className={s.swatchName}>{preset.label}</span>
              </button>
            );
          })}
        </div>
        <Switch
          checked={customGradient}
          onChange={setCustomGradient}
          label="Custom CSS background"
          hint="Paste any CSS background value instead of a preset."
        />
        {customGradient && (
          <Field label="CSS background">
            <input
              className={`${s.input} ${s.inputMono}`}
              value={form.gradient ?? ""}
              placeholder="radial-gradient(…)"
              onChange={(e) => set("gradient", e.target.value)}
            />
          </Field>
        )}
      </div>

      <div className={s.modalGroup}>
        <div className={s.groupLabel}>Details</div>
        <Field
          label="Article text"
          hint="The card shows the first line or two; the rest appears when it is opened."
          counter={`${(form.body ?? "").length}/2000`}
        >
          <textarea
            className={s.textarea}
            rows={5}
            value={form.body ?? ""}
            maxLength={2000}
            placeholder="Hand-painted, 24k tris, game-ready character from block-out to pose."
            onChange={(e) => set("body", e.target.value)}
          />
        </Field>
        <PictureField
          value={form.imageUrl ?? ""}
          onChange={(url) => set("imageUrl", url)}
        />
        <Field label="Link" hint="Opens when a visitor clicks the card on flz.works.">
          <input
            className={`${s.input} ${s.inputMono}`}
            value={form.linkUrl ?? ""}
            placeholder="https://sketchfab.com/…"
            onChange={(e) => set("linkUrl", e.target.value)}
          />
        </Field>
      </div>

      <div className={s.modalGroup}>
        <div className={s.groupLabel}>Publishing</div>
        <Switch
          checked={form.visible ?? true}
          onChange={(v) => set("visible", v)}
          label="Visible on flz.works"
          hint="Off keeps the card in the studio only."
        />
        <Switch
          checked={form.featured ?? false}
          onChange={(v) => set("featured", v)}
          label="Featured"
          hint="Flags the post as the current highlight."
        />
      </div>
    </Modal>
  );
}

/* ── Picture: upload or paste a URL ─────────────────────────────────────── */

function PictureField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    setUploading(true);
    setError("");

    try {
      const data = new FormData();
      data.append("file", file);

      const res = await fetch("/api/flz/upload", { method: "POST", body: data });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.url) {
        throw new Error(payload?.error || "The image could not be uploaded.");
      }

      onChange(payload.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The image could not be uploaded.");
    } finally {
      setUploading(false);
      // Let the same file be picked again after a failure.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Field
      label="Picture"
      hint="JPG, PNG or WebP, up to 5 MB. Falls back to the card wash when empty."
      error={error}
    >
      <div className={s.fieldRow}>
        <div
          aria-hidden={!value}
          style={{
            position: "relative",
            width: 96,
            aspectRatio: "4 / 3",
            flexShrink: 0,
            overflow: "hidden",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.14)",
            background: "rgba(255,255,255,.05)",
          }}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- author-supplied URL, no loader
            <img
              src={value}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: "100%",
                height: "100%",
                color: "rgba(255,255,255,.35)",
              }}
            >
              <ImagePlus size={18} />
            </span>
          )}
        </div>

        <div style={{ display: "grid", gap: 8, flex: 1, minWidth: 0 }}>
          <input
            className={`${s.input} ${s.inputMono}`}
            value={value}
            placeholder="/media/… or https://…"
            onChange={(e) => onChange(e.target.value)}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <button
              type="button"
              className={`${s.btn} ${s.btnSm}`}
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Spinner size={13} /> : <ImagePlus size={14} />}
              {uploading ? "Uploading…" : "Upload image"}
            </button>
            {value && (
              <button
                type="button"
                className={`${s.btn} ${s.btnSm} ${s.btnGhost}`}
                disabled={uploading}
                onClick={() => {
                  onChange("");
                  setError("");
                }}
              >
                <X size={14} /> Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </Field>
  );
}
