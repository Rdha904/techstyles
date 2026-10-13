"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Pencil,
  Trash2,
  X,
  Folder,
  Scissors,
  Layers,
  Palette,
  Ruler,
  Paperclip,
  Image as ImageIcon,
  Upload,
  ArrowUpRight,
} from "lucide-react";
import type { LibraryCollection, LibraryItem } from "@/lib/types";
import "./libraries.css";

type Draft = {
  name: string;
  description: string;
  color: string;
  data: Record<string, unknown>;
};
const definitions: Record<
  LibraryCollection,
  { title: string; singular: string; description: string; icon: typeof Folder }
> = {
  projects: {
    title: "Projects",
    singular: "project",
    description: "Keep your collections and ideas organized in one place.",
    icon: Folder,
  },
  sketches: {
    title: "Sketches",
    singular: "sketch",
    description:
      "Your library of technical drawings, ready for your next design.",
    icon: Scissors,
  },
  materials: {
    title: "Materials",
    singular: "material",
    description:
      "Manage fabrics, trims, and everything that goes into your products.",
    icon: Layers,
  },
  artworks: {
    title: "Artworks",
    singular: "artwork",
    description: "All your prints, graphics, and artwork in one place.",
    icon: ImageIcon,
  },
  colors: {
    title: "Colors",
    singular: "color",
    description: "Create a consistent color palette for your collections.",
    icon: Palette,
  },
  "size-charts": {
    title: "Size Charts",
    singular: "size chart",
    description: "Reusable measurements for a perfect fit, every time.",
    icon: Ruler,
  },
  attachments: {
    title: "Attachments",
    singular: "attachment",
    description: "A home for the files and references behind your products.",
    icon: Paperclip,
  },
};
const value = (item: { data?: Record<string, unknown> }, key: string) =>
  String(item.data?.[key] ?? "");
const blankDraft = (): Draft => ({
  name: "",
  description: "",
  color: "#718792",
  data: {},
});

