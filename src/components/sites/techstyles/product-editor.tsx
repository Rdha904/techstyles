"use client";
import {
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type FormEvent,
  type PointerEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  PanelLeft,
  Download,
  Send,
  Monitor,
  Sparkles,
  Check,
  Pencil,
  Plus,
  Eye,
  EyeOff,
  GripVertical,
  CircleCheck,
  Shirt,
  Palette,
  Camera,
  MessageSquare,
  X,
  Trash2,
  Upload,
  History,
  Copy,
  Archive,
  MousePointer2,
  Hand,
  Ruler,
  ArrowUpRight,
  StickyNote,
  PaintBucket,
  Type,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Save,
  ImagePlus,
  FileText,
} from "lucide-react";
import type {
  Product,
  Manufacturer,
  ProductSnapshot,
  ProductSection,
  LibraryItem,
  Annotation,
} from "@/lib/types";
import { productSections } from "@/lib/types";
import { BrandProfileSummary } from "./brand-profile";
import { request, uploadFile, assetsPath } from "@/lib/client-api";
import { Modal, Brand } from "./ui";
import { ProductForm } from "./product-form";
import { useProductDraft, saveInBackground } from "./use-product-draft";
const sectionLabels: Record<ProductSection, string> = {
  overview: "Overview",
  sketch: "Sketch / Design",
  colorways: "Colorways",
  bom: "BOM / Materials",
  artworks: "Artworks",
  instructions: "Instructions",
  sizes: "Sizes / Measurements",
  attachments: "Attachments",
  samplings: "Samplings",
  packaging: "Packaging / Labels",
  versions: "Version History",
};
const sections = productSections.map((id) => [id, sectionLabels[id]] as const);
const uid = () => crypto.randomUUID();
function UploadButton({
  children,
  onUpload,
  accept = "image/png,image/jpeg,image/webp",
}: {
  children: ReactNode;
  onUpload: (url: string, name: string) => void;
  accept?: string;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <label className="btn file-upload">
        <Upload size={14} />
        {busy ? "Uploading…" : children}
        <input
          type="file"
          accept={accept}
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setError("");
            try {
              onUpload(await uploadFile(file), file.name);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {error && <span className="error">{error}</span>}
    </>
  );
}
function CommentBox({
  product,
  section,
  save,
}: {
  product: Product;
  section: string;
  save: (data: Partial<Product>) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const comments = product.comments.filter((x) => x.section === section);
  return (
    <details className="comment-box" open={comments.length > 0 || undefined}>
      <summary>
        <MessageSquare
          size={11}
          style={{ verticalAlign: "middle", marginRight: 6 }}
        />
        COMMENTS {comments.length > 0 && `· ${comments.length}`}
      </summary>
      {comments.map((c) => (
        <div className="comment-item" key={c.id}>
          <strong>{c.author}</strong>{" "}
          <small>{new Date(c.createdAt).toLocaleString("en-US")}</small>
          <p>{c.text}</p>
        </div>
      ))}
      <form
        className="comment-input"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim()) return;
          setBusy(true);
          try {
            await save({
              comments: [
                ...product.comments,
                {
                  id: uid(),
                  author: "Local Studio",
                  section,
                  text: text.trim(),
                  createdAt: new Date().toISOString(),
                },
              ],
            });
          } catch {
            // The comment stays in the draft; its error is shown by the editor.
            return;
          } finally {
            setText("");
            setBusy(false);
          }
        }}
      >
        <input
          aria-label={`Comment on ${section}`}
          placeholder="Write a comment…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn" disabled={!text.trim() || busy}>
          Comment
        </button>
      </form>
    </details>
  );
}
function Section({
  id,
  title,
  children,
  actions,
  complete,
  product,
  save,
}: {
  id: string;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  complete?: boolean;
  product?: Product;
  save?: (data: Partial<Product>) => Promise<void>;
}) {
  return (
    <section id={id} className="pack-section">
      <div className="section-heading">
        <h2>{title}</h2>
        {complete && (
          <span className="badge blue">
            <CircleCheck size={11} />
            Complete
          </span>
        )}
        <div className="toolbar">{actions}</div>
      </div>
      <div className="panel section-body">
        {children}
        {product && save && (
          <CommentBox product={product} section={id} save={save} />
        )}
      </div>
    </section>
  );
}
export function ProductEditor({
  product,
  manufacturers,
  onChange,
  onToggleSidebar,
}: {
  product: Product;
  manufacturers: Manufacturer[];
  onChange: (p: Product) => void;
  onToggleSidebar: () => void;
}) {
  const {
    draft,
    product: p,
    status,
    error: draftError,
    unsaved,
  } = useProductDraft(product, onChange);
  const saving = status === "saving";
  const [modal, setModal] = useState("");
  const [actionError, setActionError] = useState("");
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState("Sketch");
  const [viewColor, setViewColor] = useState(p.colors[0]?.id || "");
  const designImage =
    tab === "AI Mockup"
      ? p.mockup
      : tab === "Colorway"
        ? p.colors.find((c) => c.id === viewColor)?.image || p.sketch
        : p.sketch;
  const [tip, setTip] = useState(true);
  const [selected, setSelected] = useState("overview");
  const [shareUrl, setShareUrl] = useState("");
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [label, setLabel] = useState("");
  function notify(t: string) {
    setToast(t);
    setTimeout(() => setToast(""), 3000);
  }
  function save(data: Partial<Product>) {
    setActionError("");
    return draft.save(data, p);
  }
  async function openLibrary(collection: string) {
    setActionError("");
    try {
      setLibrary(
        (await request<LibraryItem[]>("/api/libraries")).filter(
          (x) =>
            x.collection === collection &&
            (collection !== "sketches" ||
              /\.(png|jpe?g|webp)$/i.test(String(x.data.url || ""))) &&
            (collection !== "artworks" || !!x.data.url),
        ),
      );
      setModal(`library:${collection}`);
    } catch (e) {
      setActionError((e as Error).message);
    }
  }
  async function share() {
    try {
      const data = await request<{ token: string; url: string }>(
        `/api/products/${p.id}/share`,
        { method: "POST" },
      );
      setShareUrl(new URL(data.url, location.origin).href);
      draft.replace({ ...p, shareToken: data.token });
      setModal("share");
    } catch (e) {
      setActionError((e as Error).message);
    }
  }
  function sectionProps(id: string) {
    return {
      id,
      title: sections.find((s) => s[0] === id)?.[1] || id,
      product: p,
    };
  }
  return (
    <>
      <header className="app-header">
        <button
          className="icon-button"
          aria-label="Toggle Sidebar"
          onClick={onToggleSidebar}
        >
          <PanelLeft size={16} />
        </button>
        <Link
          className="icon-button"
          href="/products"
          aria-label="Back to Products"
        >
          <ArrowLeft size={17} />
        </Link>
        <Link href="/products" className="muted">
          Products
        </Link>
        <span>/</span>
        <strong>{p.name}</strong>
        <span className="spacer" />
        <small className="saved-label">
          <Check size={12} />{" "}
          {status === "saving"
            ? "Saving…"
            : status === "error"
              ? "Not saved"
              : "Saved"}
        </small>
        <Link className="btn" href={`/products/${p.id}/print`}>
          <Download size={15} />
          Download PDF
        </Link>
        <button className="btn" onClick={share}>
          <Send size={15} />
          Share
        </button>
        <Link className="btn" href={`/products/${p.id}/canvas`}>
          <Monitor size={15} />
          Open Canvas
        </Link>
        <button className="btn" onClick={() => setModal("ai:sketch")}>
          <Sparkles size={15} />
          <span className="header-subtitle">AI Assistant</span>
        </button>
      </header>
      <main className="app-content">
        {(unsaved || draftError || actionError) && (
          <div role="alert" className="error">
            {draftError || actionError}
            {unsaved && (
              <button
                className="btn"
                disabled={saving}
                onClick={() => saveInBackground(draft.retry)}
              >
                Retry save
              </button>
            )}
          </div>
        )}
        <div className="pack-layout">
          <aside className="pack-index">
            <div style={{ position: "relative" }}>
              {p.cover || p.sketch ? (
                <img
                  className="pack-cover"
                  src={p.cover || p.sketch}
                  alt={p.name}
                />
              ) : (
                <div className="pack-cover empty">
                  <Shirt size={70} />
                </div>
              )}
              <div style={{ position: "absolute", bottom: 26, left: 8 }}>
                <UploadButton
                  onUpload={(url) => saveInBackground(save, { cover: url })}
                >
                  Cover
                </UploadButton>
              </div>
            </div>
            <div className="panel contents">
              <header>
                <strong>Table of Contents</strong>
                <small>export</small>
              </header>
              {sections.map(([id, title]) => (
                <div key={id} style={{ display: "flex", alignItems: "center" }}>
                  <a
                    href={`#${id}`}
                    className={selected === id ? "current" : ""}
                    style={{ flex: 1 }}
                    onClick={() => setSelected(id)}
                  >
                    <GripVertical size={11} />
                    <CircleCheck size={13} />
                    {title}
                  </a>
                  <button
                    className="icon-button"
                    aria-label={`${p.excludedSections.includes(id) ? "Include" : "Hide"} ${title} in exports`}
                    onClick={() =>
                      saveInBackground(save, {
                        excludedSections: p.excludedSections.includes(id)
                          ? p.excludedSections.filter((x) => x !== id)
                          : [...p.excludedSections, id],
                      })
                    }
                  >
                    {p.excludedSections.includes(id) ? (
                      <EyeOff size={13} />
                    ) : (
                      <Eye size={13} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </aside>
          <div className="pack-document">
            {tip && (
              <div className="canvas-tip">
                <Monitor size={20} />
                <div>
                  <strong>New tech pack? Start in the Canvas.</strong>Place your
                  sketch, color a colorway and add artwork — then fill BOM &amp;
                  measurements and Download or Share.
                </div>
                <Link className="btn" href={`/products/${p.id}/canvas`}>
                  Open Canvas
                </Link>
                <button
                  className="icon-button"
                  aria-label="Dismiss"
                  onClick={() => setTip(false)}
                >
                  <X size={15} />
                </button>
              </div>
            )}
            <Section
              id="overview"
              title="Overview"
              actions={
                <button className="btn" onClick={() => setModal("edit")}>
                  <Pencil size={14} />
                  Edit
                </button>
              }
            >
              <Overview
                product={p}
                manufacturerName={
                  manufacturers.find((item) => item.id === p.manufacturerId)
                    ?.name || "—"
                }
              />
              <div className="toolbar">
                <small>OWNERS</small>
                <span className="badge blue">Local Studio</span>
                <span className="spacer" />
                <button
                  className="icon-button"
                  onClick={() =>
                    saveInBackground(save, { archived: !p.archived })
                  }
                >
                  <Archive size={14} />
                  &nbsp; {p.archived ? "Unarchive" : "Archive"}
                </button>
              </div>
            </Section>
            <Section
              {...sectionProps("sketch")}
              save={save}
              complete={!!p.sketch}
              actions={
                <>
                  <Link className="btn" href={`/products/${p.id}/canvas`}>
                    <Pencil size={14} />
                    Edit on canvas
                  </Link>
                  <UploadButton
                    onUpload={(url) => saveInBackground(save, { sketch: url })}
                  >
                    Change sketch
                  </UploadButton>
                  <button
                    className="btn primary"
                    onClick={() => openLibrary("sketches")}
                  >
                    <Plus size={15} />
                    Select sketch
                  </button>
                </>
              }
            >
              <div className="toolbar">
                <div className="sketch-tabs">
                  {[
                    ["Sketch", Shirt],
                    ["Colorway", Palette],
                    ["AI Mockup", Camera],
                  ].map(([name, Icon]) => {
                    const I = Icon as typeof Shirt;
                    return (
                      <button
                        className={tab === name ? "active" : ""}
                        key={String(name)}
                        onClick={() => setTab(String(name))}
                      >
                        <I size={13} />
                        {String(name)}
                      </button>
                    );
                  })}
                </div>
                {tab === "Colorway" && p.colors.length > 0 && (
                  <select
                    aria-label="Preview colorway"
                    value={viewColor}
                    onChange={(e) => setViewColor(e.target.value)}
                  >
                    {p.colors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
                <span className="spacer" />
                <button className="btn" onClick={() => setModal("ai:mockup")}>
                  <Sparkles size={15} />
                  Generate realistic mockup
                </button>
              </div>
              {designImage ? (
                <div className="sketch-display">
                  <div className="sketch-view">
                    <a className="btn view-action" href={designImage} download>
                      <Download size={14} />
                    </a>
                    <img src={designImage} alt="Front View" />
                    <footer>
                      Front View
                      {tab === "Colorway" &&
                        p.colors[0] &&
                        ` · ${p.colors.find((c) => c.id === viewColor)?.name || p.colors[0].name}`}
                    </footer>
                  </div>
                  {p.annotations.length > 0 && (
                    <div className="panel" style={{ padding: 20 }}>
                      <small>CANVAS CALLOUTS</small>
                      {p.annotations.map((a, i) => (
                        <p key={a.id} style={{ marginTop: 15 }}>
                          <span className="badge blue">{i + 1}</span> {a.text}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty">
                  <Shirt size={40} />
                  <h3>
                    {tab === "AI Mockup"
                      ? "No mockup yet"
                      : "Start with a sketch"}
                  </h3>
                  <p>
                    Upload your own image, choose a library sketch or generate
                    one with AI.
                  </p>
                  <button
                    className="btn"
                    onClick={() =>
                      setModal(
                        `ai:${tab === "AI Mockup" ? "mockup" : "sketch"}`,
                      )
                    }
                  >
                    <Sparkles size={15} />
                    Generate with AI
                  </button>
                </div>
              )}
            </Section>
            <Section
              {...sectionProps("colorways")}
              save={save}
              complete={p.colors.length > 0}
              actions={
                <>
                  <Link className="btn" href={`/products/${p.id}/canvas`}>
                    Fill on Canvas
                  </Link>
                  <button className="btn" onClick={() => setModal("color")}>
                    <Plus size={14} />
                    Create
                  </button>
                  <button className="btn" onClick={() => openLibrary("colors")}>
                    Library
                  </button>
                </>
              }
            >
              <div className="swatches">
                {p.colors.map((c) => (
                  <div className="swatch" key={c.id}>
                    <div
                      className="swatch-color"
                      style={{ background: c.hex }}
                    />
                    <strong>{c.name}</strong>
                    <p className="muted">{c.hex.toUpperCase()}</p>
                    <button
                      className="icon-button"
                      aria-label={`Remove ${c.name}`}
                      onClick={() =>
                        saveInBackground(save, {
                          colors: p.colors.filter((x) => x.id !== c.id),
                        })
                      }
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
              {!p.colors.length && (
                <p className="muted">
                  Assign colorways to this product from your library, or create
                  a new one.
                </p>
              )}
            </Section>
            <Section
              {...sectionProps("bom")}
              save={save}
              complete={p.materials.length > 0}
              actions={
                <>
                  <button
                    className="btn"
                    onClick={() => openLibrary("materials")}
                  >
                    Library
                  </button>
                  <button
                    className="btn"
                    onClick={() =>
                      saveInBackground(save, {
                        materials: [
                          ...p.materials,
                          {
                            id: uid(),
                            name: "New material",
                            composition: "",
                            weight: "",
                            supplier: "",
                            placement: "",
                          },
                        ],
                      })
                    }
                  >
                    <Plus size={14} />
                    Add Row
                  </button>
                </>
              }
            >
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {[
                        "MATERIAL",
                        "COMPOSITION",
                        "GSM / WEIGHT",
                        "SUPPLIER",
                        "PLACEMENT",
                        "",
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {p.materials.map((m) => (
                      <tr key={m.id}>
                        {(
                          [
                            "name",
                            "composition",
                            "weight",
                            "supplier",
                            "placement",
                          ] as const
                        ).map((k) => (
                          <td key={k}>
                            <input
                              aria-label={`${m.name} ${k}`}
                              key={`${m.id}-${k}-${m[k]}`}
                              defaultValue={m[k]}
                              onBlur={(e) => {
                                if (e.target.value !== m[k])
                                  saveInBackground(save, {
                                    materials: p.materials.map((x) =>
                                      x.id === m.id
                                        ? { ...x, [k]: e.target.value }
                                        : x,
                                    ),
                                  });
                              }}
                            />
                          </td>
                        ))}
                        <td>
                          <button
                            className="icon-button"
                            aria-label={`Remove material ${m.name}`}
                            onClick={() =>
                              saveInBackground(save, {
                                materials: p.materials.filter(
                                  (x) => x.id !== m.id,
                                ),
                              })
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!p.materials.length && (
                <div className="empty">
                  Build the bill of materials — add rows or pick from your
                  Materials library.
                </div>
              )}
            </Section>
            <Section
              {...sectionProps("artworks")}
              save={save}
              complete={p.artworks.length > 0}
              actions={
                <>
                  <button
                    className="btn"
                    onClick={() => openLibrary("artworks")}
                  >
                    Library
                  </button>
                  <button
                    className="btn"
                    onClick={() => setModal("ai:artwork")}
                  >
                    <Sparkles size={14} />
                    Generate with AI
                  </button>
                  <UploadButton
                    onUpload={(url, name) =>
                      saveInBackground(save, {
                        artworks: [...p.artworks, { id: uid(), name, url }],
                      })
                    }
                  >
                    Add Artwork
                  </UploadButton>
                </>
              }
            >
              <AssetCards
                items={p.artworks}
                remove={(id) =>
                  saveInBackground(save, {
                    artworks: p.artworks.filter((x) => x.id !== id),
                  })
                }
              />
              {!p.artworks.length && (
                <p className="muted">
                  Add artwork to this product, then place it on the canvas.
                </p>
              )}
            </Section>
            <Section
              {...sectionProps("instructions")}
              save={save}
              complete={!!p.instructions}
              actions={
                <button
                  className="btn"
                  onClick={() => {
                    setLabel(p.instructions);
                    setModal("instructions");
                  }}
                >
                  <Pencil size={14} />
                  Edit Instructions
                </button>
              }
            >
              <div className="text-block">
                {p.instructions ||
                  "Add construction, stitching, wash & care and production instructions."}
              </div>
            </Section>
            <Section
              {...sectionProps("sizes")}
              save={save}
              complete={p.measurements.length > 0}
              actions={
                <>
                  <button
                    className="btn"
                    onClick={() => openLibrary("size-charts")}
                  >
                    Link Size Chart
                  </button>
                  <button
                    className="btn"
                    onClick={() =>
                      saveInBackground(save, {
                        measurements: [
                          ...p.measurements,
                          {
                            id: uid(),
                            name: "New measurement",
                            tolerance: "±1",
                            values: { XS: "", S: "", M: "", L: "", XL: "" },
                          },
                        ],
                      })
                    }
                  >
                    <Plus size={14} />
                    Add Point
                  </button>
                </>
              }
            >
              <Measurements product={p} save={save} />
            </Section>
            <Section
              {...sectionProps("attachments")}
              save={save}
              complete={p.attachments.length > 0}
              actions={
                <UploadButton
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onUpload={(url, name) =>
                    saveInBackground(save, {
                      attachments: [...p.attachments, { id: uid(), name, url }],
                    })
                  }
                >
                  Upload New Attachment
                </UploadButton>
              }
            >
              <AssetCards
                items={p.attachments}
                remove={(id) =>
                  saveInBackground(save, {
                    attachments: p.attachments.filter((x) => x.id !== id),
                  })
                }
              />
              {!p.attachments.length && (
                <p className="muted">
                  Attach reference files — supports PDF, PNG, JPG and WebP.
                </p>
              )}
            </Section>
            <Section
              {...sectionProps("samplings")}
              save={save}
              complete={p.samples.length > 0}
              actions={
                <button
                  className="btn"
                  onClick={() =>
                    saveInBackground(save, {
                      samples: [
                        ...p.samples,
                        {
                          id: uid(),
                          size: p.baseSize || "M",
                          color: p.colors[0]?.name || "",
                          quantity: 1,
                          status: "Requested",
                        },
                      ],
                    })
                  }
                >
                  <Plus size={14} />
                  Add sample
                </button>
              }
            >
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {["SIZE", "COLORWAY", "QUANTITY", "STATUS", ""].map(
                        (h) => (
                          <th key={h}>{h}</th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {p.samples.map((s) => (
                      <tr key={s.id}>
                        {(["size", "color", "quantity", "status"] as const).map(
                          (k) => (
                            <td key={k}>
                              <input
                                aria-label={`Sample ${k}`}
                                key={`${s.id}-${k}-${s[k]}`}
                                defaultValue={s[k]}
                                type={k === "quantity" ? "number" : "text"}
                                min={0}
                                onBlur={(e) =>
                                  saveInBackground(save, {
                                    samples: p.samples.map((x) =>
                                      x.id === s.id
                                        ? {
                                            ...x,
                                            [k]:
                                              k === "quantity"
                                                ? Number(e.target.value)
                                                : e.target.value,
                                          }
                                        : x,
                                    ),
                                  })
                                }
                              />
                            </td>
                          ),
                        )}
                        <td>
                          <button
                            className="icon-button"
                            aria-label="Remove sample"
                            onClick={() =>
                              saveInBackground(save, {
                                samples: p.samples.filter((x) => x.id !== s.id),
                              })
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!p.samples.length && (
                <p className="muted">Request samples by size and colorway.</p>
              )}
            </Section>
            <Section
              {...sectionProps("packaging")}
              save={save}
              complete={!!p.labels}
              actions={
                <>
                  <button className="btn" onClick={() => setModal("ai:label")}>
                    <Sparkles size={14} />
                    Generate with AI
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      setLabel(p.labels);
                      setModal("labels");
                    }}
                  >
                    <Pencil size={14} />
                    Edit Labels
                  </button>
                </>
              }
            >
              <div className="text-block">
                {p.labels ||
                  "Specify your hangtag, main label, care label and poly bag."}
              </div>
              {p.id === "demo-hoodie" && (
                <div className="sketch-display">
                  {[
                    "labels-hangtag.jpg",
                    "labels-main.jpg",
                    "labels-care.jpg",
                    "labels-polybag.jpg",
                  ].map((src, i) => (
                    <div className="sketch-view" key={src}>
                      <img
                        style={{ height: 180 }}
                        src={assetsPath + src}
                        alt={
                          ["Hangtag", "Main label", "Care label", "Poly bag"][i]
                        }
                      />
                      <footer>
                        {
                          [
                            "Hangtag · 50 × 90 mm",
                            "Main label · 60 × 20 mm",
                            "Care label",
                            "Poly bag",
                          ][i]
                        }
                      </footer>
                    </div>
                  ))}
                </div>
              )}
            </Section>
            <Section
              {...sectionProps("versions")}
              save={save}
              complete={p.versions.length > 0}
              actions={
                <button
                  className="btn"
                  onClick={() => {
                    setLabel(`V${p.versions.length + 1}`);
                    setModal("version");
                  }}
                >
                  <History size={14} />
                  Save Version
                </button>
              }
            >
              <p className="muted">
                Snapshot milestones of this tech pack — like V1, Final, or
                Production Ready. Each version captures the section data so you
                can restore it later.
              </p>
              {p.versions.map((v) => (
                <div className="version-row" key={v.id}>
                  <History size={18} />
                  <div>
                    <strong>{v.name}</strong>
                    <small>
                      {new Date(v.createdAt).toLocaleString("en-US")}
                    </small>
                  </div>
                  <span className="spacer" />
                  <button
                    className="btn"
                    onClick={async () => {
                      try {
                        draft.replace(
                          await request<Product>(
                            `/api/products/${p.id}/versions/${v.id}/restore`,
                            { method: "POST" },
                          ),
                        );
                        notify("Version restored; previous state backed up");
                      } catch (e) {
                        setActionError((e as Error).message);
                      }
                    }}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </Section>
          </div>
        </div>
      </main>
      {modal === "edit" && (
        <ProductForm
          product={p}
          manufacturers={manufacturers}
          onClose={() => setModal("")}
          onSave={(x) => {
            draft.replace(x);
            setModal("");
          }}
        />
      )}
      {modal === "color" && (
        <Modal title="Create Colorway" onClose={() => setModal("")}>
          <form
            onSubmit={async (e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              await save({
                colors: [
                  ...p.colors,
                  {
                    id: uid(),
                    name: String(d.get("name")),
                    hex: String(d.get("hex")),
                  },
                ],
              });
              setModal("");
            }}
          >
            <div className="form-grid">
              <label>
                Colorway name
                <input
                  name="name"
                  placeholder="e.g. YELLOW"
                  required
                  autoFocus
                />
              </label>
              <label>
                Color
                <input
                  name="hex"
                  type="color"
                  defaultValue="#e8d74c"
                  style={{ width: "100%", height: 43 }}
                />
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn primary">Create Colorway</button>
            </div>
          </form>
        </Modal>
      )}
      {["instructions", "labels", "version"].includes(modal) && (
        <Modal
          title={
            modal === "version"
              ? "Save Version"
              : modal === "labels"
                ? "Packaging / Labels"
                : "Production Instructions"
          }
          onClose={() => setModal("")}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (modal === "version")
                  draft.replace(
                    await request<Product>(`/api/products/${p.id}/versions`, {
                      method: "POST",
                      json: { name: label },
                    }),
                  );
                else await save({ [modal]: label });
                setModal("");
              } catch (e) {
                if (modal === "version") setActionError((e as Error).message);
              }
            }}
          >
            {modal === "version" ? (
              <input
                aria-label="Version name"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                autoFocus
                style={{ width: "100%", marginTop: 20 }}
              />
            ) : (
              <textarea
                aria-label="Section content"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                style={{ width: "100%", minHeight: 300, marginTop: 20 }}
              />
            )}
            <div className="modal-footer">
              <button
                className="btn"
                type="button"
                onClick={() => setModal("")}
              >
                Cancel
              </button>
              <button className="btn primary" disabled={saving}>
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === "share" && (
        <Modal title="Share tech pack" onClose={() => setModal("")}>
          <p style={{ marginTop: 20 }}>
            A live, read-only link for your manufacturer. Changes to this tech
            pack appear automatically.
          </p>
          <p className="muted">
            The recipient needs access to this application&apos;s server. A
            localhost link works only on this computer.
          </p>
          <input
            className="share-url"
            aria-label="Share link"
            readOnly
            value={shareUrl}
          />
          <div className="toolbar">
            <button
              className="btn primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  notify("Link copied");
                } catch {
                  notify("Select the link above to copy it");
                }
              }}
            >
              <Copy size={14} />
              Copy link
            </button>
            <a className="btn" href={shareUrl} target="_blank" rel="noreferrer">
              Open preview <ArrowUpRight size={14} />
            </a>
            <button
              className="btn"
              onClick={async () => {
                await request(`/api/products/${p.id}/share`, {
                  method: "DELETE",
                });
                draft.replace({ ...p, shareToken: null });
                setModal("");
                notify("Share link revoked");
              }}
            >
              Revoke link
            </button>
          </div>
        </Modal>
      )}
      {modal.startsWith("ai:") && (
        <AIModal
          kind={modal.split(":")[1]}
          product={p}
          onClose={() => setModal("")}
          onGenerated={async (url, kind) => {
            await save(
              kind === "sketch"
                ? { sketch: url }
                : kind === "mockup"
                  ? { mockup: url }
                  : kind === "artwork"
                    ? {
                        artworks: [
                          ...p.artworks,
                          { id: uid(), name: "AI artwork", url },
                        ],
                      }
                    : {
                        attachments: [
                          ...p.attachments,
                          { id: uid(), name: "AI label", url },
                        ],
                      },
            );
            setModal("");
            notify("Generated image saved");
          }}
        />
      )}
      {modal.startsWith("library:") && (
        <Modal
          title={`Select from ${modal.split(":")[1]} library`}
          onClose={() => setModal("")}
        >
          {library.length ? (
            library.map((item) => (
              <button
                key={item.id}
                className="btn"
                style={{
                  width: "100%",
                  marginTop: 10,
                  justifyContent: "flex-start",
                }}
                onClick={async () => {
                  const type = modal.split(":")[1];
                  if (type === "sketches")
                    await save({ sketch: String(item.data.url || "") });
                  if (type === "materials")
                    await save({
                      materials: [
                        ...p.materials,
                        {
                          id: uid(),
                          name: item.name,
                          composition: String(item.data.composition || ""),
                          weight: String(item.data.gsm || ""),
                          supplier: String(item.data.supplier || ""),
                          placement: "",
                        },
                      ],
                    });
                  if (type === "colors")
                    await save({
                      colors: [
                        ...p.colors,
                        {
                          id: uid(),
                          name: item.name,
                          hex: item.color || "#444444",
                        },
                      ],
                    });
                  if (type === "artworks")
                    await save({
                      artworks: [
                        ...p.artworks,
                        {
                          id: uid(),
                          name: item.name,
                          url: String(item.data.url || ""),
                        },
                      ],
                    });
                  if (type === "size-charts") {
                    const sizes = String(item.data.sizes || "XS,S,M,L,XL")
                      .split(",")
                      .map((x) => x.trim());
                    const rows = String(item.data.measurements || "").split(
                      "\n",
                    );
                    if (!rows.some((x) => x.includes(":"))) {
                      setActionError(
                        "This size chart has no measurements. Add them in the Size Charts library.",
                      );
                      setModal("");
                      return;
                    }
                    await save({
                      measurementUnit: item.data.unit === "in" ? "in" : "cm",
                      measurements: rows.filter(Boolean).map((line) => {
                        const [name, values = ""] = line.split(":");
                        const cells = values.split(",");
                        return {
                          id: uid(),
                          name,
                          tolerance: "±1",
                          values: Object.fromEntries(
                            sizes.map((s, i) => [s, cells[i]?.trim() || ""]),
                          ),
                        };
                      }),
                    });
                  }
                  setModal("");
                }}
              >
                {item.name}
              </button>
            ))
          ) : (
            <div className="empty">
              <p>No items yet.</p>
              <Link className="btn" href={`/${modal.split(":")[1]}`}>
                Open library
              </Link>
            </div>
          )}
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
function Overview({
  product: p,
  manufacturerName,
}: {
  product: ProductSnapshot;
  manufacturerName?: string;
}) {
  return (
    <div className="overview-info">
      <small>CORE PRODUCT INFORMATION</small>
      <h1>{p.name}</h1>
      <div className="toolbar">
        <span className="badge">{p.code}</span>
        <span className={`badge ${p.stage.toLowerCase()}`}>{p.stage}</span>
      </div>
      <div className="detail-grid">
        {[
          ["ARTICLE CODE", p.code],
          ["CATEGORY", p.category],
          ["BASE SIZE", p.baseSize],
          ["PROJECT", p.project],
          ["STATUS", p.stage],
          ...(manufacturerName !== undefined
            ? [["MANUFACTURER", manufacturerName]]
            : []),
        ].map(([label, value]) => (
          <div key={label}>
            <small>{label}</small>
            {value || "—"}
          </div>
        ))}
      </div>
      <small>DESCRIPTION</small>
      <p>{p.description || "No description added."}</p>
    </div>
  );
}
function Measurements({
  product: p,
  save,
}: {
  product: Product;
  save?: (data: Partial<Product>) => Promise<void>;
}) {
  const sizes = [
    ...new Set(p.measurements.flatMap((m) => Object.keys(m.values))),
  ];
  return (
    <div className="table-wrap">
      <p className="muted">Measurements in {p.measurementUnit || "cm"}</p>
      <table>
        <thead>
          <tr>
            <th>POINT OF MEASUREMENT</th>
            <th>TOLERANCE</th>
            {sizes.map((s) => (
              <th key={s}>{s}</th>
            ))}
            {save && <th />}
          </tr>
        </thead>
        <tbody>
          {p.measurements.map((m) => (
            <tr key={m.id}>
              <td>
                {save ? (
                  <input
                    aria-label="Measurement name"
                    key={`${m.id}-name-${m.name}`}
                    defaultValue={m.name}
                    onBlur={(e) =>
                      saveInBackground(save, {
                        measurements: p.measurements.map((x) =>
                          x.id === m.id ? { ...x, name: e.target.value } : x,
                        ),
                      })
                    }
                  />
                ) : (
                  m.name
                )}
              </td>
              <td>
                {save ? (
                  <input
                    aria-label={`${m.name} tolerance`}
                    key={`${m.id}-tolerance-${m.tolerance}`}
                    defaultValue={m.tolerance}
                    onBlur={(e) =>
                      saveInBackground(save, {
                        measurements: p.measurements.map((x) =>
                          x.id === m.id
                            ? { ...x, tolerance: e.target.value }
                            : x,
                        ),
                      })
                    }
                  />
                ) : (
                  m.tolerance
                )}
              </td>
              {sizes.map((s) => (
                <td key={s}>
                  {save ? (
                    <input
                      aria-label={`${m.name} ${s}`}
                      key={`${m.id}-${s}-${m.values[s]}`}
                      defaultValue={m.values[s]}
                      onBlur={(e) => {
                        if (e.target.value !== m.values[s])
                          saveInBackground(save, {
                            measurements: p.measurements.map((x) =>
                              x.id === m.id
                                ? {
                                    ...x,
                                    values: {
                                      ...x.values,
                                      [s]: e.target.value,
                                    },
                                  }
                                : x,
                            ),
                          });
                      }}
                    />
                  ) : (
                    m.values[s]
                  )}
                </td>
              ))}
              {save && (
                <td>
                  <button
                    className="icon-button"
                    aria-label={`Remove measurement ${m.name}`}
                    onClick={() =>
                      saveInBackground(save, {
                        measurements: p.measurements.filter(
                          (x) => x.id !== m.id,
                        ),
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!p.measurements.length && (
        <div className="empty">
          Link a size chart or add your own points of measurement.
        </div>
      )}
    </div>
  );
}
function AssetCards({
  items,
  remove,
}: {
  items: { id: string; name: string; url: string }[];
  remove?: (id: string) => void;
}) {
  return (
    <div className="attachments">
      {items.map((item) => (
        <div className="attachment" key={item.id}>
          <a href={item.url} target="_blank" rel="noreferrer">
            {item.url.match(/\.(png|jpg|jpeg|webp)$/i) ? (
              <img
                src={item.url}
                alt={item.name}
                style={{
                  width: 100,
                  height: 85,
                  objectFit: "contain",
                  display: "block",
                  marginBottom: 10,
                }}
              />
            ) : (
              <FileText size={24} />
            )}
            <span>{item.name}</span>
          </a>
          {remove && (
            <button
              className="icon-button"
              aria-label={`Remove ${item.name}`}
              onClick={() => remove(item.id)}
            >
              <X size={13} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
function AIModal({
  kind,
  product,
  onClose,
  onGenerated,
}: {
  kind: string;
  product: Product;
  onClose: () => void;
  onGenerated: (url: string, kind: string) => Promise<void>;
}) {
  const [prompt, setPrompt] = useState(
    kind === "mockup"
      ? `Photorealistic studio mockup of ${product.name}. ${product.description}. ${product.colors.map((c) => c.name).join(", ")}.`
      : "",
  );
  const [useBrandProfile, setUseBrandProfile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title={
        kind === "mockup"
          ? "Generate realistic mockup"
          : `Generate ${kind} with AI`
      }
      onClose={onClose}
    >
      <p className="muted" style={{ marginTop: 18 }}>
        Describe the garment, fit, material and details. Generation uses your
        configured AI provider.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const data = await request<{ url: string }>("/api/generate", {
              method: "POST",
              json: {
                kind,
                prompt,
                useBrandProfile,
                ...(kind === "mockup" && product.sketch
                  ? { image: product.sketch }
                  : {}),
              },
            });
            await onGenerated(data.url, kind);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <textarea
          aria-label="AI prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="An oversized pullover hoodie, dropped shoulders, kangaroo pocket…"
          required
          style={{ width: "100%", minHeight: 160 }}
        />
        <label className="brand-ai-option">
          <input
            type="checkbox"
            checked={useBrandProfile}
            onChange={(e) => setUseBrandProfile(e.target.checked)}
          />
          Use saved brand profile as generation context
        </label>
        {useBrandProfile && <BrandProfileSummary compact />}
        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy}>
            <Sparkles size={15} />
            {busy ? "Generating…" : "Generate"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function SharedProduct({
  token,
  product,
}: {
  token?: string;
  product?: Product;
}) {
  const [p, setP] = useState<Product | undefined>(product);
  const [error, setError] = useState("");
  useEffect(() => {
    if (token)
      request<Product>(`/api/share/${encodeURIComponent(token)}`)
        .then(setP)
        .catch((e) => setError(e.message));
  }, [token]);
  if (error)
    return (
      <div className="empty">
        <h1>Share link unavailable</h1>
        <p>{error}</p>
      </div>
    );
  if (!p) return <div className="empty">Loading tech pack…</div>;
  const show = (id: ProductSection) => !p.excludedSections.includes(id);
  return (
    <main className="print-pack">
      <header className="print-header">
        <div>
          <Brand />
          <small>
            {token ? "READ-ONLY SUPPLIER VIEW" : "PRINT / PDF PREVIEW"}
          </small>
        </div>
        <div className="toolbar no-print">
          {!token && (
            <Link className="btn" href={`/products/${p.id}`}>
              Back to Product
            </Link>
          )}
          <button className="btn primary" onClick={() => window.print()}>
            <Download size={15} />
            Print / Save PDF
          </button>
        </div>
      </header>
      <h1>
        {p.name} <span className="badge">{p.code}</span>
      </h1>
      <p className="muted">
        Last updated {new Date(p.updatedAt).toLocaleString("en-US")}
      </p>
      {show("overview") && (
        <Section id="overview" title="Overview">
          <Overview product={p} />
        </Section>
      )}
      {show("sketch") && (
        <Section id="sketch" title="Sketch / Design">
          <div className="sketch-display">
            {[
              { url: p.sketch, label: "Front View" },
              { url: p.mockup, label: "AI mockup" },
              ...p.colors.map((c) => ({ url: c.image, label: c.name })),
            ]
              .filter((item) => item.url)
              .map(({ url, label }) => (
                <div className="sketch-view" key={url}>
                  <img src={url} alt={label} />
                  <footer>{label}</footer>
                </div>
              ))}
          </div>
          {p.annotations.map((a, i) => (
            <p key={a.id}>
              {i + 1}. {a.text}
            </p>
          ))}
        </Section>
      )}
      {show("colorways") && (
        <Section id="colorways" title="Colorways">
          <div className="swatches">
            {p.colors.map((c) => (
              <div key={c.id} className="swatch">
                <div className="swatch-color" style={{ background: c.hex }} />
                {c.name}
                <small> · {c.hex}</small>
              </div>
            ))}
          </div>
        </Section>
      )}
      {show("bom") && (
        <Section id="bom" title="BOM / Materials">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {["Material", "Composition", "Weight", "Placement"].map(
                    (x) => (
                      <th key={x}>{x}</th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {p.materials.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>{m.composition}</td>
                    <td>{m.weight}</td>
                    <td>{m.placement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
      {show("artworks") && p.artworks.length > 0 && (
        <Section id="artworks" title="Artworks">
          <AssetCards items={p.artworks} />
        </Section>
      )}
      {show("instructions") && (
        <Section id="instructions" title="Instructions">
          <div className="text-block">{p.instructions}</div>
        </Section>
      )}
      {show("sizes") && (
        <Section id="sizes" title="Sizes / Measurements">
          <Measurements product={p} />
        </Section>
      )}
      {show("attachments") && p.attachments.length > 0 && (
        <Section id="attachments" title="Attachments">
          <AssetCards items={p.attachments} />
        </Section>
      )}
      {show("samplings") && p.samples.length > 0 && (
        <Section id="samplings" title="Samplings">
          {p.samples.map((s) => (
            <p key={s.id}>
              {s.size} · {s.color} · {s.quantity} units · {s.status}
            </p>
          ))}
        </Section>
      )}
      {show("packaging") && (
        <Section id="packaging" title="Packaging / Labels">
          <div className="text-block">{p.labels}</div>
        </Section>
      )}
      <footer
        className="muted"
        style={{ borderTop: "1px solid var(--line)", paddingTop: 20 }}
      >
        {p.name} · {p.code} · Tech pack
      </footer>
    </main>
  );
}
export function ProductCanvas({
  product: p,
  onChange,
}: {
  product: Product;
  onChange: (p: Product) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState("Select");
  const [color, setColor] = useState(p.colors[0]?.hex || "#f6e24a");
  const [colorwayId, setColorwayId] = useState(p.colors[0]?.id || "");
  const canvasImage =
    p.colors.find((c) => c.id === colorwayId)?.image || p.sketch;
  const [zoom, setZoom] = useState(100);
  const [annotations, setAnnotations] = useState<Annotation[]>(p.annotations);
  const [history, setHistory] = useState<string[]>([]);
  const [redo, setRedo] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    if (!canvasImage) return;
    let disposed = false;
    const image = new Image();
    image.onload = () => {
      if (disposed) return;
      const scale = Math.min(c.width / image.width, c.height / image.height);
      ctx.drawImage(
        image,
        (c.width - image.width * scale) / 2,
        (c.height - image.height * scale) / 2,
        image.width * scale,
        image.height * scale,
      );
    };
    image.onerror = () => setError("The sketch could not be loaded.");
    image.src = canvasImage;
    return () => {
      disposed = true;
    };
  }, [canvasImage]);
  function record() {
    const c = canvasRef.current;
    if (!c) return;
    setHistory((h) => [...h.slice(-14), c.toDataURL()]);
    setRedo([]);
    setSaved(false);
  }
  function restoreImage(url: string, fit = false) {
    const c = canvasRef.current;
    if (!c) return;
    const img = new Image();
    img.onload = () => {
      c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, c.width, c.height);
        const scale = fit
          ? Math.min(c.width / img.width, c.height / img.height)
          : 1;
        ctx.drawImage(
          img,
          fit ? (c.width - img.width * scale) / 2 : 0,
          fit ? (c.height - img.height * scale) / 2 : 0,
          img.width * scale,
          img.height * scale,
        );
      }
    };
    img.src = url;
    setSaved(false);
  }
  function undo() {
    const c = canvasRef.current;
    if (!c || !history.length) return;
    setRedo((r) => [...r, c.toDataURL()]);
    restoreImage(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  }
  function redoAction() {
    const c = canvasRef.current;
    if (!c || !redo.length) return;
    setHistory((h) => [...h, c.toDataURL()]);
    restoreImage(redo[redo.length - 1]);
    setRedo((r) => r.slice(0, -1));
  }
  function fill(x: number, y: number) {
    const c = canvasRef.current,
      ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    record();
    const data = ctx.getImageData(0, 0, c.width, c.height);
    const px = data.data;
    const start = (y * c.width + x) * 4;
    const target = [px[start], px[start + 1], px[start + 2]];
    const rgb = [
      parseInt(color.slice(1, 3), 16),
      parseInt(color.slice(3, 5), 16),
      parseInt(color.slice(5, 7), 16),
    ];
    if (target.every((v, i) => Math.abs(v - rgb[i]) < 5)) return;
    const stack = [y * c.width + x];
    const seen = new Uint8Array(c.width * c.height);
    while (stack.length) {
      const n = stack.pop()!;
      if (seen[n]) continue;
      seen[n] = 1;
      const i = n * 4;
      if (!target.every((v, k) => Math.abs(px[i + k] - v) < 45)) continue;
      px[i] = rgb[0];
      px[i + 1] = rgb[1];
      px[i + 2] = rgb[2];
      px[i + 3] = 255;
      const xx = n % c.width,
        yy = Math.floor(n / c.width);
      if (xx > 0) stack.push(n - 1);
      if (xx < c.width - 1) stack.push(n + 1);
      if (yy > 0) stack.push(n - c.width);
      if (yy < c.height - 1) stack.push(n + c.width);
    }
    ctx.putImageData(data, 0, 0);
  }
  function point(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)),
    };
  }
  async function persist() {
    setBusy(true);
    setError("");
    const c = canvasRef.current;
    if (!c) {
      setBusy(false);
      return;
    }
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        c.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Could not save canvas"))),
          "image/png",
        ),
      );
      const sketch = await uploadFile(
        new File([blob], "canvas.png", { type: "image/png" }),
      );
      const product = await request<Product>(`/api/products/${p.id}`, {
        method: "PATCH",
        json: {
          ...(colorwayId
            ? {
                colors: p.colors.map((c) =>
                  c.id === colorwayId ? { ...c, image: sketch } : c,
                ),
              }
            : { sketch }),
          annotations,
        },
      });
      onChange(product);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="canvas-screen">
      <header className="canvas-header">
        <Link className="btn" href={`/products/${p.id}`}>
          <ArrowLeft size={15} />
          Back to Product
        </Link>
        <h1>{p.name}</h1>
        <span className="badge">{p.code}</span>
        <span className="badge sampling">{p.stage}</span>
        <span className="spacer" />
        <button
          className="icon-button"
          aria-label="Undo"
          disabled={!history.length}
          onClick={undo}
        >
          <Undo2 size={17} />
        </button>
        <button
          className="icon-button"
          aria-label="Redo"
          disabled={!redo.length}
          onClick={redoAction}
        >
          <Redo2 size={17} />
        </button>
        <button className="btn primary" onClick={persist} disabled={busy}>
          <Save size={16} />
          {busy ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </header>
      <div className="canvas-workspace" inert={busy}>
        <aside className="canvas-tools">
          {[
            ["Select", MousePointer2],
            ["Pan", Hand],
            ["Measure", Ruler],
            ["Callout", ArrowUpRight],
            ["Note", StickyNote],
            ["Fill", PaintBucket],
            ["Text", Type],
            ["Artwork", ImagePlus],
          ].map(([name, Icon]) => {
            const I = Icon as typeof Pencil;
            return (
              <button
                key={String(name)}
                className={tool === name ? "active" : ""}
                onClick={() => {
                  setTool(String(name));
                  setStart(null);
                }}
              >
                <I size={20} />
                {String(name)}
              </button>
            );
          })}
        </aside>
        <div className="canvas-stage" ref={stageRef}>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="toolbar">
            <small>COLORWAY</small>
            <select
              aria-label="Canvas colorway"
              value={colorwayId}
              onChange={(e) => {
                setColorwayId(e.target.value);
                setColor(
                  p.colors.find((c) => c.id === e.target.value)?.hex ||
                    "#444444",
                );
                setHistory([]);
                setRedo([]);
              }}
            >
              {p.colors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              {!p.colors.length && <option value="">Original sketch</option>}
            </select>
            <input
              aria-label="Fill color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: 42, padding: 4 }}
            />
            {tool === "Artwork" && (
              <UploadButton
                onUpload={(url) => {
                  const img = new Image();
                  img.onload = () => {
                    record();
                    canvasRef.current
                      ?.getContext("2d")
                      ?.drawImage(
                        img,
                        460,
                        270,
                        160,
                        (160 * img.height) / img.width,
                      );
                  };
                  img.src = url;
                }}
              >
                Upload artwork
              </UploadButton>
            )}
          </div>
          <p className="muted" style={{ margin: "12px 0" }}>
            {tool === "Fill"
              ? "Click inside a garment panel to fill it with the selected color."
              : tool === "Measure"
                ? start
                  ? "Click the end point, then enter the actual measurement."
                  : "Click two points, then enter the actual measurement."
                : tool === "Select"
                  ? "Drag a callout to position it. Save to update the tech pack."
                  : tool === "Pan"
                    ? "Drag the canvas to pan."
                    : tool === "Artwork"
                      ? "Upload a PNG, JPG or WebP to place it on the drawing."
                      : "Click on the drawing to add a note or callout."}
          </p>
          <div
            className="artboard"
            style={{
              width: `${(720 * zoom) / 100}px`,
              maxWidth: zoom <= 100 ? "100%" : "none",
              touchAction: "none",
              transform: `translate(${pan.x}px,${pan.y}px)`,
            }}
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest(".canvas-note")) return;
              const pos = point(e);
              if (tool === "Fill") {
                const c = canvasRef.current;
                if (c)
                  fill(
                    Math.min(c.width - 1, Math.floor((pos.x / 100) * c.width)),
                    Math.min(
                      c.height - 1,
                      Math.floor((pos.y / 100) * c.height),
                    ),
                  );
              } else if (
                ["Note", "Text", "Callout", "Measure"].includes(tool)
              ) {
                if (tool === "Measure" && !start) {
                  setStart(pos);
                  return;
                }
                setPending(pos);
                setNote(
                  tool === "Measure"
                    ? "Measure: "
                    : tool === "Callout"
                      ? `${annotations.length + 1}. `
                      : "",
                );
              } else if (tool === "Pan") {
                e.currentTarget.setPointerCapture(e.pointerId);
                setStart({ x: e.clientX, y: e.clientY });
              }
            }}
            onPointerMove={(e) => {
              if (tool === "Pan" && start && stageRef.current) {
                setPan((old) => ({
                  x: old.x + e.clientX - start.x,
                  y: old.y + e.clientY - start.y,
                }));
                setStart({ x: e.clientX, y: e.clientY });
              }
              if (drag) {
                const pos = point(e);
                setAnnotations((a) =>
                  a.map((x) => (x.id === drag ? { ...x, ...pos } : x)),
                );
                setSaved(false);
              }
            }}
            onPointerUp={() => {
              setDrag(null);
              if (tool === "Pan") setStart(null);
            }}
          >
            <canvas
              ref={canvasRef}
              width={1200}
              height={900}
              style={{ width: "100%", height: "100%", display: "block" }}
              aria-label="Technical drawing canvas"
            />
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
            >
              {annotations
                .filter((a) => a.x2 !== undefined)
                .map((a) => (
                  <line
                    key={a.id}
                    x1={a.x}
                    y1={a.y}
                    x2={a.x2}
                    y2={a.y2}
                    stroke="#4663bc"
                    strokeWidth=".3"
                  />
                ))}
            </svg>
            {annotations.map((a) => (
              <div
                key={a.id}
                className="canvas-note"
                style={{
                  left: `${a.x}%`,
                  top: `${a.y}%`,
                  cursor: tool === "Select" ? "move" : "default",
                }}
                onPointerDown={(e) => {
                  if (tool === "Select") {
                    e.stopPropagation();
                    e.currentTarget.parentElement?.setPointerCapture(
                      e.pointerId,
                    );
                    setDrag(a.id);
                  }
                }}
              >
                {a.text}
                <button
                  className="icon-button"
                  style={{ padding: 2 }}
                  aria-label={`Remove annotation ${a.text}`}
                  onClick={() => {
                    setAnnotations((old) => old.filter((x) => x.id !== a.id));
                    setSaved(false);
                  }}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <aside className="canvas-pages">
          <h2>Pages</h2>
          <button
            className="btn primary"
            onClick={persist}
            disabled={busy}
            style={{ width: "100%" }}
          >
            <Save size={15} />
            Save to tech pack
          </button>
          <p className="muted" style={{ fontSize: 11, marginTop: 14 }}>
            Updates the sketch and callouts in the tech pack, PDF and supplier
            view.
          </p>
          {canvasImage && (
            <img src={canvasImage} alt="Current tech pack sketch" />
          )}
          <p className="muted">Front View</p>
          <UploadButton
            onUpload={(url) => {
              record();
              restoreImage(url, true);
            }}
          >
            Change sketch
          </UploadButton>
          <button
            className="btn"
            style={{ marginTop: 12 }}
            onClick={() => {
              const c = canvasRef.current;
              if (c) {
                const a = document.createElement("a");
                a.href = c.toDataURL();
                a.download = `${p.code}-sketch.png`;
                a.click();
              }
            }}
          >
            <Download size={14} />
            Export PNG
          </button>
        </aside>
      </div>
      <div className="canvas-zoom">
        <button
          className="icon-button"
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(50, z - 25))}
        >
          <ZoomOut size={16} />
        </button>
        {zoom}%
        <button
          className="icon-button"
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(200, z + 25))}
        >
          <ZoomIn size={16} />
        </button>
        <button
          className="icon-button"
          onClick={() => {
            setZoom(100);
            setPan({ x: 0, y: 0 });
          }}
        >
          Fit
        </button>
      </div>
      {pending && (
        <Modal
          title={
            tool === "Measure" ? "Add measurement" : "Add canvas annotation"
          }
          onClose={() => setPending(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAnnotations((old) => [
                ...old,
                {
                  id: uid(),
                  ...pending,
                  text: note,
                  ...(tool === "Measure" && start
                    ? { x2: start.x, y2: start.y }
                    : {}),
                },
              ]);
              setPending(null);
              setStart(null);
              setSaved(false);
            }}
          >
            <p className="muted">
              {tool === "Measure"
                ? "Enter the measured garment value and unit, e.g. Chest width: 60 cm."
                : "Add a clear instruction for your manufacturer."}
            </p>
            <input
              aria-label="Annotation text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required
              autoFocus
              style={{ width: "100%" }}
            />
            <div className="modal-footer">
              <button className="btn primary">Add annotation</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
