"use client";
import { useEffect, useState, useRef, type ChangeEvent } from "react";
import Link from "next/link";
import {
  Globe,
  MessageSquare,
  Upload,
  Pencil,
  Check,
  Save,
  Plus,
  X,
  Image as ImageIcon,
  Palette,
  Type,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { request, uploadFile } from "@/lib/client-api";
import {
  brandTextFields,
  brandLimits,
  brandLabels,
  emptyBrandProfile,
  type BrandProfile,
  type BrandTextField,
  type BrandImport,
  type BrandSuggestion,
  type BrandField,
} from "@/lib/brand-types";
import {
  clothingBrandTemplates,
  type ClothingBrandTemplate,
} from "@/lib/brand-templates";
import "./brand-profile.css";
const profilePath = "/modules/concept/brand-profile";
const detailHelp: Record<BrandTextField, string> = {
  name: "Your brand name.",
  website: "Your primary website address.",
  description: "What your brand makes and what it stands for.",
  values: "The principles your brand is built on.",
  positioning: "How you sit against the alternatives in your market.",
  audience: "Who you design and create for.",
  tone: "How your brand sounds in words.",
};
export function BrandProfileSummary({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [status, setStatus] = useState("Loading brand profile…");
  useEffect(() => {
    let live = true;
    request<{ profile: BrandProfile | null }>("/api/brand-profile")
      .then(({ profile }) => {
        if (live) {
          setProfile(profile);
          setStatus(
            profile
              ? ""
              : "Create one shared identity for your designs and marketing.",
          );
        }
      })
      .catch(() => {
        if (live) setStatus("Brand profile could not be loaded.");
      });
    return () => {
      live = false;
    };
  }, []);
  if (!compact) {
    return (
      <section className="brand-summary" aria-label="Shared brand profile">
        <div className="brand-summary-row">
          <span className="brand-summary-logo" aria-hidden="true">
            {profile?.logo ? (
              <img src={profile.logo.url} alt="" />
            ) : (
              <Palette size={25} />
            )}
          </span>
          <div>
            <h3>{profile?.name || "Brand Profile"}</h3>
            <small>Shared with Design &amp; Tech Packs and Marketing</small>
          </div>
        </div>
        <p className="brand-summary-positioning">
          {status ||
            profile?.positioning ||
            profile?.description ||
            "Your shared brand identity"}
        </p>
        {!!profile?.colors.length && (
          <div className="brand-summary-swatches" aria-label="Brand colors">
            {profile.colors.map((hex) => (
              <span className="brand-summary-swatch" key={hex}>
                <i style={{ background: hex }} />
                <span>{hex}</span>
              </span>
            ))}
          </div>
        )}
        <Link className="btn" href={profilePath}>
          {profile ? "View profile" : "Create profile"}
          <ArrowUpRight size={14} />
        </Link>
      </section>
    );
  }
  return (
    <section
      className={`brand-summary ${compact ? "compact" : ""}`}
      aria-label="Shared brand profile"
    >
      {profile?.logo ? (
        <img src={profile.logo.url} alt={`${profile.name} logo`} />
      ) : (
        <Palette size={25} />
      )}
      <div>
        <strong>{profile?.name || "Brand Profile"}</strong>
        <p>
          {status ||
            profile?.positioning ||
            profile?.description ||
            "Your shared brand identity"}
        </p>
        {profile && (
          <span className="brand-summary-palette">
            {profile.colors.map((hex) => (
              <i key={hex} style={{ background: hex }} title={hex} />
            ))}
            <small>
              Saved profile · Shared with Design &amp; Tech Packs and Marketing
            </small>
          </span>
        )}
      </div>
      <Link className="btn" href={profilePath}>
        {profile ? "View profile" : "Create profile"}
        <ArrowUpRight size={14} />
      </Link>
    </section>
  );
}
export function BrandProfilePage() {
  const [profile, setProfile] = useState<BrandProfile>(emptyBrandProfile);
  const [saved, setSaved] = useState<BrandProfile>(emptyBrandProfile);
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState<
    "website" | "choices" | "scratch" | "templates" | "review" | "editor"
  >("website");
  const [returnStep, setReturnStep] = useState<
    "website" | "choices" | "scratch" | "templates" | "review" | "editor"
  >("website");
  const [profileTab, setProfileTab] = useState<"overview" | "details">(
    "overview",
  );
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [guideField, setGuideField] = useState<BrandTextField>("name");
  const [guideAnswer, setGuideAnswer] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [website, setWebsite] = useState("");
  const [review, setReview] = useState<BrandImport | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [newColor, setNewColor] = useState("#4169CA");
  const [newFont, setNewFont] = useState("");
  const [editField, setEditField] = useState<BrandTextField | null>(null);
  const [editValue, setEditValue] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(profile) !== JSON.stringify(saved);
  const missingFields: BrandField[] = [
    ...brandTextFields.filter(
      (field) => field !== "website" && !profile[field].trim(),
    ),
    ...(!profile.logo ? ["logo" as const] : []),
    ...(!profile.colors.length ? ["colors" as const] : []),
    ...(!profile.fonts.length ? ["fonts" as const] : []),
    ...(!profile.referenceImages.length ? ["referenceImages" as const] : []),
  ];
  function focusField(field: BrandField) {
    setProfileTab(
      ["website", "description", "positioning", "audience"].includes(field)
        ? "details"
        : "overview",
    );
    requestAnimationFrame(() => {
      const target = document.getElementById(`brand-field-${field}`);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "center",
      });
    });
  }
  function openFieldEditor(field: BrandTextField) {
    setEditField(field);
    setEditValue(profile[field]);
  }
  function applyFieldEditor() {
    if (!editField) return;
    update(editField, editValue);
    setEditField(null);
  }
  async function loadSaved() {
    try {
      const data = await request<{ profile: BrandProfile | null }>(
        "/api/brand-profile",
      );
      setError("");
      const next = data.profile || emptyBrandProfile();
      setProfile(next);
      setSaved(next);
      setWebsite(next.website);
      setConfirmed(false);
      setLoaded(true);
      setStep(next.revision ? "editor" : "website");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    let active = true;
    request<{ profile: BrandProfile | null }>("/api/brand-profile")
      .then(({ profile }) => {
        if (!active) return;
        const next = profile || emptyBrandProfile();
        setProfile(next);
        setSaved(next);
        setWebsite(next.website);
        setLoaded(true);
        setStep(next.revision ? "editor" : "website");
      })
      .catch((error: Error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const navigate = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a[href]");
      if (
        link &&
        !link.getAttribute("href")?.startsWith("#") &&
        !window.confirm(
          "You have unsaved brand profile changes. Leave without saving?",
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", prevent);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", prevent);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
  function update<K extends keyof BrandProfile>(
    field: K,
    value: BrandProfile[K],
  ) {
    setProfile((p) => ({ ...p, [field]: value }));
    setConfirmed(false);
    setNotice("");
  }
  async function importSource(files?: FileList | null) {
    if (files && !files.length) return;
    setReturnStep(step);
    setBusy("import");
    setError("");
    setNotice("");
    setReview(null);
    setSelected([]);
    try {
      let init: Parameters<typeof request>[1];
      if (files) {
        const body = new FormData();
        Array.from(files).forEach((file) => body.append("files", file));
        init = { method: "POST", form: body };
      } else
        init = {
          method: "POST",
          json: {
            url: /^https?:\/\//i.test(website.trim())
              ? website.trim()
              : `https://${website.trim()}`,
          },
        };
      const result = await request<BrandImport>(
        "/api/brand-profile/import",
        init,
      );
      setReview(result);
      setStep("review");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  function toggleSuggestion(s: BrandSuggestion) {
    setSelected((old) =>
      old.includes(s.id)
        ? old.filter((id) => id !== s.id)
        : [
            ...old.filter(
              (id) =>
                ![
                  "name",
                  "website",
                  "description",
                  "values",
                  "positioning",
                  "audience",
                  "tone",
                  "logo",
                ].includes(s.field) ||
                review?.suggestions.find((r) => r.id === id)?.field !== s.field,
            ),
            s.id,
          ],
    );
  }
  function applySuggestions() {
    if (!review) return;
    const next = structuredClone(profile);
    for (const suggestion of review.suggestions.filter((s) =>
      selected.includes(s.id),
    )) {
      const { field, value, source, excerpt } = suggestion;
      if (field === "colors" || field === "fonts")
        next[field] = [...new Set([...next[field], value])].slice(
          0,
          brandLimits[field],
        );
      else if (field === "logo") next.logo = { url: value, name: "Brand logo" };
      else if (field === "referenceImages") {
        if (
          !next.referenceImages.some((a) => a.url === value) &&
          next.referenceImages.length < brandLimits.referenceImages
        )
          next.referenceImages.push({ url: value, name: source.slice(0, 250) });
      } else next[field] = value;
      next.evidence = next.evidence.filter(
        (e) =>
          !(
            e.field === field &&
            (brandTextFields.includes(field as BrandTextField) ||
              field === "logo")
          ),
      );
      next.evidence.push({ field, value, source, excerpt });
    }
    update("evidence", next.evidence.slice(-brandLimits.evidence));
    setProfile({ ...next, evidence: next.evidence.slice(-brandLimits.evidence) });
    setReview(null);
    setSelected([]);
    setStep("editor");
    setNotice(
      "Selected suggestions added to your draft. Review the fields below, then save your profile.",
    );
  }
  async function uploadAsset(
    event: ChangeEvent<HTMLInputElement>,
    role: "logo" | "referenceImages",
  ) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (
      role === "referenceImages" &&
      files.length + profile.referenceImages.length > 20
    ) {
      setError("You can add up to 20 reference images.");
      return;
    }
    setBusy("upload");
    setError("");
    try {
      const assets = [];
      for (const file of files) {
        const url = await uploadFile(file, { imagesOnly: true });
        assets.push({ url, name: file.name });
      }
      if (role === "logo") update("logo", assets[0]);
      else update("referenceImages", [...profile.referenceImages, ...assets]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function saveProfile() {
    setBusy("save");
    setError("");
    try {
      const result = await request<{ profile: BrandProfile }>(
        "/api/brand-profile",
        {
          method: "PUT",
          json: { ...profile, reviewed: confirmed },
        },
      );
      setProfile(result.profile);
      setSaved(result.profile);
      setConfirmed(false);
      setNotice(
        "Brand profile saved. Design & Tech Packs and Marketing now use this shared version.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  function evidence(field: BrandField, value?: string) {
    return profile.evidence.filter(
      (e) => e.field === field && (!value || e.value === value),
    );
  }
  function discardImport() {
    setReview(null);
    setSelected([]);
    setStep(returnStep);
  }
  function chooseTemplate(template: ClothingBrandTemplate) {
    const { name, colors, fonts, details } = template;
    setReturnStep("templates");
    setSelected([]);
    setConfirmed(false);
    setError("");
    const source = `Starter template: ${name}`;
    setReview({
      sources: [source],
      warnings: [
        "This is an illustrative clothing profile, not information extracted from your brand. Select the example details you want to use, then edit them to match your business. Your brand name, website and assets are not changed by this template.",
      ],
      suggestions: [
        ...colors.map((value) => ({
          id: crypto.randomUUID(),
          field: "colors" as const,
          value,
          source,
          excerpt: "Suggested template palette.",
        })),
        ...fonts.map((value) => ({
          id: crypto.randomUUID(),
          field: "fonts" as const,
          value,
          source,
          excerpt: "Suggested font family. Check font licensing before use.",
        })),
        ...Object.entries(details).map(([field, value]) => ({
          id: crypto.randomUUID(),
          field: field as BrandTextField,
          value,
          source,
          excerpt:
            "Illustrative clothing template. Review and adapt to your own brand before saving.",
        })),
      ],
    });
    setStep("review");
  }
  if (!loaded)
    return (
      <section className="empty">
        <p>{error || "Loading brand profile…"}</p>
        {error && (
          <button className="btn" onClick={() => void loadSaved()}>
            Try again
          </button>
        )}
      </section>
    );
  return (
    <div
      className={`brand-profile-page ${step === "choices" ? "brand-profile-choosing" : ""}`}
    >
      <div className="brand-page-intro">
        <div>
          <span className="module-eyebrow">YOUR BRAND FOUNDATION</span>
          <p className="muted">
            One shared identity for your products, designs and marketing.
          </p>
        </div>
        <span className={`brand-status ${dirty ? "draft" : ""}`}>
          {dirty
            ? "Unsaved changes"
            : saved.revision
              ? "Saved profile"
              : "Not created yet"}
        </span>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="brand-notice">
          <Check size={16} />
          {notice}
        </p>
      )}
      {step !== "editor" && step !== "review" && step !== "scratch" && (
        <div className="brand-onboarding">
          {(step !== "website" || saved.revision > 0 || dirty) && (
            <button
              className="btn brand-flow-back"
              disabled={!!busy}
              onClick={() => {
                setError("");
                setStep(
                  step === "templates"
                    ? "choices"
                    : step === "choices"
                      ? "website"
                      : "editor",
                );
              }}
            >
              ← Back
            </button>
          )}
          {step === "website" && (
            <section className="brand-website-step">
              <span className="brand-step-icon">
                <Globe size={27} />
              </span>
              <h2>Enter your website</h2>
              <p>
                We’ll analyze your website and suggest details for your Brand
                Profile.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void importSource();
                }}
              >
                <input
                  aria-label="Brand website to analyze"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="www.example.com"
                  required
                  value={website}
                  disabled={!!busy}
                  onChange={(e) => setWebsite(e.target.value)}
                />
                <small>
                  You can review and edit every suggestion before saving.
                </small>
                <div className="brand-step-actions">
                  <button
                    className="btn primary"
                    disabled={!!busy || !website.trim()}
                  >
                    {busy === "import" ? "Analyzing…" : "Continue"}
                  </button>
                  <button
                    type="button"
                    className="brand-alternative-link"
                    disabled={!!busy}
                    onClick={() => {
                      setError("");
                      setStep("choices");
                    }}
                  >
                    No website yet?
                  </button>
                </div>
              </form>
            </section>
          )}
          {step === "choices" && (
            <section className="brand-choice-step brand-choice-expanded">
              <h2>Build your Brand Profile</h2>
              <p>Pick how you’d like to get started.</p>
              <p className="muted">
                Add your own information from scratch, or start with an editable
                template.
              </p>
              <div className="brand-start-choices">
                <button
                  className="brand-start-card"
                  onClick={() => {
                    setStep("scratch");
                    setAssistantOpen(true);
                    setProfileTab("overview");
                  }}
                >
                  <Pencil size={26} />
                  <h3>From scratch</h3>
                  <p>
                    Upload your brand materials or enter your details manually.
                  </p>
                  <div className="brand-choice-preview">
                    <span>YOUR BRAND</span>
                    <i />
                    <i />
                    <div>
                      <b />
                      <b />
                      <b />
                    </div>
                  </div>
                  <strong>Build from scratch →</strong>
                </button>
                <button
                  className="brand-start-card"
                  onClick={() => setStep("templates")}
                >
                  <Palette size={26} />
                  <h3>From template</h3>
                  <p>
                    Explore starter palettes, typography and tone. Make them
                    your own.
                  </p>
                  <div className="brand-choice-preview template">
                    <span>Aa &nbsp; Your style</span>
                    <div>
                      <b />
                      <b />
                      <b />
                    </div>
                    <i />
                    <i />
                  </div>
                  <strong>Explore templates →</strong>
                </button>
              </div>
            </section>
          )}
          {step === "templates" && (
            <section className="brand-choice-step">
              <h2>Select a starting point</h2>
              <p>
                Find a clothing direction for your brand. Make every detail your
                own.
              </p>
              <p className="brand-template-note">
                Example profiles · Review before applying · Fully editable
              </p>
              <div className="brand-template-gallery">
                {clothingBrandTemplates.map((template) => (
                  <button
                    className="brand-photo-template"
                    key={template.name}
                    onClick={() => chooseTemplate(template)}
                    aria-label={`Explore ${template.name} — ${template.category}`}
                  >
                    <img
                      src={`/sites/techstyles/templates/${template.image}.jpg`}
                      alt=""
                      loading="lazy"
                    />
                    <span className="brand-template-caption">
                      <strong>{template.name}</strong>
                      <span>{template.category}</span>
                    </span>
                    <span className="brand-template-explore">
                      Explore profile <ArrowUpRight size={16} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      {(step === "editor" || step === "scratch") && (
        <div className="brand-editor-tools">
          <button
            className="btn"
            onClick={() => {
              setError("");
              setStep("website");
            }}
          >
            Import more details
          </button>
          {!assistantOpen && (
            <button className="btn" onClick={() => setAssistantOpen(true)}>
              <MessageSquare size={15} /> Open assistant
            </button>
          )}
          {!saved.revision && (
            <button className="btn" onClick={() => setStep("choices")}>
              Back to setup
            </button>
          )}
        </div>
      )}
      {busy === "import" && (
        <p className="brand-notice" role="status">
          Reading your sources. Nothing is saved to the brand profile during
          import.
        </p>
      )}
      {review && (
        <section
          className="brand-review"
          aria-label="Review extracted suggestions"
        >
          <div className="brand-section-title">
            <div>
              <span className="module-eyebrow">REVIEW BEFORE APPLYING</span>
              <h3>{review.suggestions.length} suggestions found</h3>
              <p>
                Nothing is selected automatically. Text replaces the matching
                draft field; colors, fonts and references are added.
              </p>
            </div>
            <button
              className="icon-button"
              aria-label="Discard import"
              onClick={discardImport}
            >
              <X size={18} />
            </button>
          </div>
          {review.warnings.map((w, i) => (
            <p className="brand-import-warning" key={i}>
              {w}
            </p>
          ))}
          <div className="brand-suggestions">
            {review.suggestions.map((s) => (
              <article
                className={`brand-suggestion ${selected.includes(s.id) ? "selected" : ""}`}
                key={s.id}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={selected.includes(s.id)}
                    onChange={() => toggleSuggestion(s)}
                  />
                  <strong>{brandLabels[s.field]}</strong>
                </label>
                {s.field === "logo" || s.field === "referenceImages" ? (
                  <>
                    <img src={s.value} alt="Extracted asset candidate" />
                    <label>
                      Use as
                      <select
                        value={s.field}
                        onChange={(e) => {
                          setReview({
                            ...review,
                            suggestions: review.suggestions.map((v) =>
                              v.id === s.id
                                ? { ...v, field: e.target.value as BrandField }
                                : v,
                            ),
                          });
                          setSelected((old) => old.filter((id) => id !== s.id));
                        }}
                      >
                        <option value="logo">Logo</option>
                        <option value="referenceImages">Reference image</option>
                      </select>
                    </label>
                  </>
                ) : (
                  <p>
                    {s.field === "colors" && (
                      <i
                        className="brand-swatch"
                        style={{ background: s.value }}
                      />
                    )}
                    {s.value}
                  </p>
                )}
                <details>
                  <summary>Source &amp; evidence</summary>
                  <p>{s.source}</p>
                  <blockquote>{s.excerpt}</blockquote>
                </details>
              </article>
            ))}
          </div>
          <div className="brand-review-actions">
            <span>{selected.length} selected</span>
            <button className="btn" onClick={discardImport}>
              Discard import
            </button>
            <button
              className="btn primary"
              disabled={!selected.length || !!busy}
              onClick={applySuggestions}
            >
              Apply selected to draft
            </button>
          </div>
        </section>
      )}
      {(step === "editor" || step === "scratch") && (
        <>
          <div
            className={`brand-studio ${assistantOpen ? "with-assistant" : ""}`}
          >
            <div className="brand-studio-main">
              <div className="brand-studio-heading">
                <h2>Your Business Profile</h2>
                <p>
                  Build the foundation for your designs, tech packs and
                  marketing.
                </p>
              </div>
              <div
                className="brand-profile-tabs"
                role="tablist"
                aria-label="Profile sections"
              >
                {(["overview", "details"] as const).map((tab) => (
                  <button
                    key={tab}
                    id={`brand-tab-${tab}`}
                    role="tab"
                    aria-selected={profileTab === tab}
                    aria-controls="brand-profile-panel"
                    tabIndex={profileTab === tab ? 0 : -1}
                    onClick={() => setProfileTab(tab)}
                    onKeyDown={(event) => {
                      if (
                        ["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                          event.key,
                        )
                      ) {
                        event.preventDefault();
                        const next =
                          event.key === "Home"
                            ? "overview"
                            : event.key === "End"
                              ? "details"
                              : profileTab === "overview"
                                ? "details"
                                : "overview";
                        setProfileTab(next);
                        document.getElementById(`brand-tab-${next}`)?.focus();
                      }
                    }}
                  >
                    {tab === "overview" ? "Brand Overview" : "Business Details"}
                  </button>
                ))}
              </div>
              <div
                id="brand-profile-panel"
                role="tabpanel"
                aria-labelledby={`brand-tab-${profileTab}`}
                className={`brand-profile-canvas ${profileTab} ${step === "scratch" ? "awaiting-start" : ""}`}
              >
                <fieldset
                  className="brand-editor-grid"
                  disabled={!!busy || step === "scratch"}
                >
                  {profileTab === "overview" ? (
                    <>
                      <section className="brand-card brand-cell-hero">
                        <label className="brand-field brand-hero-field">
                          <span>{brandLabels.name} *</span>
                          <input
                            id="brand-field-name"
                            aria-label={brandLabels.name}
                            ref={nameInput}
                            className="brand-hero-name"
                            value={profile.name}
                            maxLength={200}
                            placeholder="Your brand name"
                            onChange={(e) => update("name", e.target.value)}
                          />
                        </label>
                        {profile.website && (
                          <p className="brand-hero-url">
                            <Globe size={15} />
                            <span>{profile.website}</span>
                          </p>
                        )}
                        <small>
                          {evidence("name", profile.name).length
                            ? `Imported from ${evidence("name", profile.name)[0].source}`
                            : profile.name
                              ? "Manually entered or edited"
                              : "Required — add your brand name"}
                        </small>
                      </section>
                      <section className="brand-card brand-cell-logo">
                        <div className="brand-section-title">
                          <h3>{brandLabels.logo}</h3>
                          <ImageIcon size={20} />
                        </div>
                        <div className="brand-logo-preview">
                          {profile.logo ? (
                            <img src={profile.logo.url} alt="Brand logo" />
                          ) : (
                            <>
                              <ImageIcon size={30} />
                              <span>No logo added</span>
                            </>
                          )}
                        </div>
                        <div className="brand-inline">
                          <label className="btn brand-upload">
                            <Upload size={15} />
                            {profile.logo ? "Replace logo" : "Upload logo"}
                            <input
                              id="brand-field-logo"
                              aria-label="Upload logo"
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              disabled={!!busy}
                              onChange={(e) => void uploadAsset(e, "logo")}
                            />
                          </label>
                          {profile.logo && (
                            <button
                              className="icon-button"
                              aria-label="Remove logo"
                              onClick={() => update("logo", null)}
                            >
                              <X size={17} />
                            </button>
                          )}
                        </div>
                      </section>
                      <section className="brand-card brand-cell-fonts">
                        <div className="brand-section-title">
                          <h3>{brandLabels.fonts}</h3>
                          <Type size={20} />
                        </div>
                        <div className="brand-font-specimens">
                          {profile.fonts.map((font) => (
                            <div className="brand-font-card" key={font}>
                              <span
                                className="brand-font-aa"
                                style={{
                                  fontFamily: `'${font}', Inter, sans-serif`,
                                }}
                              >
                                Aa
                              </span>
                              <strong>{font}</strong>
                              <button
                                className="icon-button"
                                aria-label={`Remove font ${font}`}
                                onClick={() =>
                                  update(
                                    "fonts",
                                    profile.fonts.filter((f) => f !== font),
                                  )
                                }
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          {!profile.fonts.length && (
                            <p className="brand-empty">No font names confirmed.</p>
                          )}
                        </div>
                        <form
                          className="brand-inline"
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (newFont.trim()) {
                              update("fonts", [
                                ...new Set([...profile.fonts, newFont.trim()]),
                              ]);
                              setNewFont("");
                            }
                          }}
                        >
                          <input
                            id="brand-field-fonts"
                            aria-label="Font family name"
                            placeholder="e.g. Figtree"
                            value={newFont}
                            maxLength={120}
                            onChange={(e) => setNewFont(e.target.value)}
                          />
                          <button
                            className="icon-button"
                            aria-label="Add font"
                            disabled={profile.fonts.length >= 12}
                          >
                            <Plus size={17} />
                          </button>
                        </form>
                        <small>
                          Font names are recorded as guidelines. Font files are
                          not downloaded or licensed.
                        </small>
                      </section>
                      <section className="brand-card brand-cell-colors">
                        <div className="brand-section-title">
                          <h3>{brandLabels.colors}</h3>
                          <Palette size={20} />
                        </div>
                        <div className="brand-color-grid">
                          {profile.colors.map((hex) => (
                            <div className="brand-color-chip" key={hex}>
                              <i style={{ background: hex }} />
                              <code>{hex}</code>
                              <button
                                className="icon-button brand-color-remove"
                                aria-label={`Remove color ${hex}`}
                                onClick={() =>
                                  update(
                                    "colors",
                                    profile.colors.filter((c) => c !== hex),
                                  )
                                }
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                          {!profile.colors.length && (
                            <p className="brand-empty">
                              No brand colors confirmed.
                            </p>
                          )}
                        </div>
                        <form
                          className="brand-inline"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const value = newColor.toUpperCase();
                            if (!/^#[0-9A-F]{6}$/.test(value)) {
                              setError("Enter a six-digit hex color.");
                              return;
                            }
                            update("colors", [
                              ...new Set([...profile.colors, value]),
                            ]);
                          }}
                        >
                          <input
                            type="color"
                            aria-label="Choose brand color"
                            value={
                              /^#[\da-f]{6}$/i.test(newColor)
                                ? newColor
                                : "#000000"
                            }
                            onChange={(e) => setNewColor(e.target.value)}
                          />
                          <input
                            id="brand-field-colors"
                            aria-label="Brand color hex"
                            value={newColor}
                            maxLength={7}
                            onChange={(e) => setNewColor(e.target.value)}
                          />
                          <button
                            className="icon-button"
                            aria-label="Add brand color"
                            disabled={profile.colors.length >= 20}
                          >
                            <Plus size={17} />
                          </button>
                        </form>
                      </section>
                      {(["values", "tone"] as const).map((field) => (
                        <section
                          className={`brand-card brand-cell-${field}`}
                          key={field}
                        >
                          <label className="brand-field">
                            <span>{brandLabels[field]}</span>
                            <textarea
                              id={`brand-field-${field}`}
                              aria-label={brandLabels[field]}
                              value={profile[field]}
                              maxLength={6000}
                              rows={field === "values" ? 4 : 3}
                              placeholder="Not provided — add verified details"
                              onChange={(e) => update(field, e.target.value)}
                            />
                            <small>
                              {evidence(field, profile[field]).length
                                ? `Imported from ${evidence(field, profile[field])[0].source}`
                                : profile[field]
                                  ? "Manually entered or edited"
                                  : "Not provided"}
                            </small>
                          </label>
                        </section>
                      ))}
                      <section className="brand-card brand-cell-references">
                        <div className="brand-section-title">
                          <div>
                            <h3>{brandLabels.referenceImages}</h3>
                            <p>Mood, photography and visual direction.</p>
                          </div>
                          <ImageIcon size={20} />
                        </div>
                        <div className="brand-reference-grid">
                          {profile.referenceImages.map((asset, i) => (
                            <figure key={`${asset.url}-${i}`}>
                              <img src={asset.url} alt={asset.name} />
                              <figcaption>{asset.name}</figcaption>
                              <button
                                className="icon-button"
                                aria-label={`Remove reference image ${i + 1}`}
                                onClick={() =>
                                  update(
                                    "referenceImages",
                                    profile.referenceImages.filter(
                                      (_, index) => index !== i,
                                    ),
                                  )
                                }
                              >
                                <X size={15} />
                              </button>
                            </figure>
                          ))}
                        </div>
                        {!profile.referenceImages.length && (
                          <p className="brand-empty">No reference images added.</p>
                        )}
                        <label className="btn brand-upload">
                          <Plus size={15} /> Add images
                          <input
                            id="brand-field-referenceImages"
                            aria-label="Upload reference images"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            multiple
                            disabled={!!busy}
                            onChange={(e) => void uploadAsset(e, "referenceImages")}
                          />
                        </label>
                      </section>
                    </>
                  ) : (
                    <>
                      {(
                        [
                          "website",
                          "description",
                          "positioning",
                          "audience",
                        ] as const
                      ).map((field) => (
                        <section
                          className="brand-card brand-detail-card"
                          key={field}
                        >
                          <div className="brand-detail-head">
                            <div>
                              <h3>{brandLabels[field]}</h3>
                              <p className="brand-detail-value">
                                {profile[field] || (
                                  <span className="brand-detail-empty">
                                    Not provided yet
                                  </span>
                                )}
                              </p>
                            </div>
                            <button
                              id={`brand-field-${field}`}
                              className="brand-edit-pencil"
                              aria-label={`Edit ${brandLabels[field]}`}
                              onClick={() => openFieldEditor(field)}
                            >
                              <Pencil size={16} />
                            </button>
                          </div>
                          <small>
                            {evidence(field, profile[field]).length
                              ? `Imported from ${evidence(field, profile[field])[0].source}`
                              : profile[field]
                                ? "Manually entered or edited"
                                : "Not provided"}
                          </small>
                        </section>
                      ))}
                      <section className="brand-card brand-shared brand-cell-shared">
                        <h3>One profile, shared everywhere</h3>
                        <p>
                          Only your saved, reviewed profile is available to other
                          modules.
                        </p>
                        <Link href="/">
                          Design &amp; Tech Packs <ArrowUpRight size={14} />
                        </Link>
                        <Link href="/modules/marketing/overview">
                          Marketing <ArrowUpRight size={14} />
                        </Link>
                        {saved.updatedAt && (
                          <small>
                            Last saved{" "}
                            {new Date(saved.updatedAt).toLocaleString("en-US")} ·
                            Version {saved.revision}
                          </small>
                        )}
                      </section>
                    </>
                  )}
                </fieldset>
              </div>
              <footer className="brand-save-bar">
                <label>
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  I have reviewed these details. Missing information is
                  intentionally left blank.
                </label>
                <div>
                  <button
                    className="btn"
                    disabled={!!busy}
                    onClick={() => {
                      if (
                        !dirty ||
                        window.confirm(
                          "Discard unsaved changes and reload the saved profile?",
                        )
                      )
                        void loadSaved();
                    }}
                  >
                    <RefreshCw size={15} />
                    Reload saved
                  </button>
                  <button
                    className="btn primary"
                    disabled={
                      !!busy ||
                      step === "scratch" ||
                      !confirmed ||
                      !profile.name.trim() ||
                      !!review
                    }
                    onClick={() => void saveProfile()}
                  >
                    <Save size={15} />
                    {busy === "save" ? "Saving…" : "Save brand profile"}
                  </button>
                </div>
              </footer>
            </div>
            {assistantOpen && (
              <aside className="brand-assistant" aria-label="Brand assistant">
                <header>
                  <MessageSquare size={21} />
                  <strong>Brand Assistant</strong>
                  <button
                    className="icon-button"
                    aria-label="Close assistant"
                    onClick={() => {
                      setAssistantOpen(false);
                      if (step === "scratch") setStep("editor");
                    }}
                  >
                    <X size={18} />
                  </button>
                </header>
                <div className="brand-assistant-body">
                  <span className="module-eyebrow">
                    {step === "scratch"
                      ? "LET’S GET STARTED"
                      : "YOUR PROFILE GUIDE"}
                  </span>
                  <h3>
                    {step === "scratch"
                      ? "Tell us about your brand"
                      : "Make it your own"}
                  </h3>
                  <p>
                    A thoughtful profile helps keep your product designs and
                    marketing consistent.
                  </p>
                  <p>
                    {step === "scratch"
                      ? "First, add any files that help describe your business. We’ll extract available details for you to review."
                      : "Edit the cards directly, or add one detail at a time below. Your answers go into the draft exactly as written."}
                  </p>
                  <label
                    className="brand-dropzone"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (!busy) void importSource(event.dataTransfer.files);
                    }}
                  >
                    <Upload size={28} />
                    <strong>
                      {busy === "import"
                        ? "Reading your files…"
                        : "Upload files here"}
                    </strong>
                    <span>PDF, TXT, MD, JSON, PNG, JPG, WebP</span>
                    <small>Up to 5 files · 10 MB each · 25 MB total</small>
                    <input
                      ref={fileInput}
                      aria-label="Import brand files"
                      type="file"
                      accept=".pdf,.txt,.md,.json,.png,.jpg,.jpeg,.webp"
                      multiple
                      disabled={!!busy}
                      onChange={(event) => {
                        void importSource(event.target.files);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  {step === "scratch" ? (
                    <>
                      <p>
                        No files yet? Skip this step and enter your details
                        manually. You can always import files later.
                      </p>
                      <div className="brand-assistant-actions">
                        <button
                          className="btn"
                          disabled={!!busy}
                          onClick={() => {
                            setStep("editor");
                            setError("");
                          }}
                        >
                          Skip
                        </button>
                        <button
                          className="btn primary"
                          disabled={!!busy}
                          onClick={() => fileInput.current?.click()}
                        >
                          Upload
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <form
                        className="brand-guide-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          if (!guideAnswer.trim()) return;
                          update(guideField, guideAnswer.trim());
                          focusField(guideField);
                          setGuideAnswer("");
                          const next = brandTextFields.find(
                            (field) =>
                              field !== guideField &&
                              field !== "website" &&
                              !profile[field].trim(),
                          );
                          if (next) setGuideField(next);
                          setNotice(
                            `${brandLabels[guideField]} added to your draft. Review before saving.`,
                          );
                        }}
                      >
                        <label htmlFor="brand-guide-field">
                          Which detail would you like to add?
                        </label>
                        <select
                          id="brand-guide-field"
                          value={guideField}
                          onChange={(event) => {
                            setGuideField(event.target.value as BrandTextField);
                            setGuideAnswer("");
                          }}
                        >
                          {brandTextFields.map((field) => (
                            <option key={field} value={field}>
                              {brandLabels[field]}
                            </option>
                          ))}
                        </select>
                        <textarea
                          aria-label={`Your ${brandLabels[guideField].toLowerCase()}`}
                          placeholder={`Enter your ${brandLabels[guideField].toLowerCase()}…`}
                          value={guideAnswer}
                          maxLength={
                            guideField === "name"
                              ? 200
                              : guideField === "website"
                                ? 2000
                                : 6000
                          }
                          onChange={(event) =>
                            setGuideAnswer(event.target.value)
                          }
                          rows={3}
                        />
                        <button
                          className="btn primary"
                          disabled={!!busy || !guideAnswer.trim()}
                        >
                          Add to draft
                        </button>
                      </form>
                      <section
                        className="brand-missing-details"
                        aria-label="Profile details to add"
                      >
                        <div>
                          <h3>
                            {missingFields.length
                              ? "Make this profile your own"
                              : "Your profile details are in place"}
                          </h3>
                          <p>
                            {missingFields.length
                              ? "Not added yet — choose a detail to fill it in. Only your brand name is required; everything else can wait."
                              : "You can review and refine any detail below."}
                          </p>
                        </div>
                        {missingFields.length > 0 && (
                          <div className="brand-missing-links">
                            {missingFields.map((field) => (
                              <button
                                key={field}
                                type="button"
                                disabled={!!busy}
                                onClick={() => focusField(field)}
                              >
                                {brandLabels[field]}
                                {field === "name" ? " (required)" : ""}
                                <Plus size={13} />
                              </button>
                            ))}
                          </div>
                        )}
                      </section>
                    </>
                  )}
                </div>
                <div className="brand-assistant-note">
                  Nothing is saved until you review and save your profile.
                </div>
              </aside>
            )}
          </div>
          {editField && (
            <div
              className="brand-modal-backdrop"
              role="presentation"
              onClick={(e) => {
                if (e.target === e.currentTarget) setEditField(null);
              }}
            >
              <div
                className="brand-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`Edit ${brandLabels[editField]}`}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditField(null);
                }}
              >
                <header className="brand-modal-head">
                  <div>
                    <h3>{brandLabels[editField]}</h3>
                    <p>{detailHelp[editField]}</p>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Close editor"
                    onClick={() => setEditField(null)}
                  >
                    <X size={18} />
                  </button>
                </header>
                {editField === "website" ? (
                  <input
                    autoFocus
                    aria-label={brandLabels[editField]}
                    inputMode="url"
                    placeholder="https://yourbrand.com"
                    maxLength={2000}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                ) : (
                  <textarea
                    autoFocus
                    aria-label={brandLabels[editField]}
                    rows={6}
                    maxLength={6000}
                    placeholder={`Add your ${brandLabels[
                      editField
                    ].toLowerCase()}…`}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                )}
                <footer className="brand-modal-actions">
                  <button className="btn" onClick={() => setEditField(null)}>
                    Cancel
                  </button>
                  <button className="btn primary" onClick={applyFieldEditor}>
                    Apply to draft
                  </button>
                </footer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