export function LibraryPage({ collection }: { collection: string }) {
  const definition =
    definitions[collection as LibraryCollection] ?? definitions.projects;
  const Icon = definition.icon;
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">(
    collection === "materials" ? "list" : "grid",
  );
  const [tab, setTab] = useState("all");
  const [supplier, setSupplier] = useState("");
  const [type, setType] = useState("");
  const [unit, setUnit] = useState("");
  const [editing, setEditing] = useState<LibraryItem | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/libraries")
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Could not load your library. Please try again.");
        const data: LibraryItem[] = await response.json();
        if (active) setItems(data);
      })
      .catch((failure: Error) => {
        if (active) setError(failure.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const collectionItems = items.filter(
    (item) => item.collection === collection,
  );
  const visibleItems = collectionItems.filter(
    (item) =>
      `${item.name} ${item.description} ${Object.values(item.data ?? {}).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!supplier || value(item, "supplier") === supplier) &&
      (!type || value(item, "type") === type) &&
      (!unit || value(item, "unit") === unit) &&
      (collection !== "materials" ||
        (tab === "templates"
          ? Boolean(item.data?.isTemplate)
          : !item.data?.isTemplate)),
  );
  const options = (key: string) => [
    ...new Set(collectionItems.map((item) => value(item, key)).filter(Boolean)),
  ];
  const updateData = (key: string, entry: string) =>
    setDraft((previous) => ({
      ...previous,
      data: { ...previous.data, [key]: entry },
    }));

  function openEditor(item?: LibraryItem) {
    setError("");
    setDraft(
      item
        ? {
            name: item.name,
            description: item.description,
            color: item.color || "#718792",
            data: { ...item.data },
          }
        : { ...blankDraft(), data: { isTemplate: tab === "templates" } },
    );
    setEditing(item ?? "new");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        editing === "new" ? "/api/libraries" : `/api/libraries/${editing?.id}`,
        {
          method: editing === "new" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...draft, collection }),
        },
      );
      if (!response.ok)
        throw new Error("Your changes could not be saved. Please try again.");
      const saved: LibraryItem = await response.json();
      setItems((previous) =>
        editing === "new"
          ? [...previous, saved]
          : previous.map((item) => (item.id === saved.id ? saved : item)),
      );
      setNotice(`${saved.name} saved to your library.`);
      setEditing(null);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: LibraryItem) {
    if (!window.confirm(`Delete “${item.name}” from your library?`)) return;
    try {
      const response = await fetch(`/api/libraries/${item.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Could not delete this item.");
      setItems((previous) => previous.filter((entry) => entry.id !== item.id));
      setNotice(`${item.name} deleted.`);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not delete this item.",
      );
    }
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: form,
      });
      if (!response.ok)
        throw new Error(
          "Upload failed. Use a PNG, JPG, WebP or PDF file under 10 MB.",
        );
      const result: { url: string } = await response.json();
      setDraft((previous) => ({
        ...previous,
        name: previous.name || file.name.replace(/\.[^.]+$/, ""),
        data: { ...previous.data, url: result.url, fileName: file.name },
      }));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const preview = (item: LibraryItem) =>
    collection === "colors" ? (
      <div
        className="library-color"
        style={{ backgroundColor: item.color || "#718792" }}
      >
        <span>{item.color}</span>
      </div>
    ) : value(item, "url") &&
      !value(item, "url").toLowerCase().endsWith(".pdf") ? (
      <div className="library-image">
        <img src={value(item, "url")} alt={item.name} />
      </div>
    ) : (
      <div className="library-image library-placeholder">
        <Icon size={38} strokeWidth={1.15} />
      </div>
    );
  const actions = (item: LibraryItem) => (
    <div className="library-actions">
      <button
        className="icon-button"
        title={`Edit ${item.name}`}
        onClick={() => openEditor(item)}
      >
        <Pencil size={15} />
      </button>
      {value(item, "url") && (
        <a
          className="icon-button"
          href={value(item, "url")}
          target="_blank"
          rel="noreferrer"
          title={`Open ${item.name}`}
        >
          <ArrowUpRight size={16} />
        </a>
      )}
      <button
        className="icon-button"
        title={`Delete ${item.name}`}
        onClick={() => remove(item)}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );

  return (
    <div className="library-page">
      <div className="library-heading">
        <div>
          <h1>{definition.title}</h1>
          <p>{definition.description}</p>
        </div>
        <button className="btn primary" onClick={() => openEditor()}>
          <Plus size={17} /> Add{" "}
          {collection === "materials" && tab === "templates"
            ? "BOM template"
            : definition.singular}
        </button>
      </div>
      <div className="library-tabs">
        <button
          className={tab === "all" ? "active" : ""}
          onClick={() => setTab("all")}
        >
          All {definition.title}{" "}
          <span>
            {collectionItems.filter((item) => !item.data?.isTemplate).length}
          </span>
        </button>
        {collection === "materials" && (
          <button
            className={tab === "templates" ? "active" : ""}
            onClick={() => setTab("templates")}
          >
            BOM Templates{" "}
            <span>
              {collectionItems.filter((item) => item.data?.isTemplate).length}
            </span>
          </button>
        )}
      </div>
      <div className="library-toolbar">
        <label className="library-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${definition.title.toLowerCase()}...`}
            aria-label={`Search ${definition.title}`}
          />
        </label>
        {collection === "materials" && (
          <div className="library-filters">
            <select
              aria-label="Filter supplier"
              value={supplier}
              onChange={(event) => setSupplier(event.target.value)}
            >
              <option value="">All Suppliers</option>
              {options("supplier").map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <select
              aria-label="Filter type"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="">All Types</option>
              {options("type").map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <select
              aria-label="Filter unit"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
            >
              <option value="">All UoM</option>
              {options("unit").map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        )}
        <div className="library-view">
          <button
            title="List view"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <List size={17} />
          </button>
          <button
            title="Grid view"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
          >
            <LayoutGrid size={17} />
          </button>
        </div>
      </div>
      {error && !editing && (
        <p role="alert" className="library-error">
          {error}
        </p>
      )}
      {notice && (
        <div className="library-notice" role="status">
          {notice}
          <button title="Dismiss notification" onClick={() => setNotice("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {loading ? (
        <div className="library-empty">Loading your library…</div>
      ) : !visibleItems.length ? (
        <div className="library-empty">
          <div className="library-empty-icon">
            <Icon size={28} strokeWidth={1.4} />
          </div>
          <h2>
            {query || supplier || type || unit
              ? "No matching items"
              : `Your ${tab === "templates" ? "BOM templates" : definition.title.toLowerCase()} start here`}
          </h2>
          <p>
            {query || supplier || type || unit
              ? "Try another search or adjust your filters."
              : `Add your first ${definition.singular} and make it part of your next collection.`}
          </p>
          {!(query || supplier || type || unit) && (
            <button className="btn primary" onClick={() => openEditor()}>
              <Plus size={16} /> Add{" "}
              {tab === "templates" ? "BOM template" : definition.singular}
            </button>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="library-grid">
          {visibleItems.map((item) => (
            <article className="library-card" key={item.id}>
              <button
                className="library-preview-button"
                onClick={() => openEditor(item)}
                aria-label={`Edit ${item.name}`}
              >
                {preview(item)}
              </button>
              <div className="library-card-info">
                <div>
                  <h3>{item.name}</h3>
                  <p>
                    {value(item, "type") ||
                      item.description ||
                      (collection === "size-charts"
                        ? value(item, "sizes")
                        : definition.singular)}
                  </p>
                </div>
                {actions(item)}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="library-table-wrap">
          <table className="library-table">
            <thead>
              <tr>
                {collection === "materials" && <th>Code</th>}
                <th>Name</th>
                {collection === "materials" ? (
                  <>
                    <th>Type</th>
                    <th>Composition</th>
                    <th>GSM</th>
                    <th>Supplier</th>
                    <th>Cost</th>
                  </>
                ) : (
                  <>
                    <th>
                      {collection === "colors"
                        ? "Color"
                        : collection === "size-charts"
                          ? "Sizes"
                          : "Description"}
                    </th>
                    <th>Added</th>
                  </>
                )}
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr key={item.id}>
                  {collection === "materials" && (
                    <td className="library-code">
                      {value(item, "code") || "—"}
                    </td>
                  )}
                  <td>
                    <button
                      className="library-item-name"
                      onClick={() => openEditor(item)}
                    >
                      {collection === "colors" ? (
                        <span
                          className="library-swatch"
                          style={{ backgroundColor: item.color }}
                        />
                      ) : (
                        <Icon size={17} strokeWidth={1.5} />
                      )}
                      {item.name}
                    </button>
                  </td>
                  {collection === "materials" ? (
                    <>
                      <td>
                        <span className="library-type">
                          {value(item, "type") || "—"}
                        </span>
                      </td>
                      <td>{value(item, "composition") || "—"}</td>
                      <td>{value(item, "gsm") || "—"}</td>
                      <td>{value(item, "supplier") || "—"}</td>
                      <td>
                        {value(item, "cost")
                          ? `$${Number(value(item, "cost")).toFixed(2)}${value(item, "unit") ? ` / ${value(item, "unit")}` : ""}`
                          : "—"}
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        {collection === "colors"
                          ? item.color
                          : collection === "size-charts"
                            ? value(item, "sizes")
                            : item.description || "—"}
                      </td>
                      <td>
                        {new Date(item.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </>
                  )}
                  <td>{actions(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="library-table-footer">
            {visibleItems.length}{" "}
            {visibleItems.length === 1
              ? definition.singular
              : definition.title.toLowerCase()}
          </div>
        </div>
      )}
      {editing && (
        <div
          className="modal-backdrop library-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget && !busy) setEditing(null);
          }}
        >
          <section
            className="modal library-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="library-modal-title"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !busy) setEditing(null);
            }}
          >
            <form onSubmit={save}>
              <div className="library-modal-heading">
                <div>
                  <h2 id="library-modal-title">
                    {editing === "new" ? "Add" : "Edit"}{" "}
                    {tab === "templates" ? "BOM template" : definition.singular}
                  </h2>
                  <p>Save details to your library for future collections.</p>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  title="Close"
                  disabled={busy}
                  onClick={() => setEditing(null)}
                >
                  <X size={19} />
                </button>
              </div>
              <div className="library-modal-body">
                <label>
                  Name (required)
                  <input
                    autoFocus
                    required
                    maxLength={200}
                    value={draft.name}
                    onChange={(event) =>
                      setDraft({ ...draft, name: event.target.value })
                    }
                    placeholder={
                      collection === "materials"
                        ? "e.g. Organic Cotton Jersey"
                        : `${definition.singular.charAt(0).toUpperCase() + definition.singular.slice(1)} name`
                    }
                  />
                </label>
                <label>
                  Description
                  <textarea
                    value={draft.description}
                    onChange={(event) =>
                      setDraft({ ...draft, description: event.target.value })
                    }
                    placeholder="Add a description or notes"
                    rows={2}
                  />
                </label>
                {collection === "materials" && (
                  <div className="library-form-grid">
                    {[
                      ["code", "Material code", "MAT-001"],
                      ["type", "Type", "Fabric, trim, label…"],
                      ["composition", "Composition", "100% Organic Cotton"],
                      ["gsm", "Weight (GSM)", "240"],
                      ["supplier", "Supplier", "Supplier name"],
                      ["cost", "Unit cost ($)", "0.00"],
                      ["unit", "Unit of measure", "meter, piece, kg…"],
                    ].map(([key, label, placeholder]) => (
                      <label key={key}>
                        {label}
                        <input
                          type={
                            key === "cost" || key === "gsm" ? "number" : "text"
                          }
                          min="0"
                          step={key === "cost" ? "0.01" : "1"}
                          value={String(draft.data[key] ?? "")}
                          onChange={(event) =>
                            updateData(key, event.target.value)
                          }
                          placeholder={placeholder}
                        />
                      </label>
                    ))}
                  </div>
                )}
                {collection === "colors" && (
                  <div className="library-color-input">
                    <input
                      type="color"
                      aria-label="Choose color"
                      value={
                        /^#[0-9a-f]{6}$/i.test(draft.color)
                          ? draft.color
                          : "#718792"
                      }
                      onChange={(event) =>
                        setDraft({ ...draft, color: event.target.value })
                      }
                    />
                    <label>
                      HEX color
                      <input
                        required
                        pattern="#[0-9a-fA-F]{6}"
                        value={draft.color}
                        onChange={(event) =>
                          setDraft({ ...draft, color: event.target.value })
                        }
                        placeholder="#718792"
                      />
                    </label>
                    <label>
                      Pantone reference
                      <input
                        value={String(draft.data.pantone ?? "")}
                        onChange={(event) =>
                          updateData("pantone", event.target.value)
                        }
                        placeholder="e.g. 19-4006 TCX"
                      />
                    </label>
                  </div>
                )}
                {collection === "size-charts" && (
                  <>
                    <div className="library-form-grid">
                      <label>
                        Sizes
                        <input
                          value={String(draft.data.sizes ?? "")}
                          onChange={(event) =>
                            updateData("sizes", event.target.value)
                          }
                          placeholder="XS, S, M, L, XL"
                        />
                      </label>
                      <label>
                        Unit
                        <select
                          value={String(draft.data.unit ?? "cm")}
                          onChange={(event) =>
                            updateData("unit", event.target.value)
                          }
                        >
                          <option value="cm">Centimeters (cm)</option>
                          <option value="in">Inches (in)</option>
                        </select>
                      </label>
                    </div>
                    <label>
                      Measurements
                      <textarea
                        value={String(draft.data.measurements ?? "")}
                        onChange={(event) =>
                          updateData("measurements", event.target.value)
                        }
                        placeholder={
                          "Chest: 48, 50, 52, 54, 56\nBody length: 66, 68, 70, 72, 74\nSleeve length: 20, 21, 22, 23, 24"
                        }
                        rows={5}
                      />
                    </label>
                    <p className="library-form-help">
                      One measurement per line. Enter values in the same order
                      as your sizes.
                    </p>
                    {draft.data.measurements && (
                      <div className="library-measurements">
                        <table>
                          <thead>
                            <tr>
                              <th>Measurement</th>
                              {String(draft.data.sizes ?? "")
                                .split(",")
                                .map((size, index) => (
                                  <th key={index}>{size.trim()}</th>
                                ))}
                            </tr>
                          </thead>
                          <tbody>
                            {String(draft.data.measurements)
                              .split("\n")
                              .filter(Boolean)
                              .map((line, index) => {
                                const [name, ...rest] = line.split(":");
                                return (
                                  <tr key={index}>
                                    <td>{name}</td>
                                    {rest
                                      .join(":")
                                      .split(",")
                                      .map((entry, column) => (
                                        <td key={column}>{entry.trim()}</td>
                                      ))}
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
                {["sketches", "artworks", "attachments", "materials"].includes(
                  collection,
                ) && (
                  <label className="library-upload">
                    <Upload size={22} />
                    <strong>
                      {draft.data.fileName
                        ? String(draft.data.fileName)
                        : "Click to upload a file"}
                    </strong>
                    <span>PNG, JPG, WebP or PDF · Up to 10 MB</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      disabled={busy}
                      onChange={(event) => upload(event.target.files?.[0])}
                    />
                  </label>
                )}
                {error && (
                  <p className="library-error" role="alert">
                    {error}
                  </p>
                )}
              </div>
              <footer className="library-modal-footer">
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : editing === "new"
                      ? `Add ${tab === "templates" ? "template" : definition.singular}`
                      : "Save changes"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
