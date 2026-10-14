"use client";
import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Copy,
  Download,
  Globe,
  Image as ImageIcon,
  Pencil,
  Upload,
  X,
} from "lucide-react";
import { request, uploadFile } from "@/lib/client-api";
import {
  brandBookImageLimit,
  type BrandBook,
  type BrandProfile,
  type PublishedBrandBook,
} from "@/lib/brand-types";
import "./brand-book.css";

const profilePath = "/modules/concept/brand-profile";
const bookPath = "/modules/concept/brand-book";
type BookProfile = PublishedBrandBook["profile"];
type BookImages = PublishedBrandBook["book"];

function useBrandBook() {
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [book, setBook] = useState<BrandBook | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    request<{ profile: BrandProfile | null; book: BrandBook }>(
      "/api/brand-book",
    )
      .then((data) => {
        setProfile(data.profile);
        setBook(data.book);
      })
      .catch((e) => setError((e as Error).message));
  }, []);
  return { profile, book, setBook, error };
}
function rgb(hex: string) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}
function isDark(hex: string) {
  const [r, g, b] = rgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}

export function BrandBookPage() {
  const { profile, book, setBook, error: loadError } = useBrandBook();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    coverUrl: "",
    imageUrls: [] as string[],
  });
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (loadError) return <p className="error">{loadError}</p>;
  if (!book) return <div className="empty">Loading your brand book…</div>;
  if (!profile)
    return (
      <section className="bb-start">
        <span className="bb-start-icon">
          <BookOpen size={28} strokeWidth={1.7} />
        </span>
        <h2>Create your brand profile first</h2>
        <p>
          Your brand book is built from your saved Brand Profile: logo, colors,
          typography, values and tone of voice.
        </p>
        <Link className="btn primary" href={profilePath}>
          Open Brand Profile <ArrowUpRight size={15} />
        </Link>
      </section>
    );

  const shareUrl = book.shareToken
    ? `${window.location.origin}/share/brand-book/${book.shareToken}`
    : "";
  const candidates = [
    ...new Set(
      [
        ...profile.referenceImages.map((asset) => asset.url),
        ...book.imageUrls,
        book.coverUrl,
        ...uploaded,
      ].filter(Boolean),
    ),
  ];

  function startEditing() {
    setDraft({ coverUrl: book!.coverUrl, imageUrls: [...book!.imageUrls] });
    setEditing(true);
    setError("");
    setNotice("");
  }
  function toggleImage(url: string) {
    setError("");
    setDraft((current) => {
      if (current.imageUrls.includes(url))
        return {
          ...current,
          imageUrls: current.imageUrls.filter((item) => item !== url),
        };
      if (current.imageUrls.length >= brandBookImageLimit) {
        setError(`Choose up to ${brandBookImageLimit} images.`);
        return current;
      }
      return { ...current, imageUrls: [...current.imageUrls, url] };
    });
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setBusy("upload");
    setError("");
    try {
      const urls: string[] = [];
      for (const file of files) {
        urls.push(await uploadFile(file, { imagesOnly: true }));
      }
      setUploaded((current) => [...current, ...urls]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function saveImages() {
    setBusy("save");
    setError("");
    try {
      const { book: saved } = await request<{ book: BrandBook }>(
        "/api/brand-book",
        {
          method: "PUT",
          json: draft,
        },
      );
      setBook(saved);
      setEditing(false);
      setNotice("Brand book images saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function setPublished(publish: boolean) {
    setBusy("publish");
    setError("");
    try {
      if (publish) {
        const { token } = await request<{ token: string }>(
          "/api/brand-book/share",
          { method: "POST" },
        );
        setBook({ ...book!, shareToken: token });
        setNotice("Brand book published. Anyone with the link can view it.");
      } else {
        await request("/api/brand-book/share", { method: "DELETE" });
        setBook({ ...book!, shareToken: null });
        setNotice("Brand book unpublished. The previous link no longer works.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice("Link copied.");
    } catch {
      setNotice("Select the link to copy it.");
    }
  }

  return (
    <section className="bb-page">
      <header className="bb-toolbar">
        <div>
          <span className="module-eyebrow">CONCEPT &amp; AUDIENCE</span>
          <h2>Brand Book</h2>
          <p className="muted">
            Generated from your saved Brand Profile. Edit the profile to change
            the content; choose the cover and images here.
          </p>
        </div>
        <div className="bb-actions">
          <Link className="btn" href={profilePath}>
            <Pencil size={14} /> Edit Brand Profile
          </Link>
          <button className="btn" onClick={startEditing} disabled={editing}>
            <ImageIcon size={14} /> Edit images
          </button>
          <Link className="btn" href={`${bookPath}/print`}>
            <Download size={14} /> Print / Save PDF
          </Link>
        </div>
      </header>

      <div className="bb-publish panel">
        <div className="bb-publish-copy">
          <Globe size={18} />
          <div>
            <strong>{book.shareToken ? "Published" : "Not published"}</strong>
            <span className="muted">
              {book.shareToken
                ? "Read-only link. Import sources and history are not shared."
                : "Publish to share a read-only link with partners and suppliers."}
            </span>
          </div>
        </div>
        {book.shareToken ? (
          <div className="bb-publish-link">
            <input readOnly value={shareUrl} aria-label="Brand book link" />
            <button className="btn" onClick={copyLink}>
              <Copy size={14} /> Copy
            </button>
            <button
              className="btn"
              disabled={busy === "publish"}
              onClick={() => setPublished(false)}
            >
              Unpublish
            </button>
          </div>
        ) : (
          <button
            className="btn primary"
            disabled={busy === "publish"}
            onClick={() => setPublished(true)}
          >
            Publish
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {notice && !error && <p className="bb-notice">{notice}</p>}

      {editing && (
        <div className="bb-images panel">
          <header>
            <div>
              <h3>Cover and images</h3>
              <p className="muted">
                Pick one cover and up to {brandBookImageLimit} images. Images
                come from your profile&apos;s reference images or new uploads.
              </p>
            </div>
            <label className="btn">
              <Upload size={14} />
              {busy === "upload" ? "Uploading…" : "Upload images"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                hidden
                onChange={upload}
                disabled={!!busy}
              />
            </label>
          </header>
          {candidates.length ? (
            <div className="bb-image-grid">
              {candidates.map((url) => {
                const included = draft.imageUrls.includes(url);
                const cover = draft.coverUrl === url;
                return (
                  <figure
                    key={url}
                    className={`bb-image-option ${included ? "included" : ""} ${cover ? "cover" : ""}`}
                  >
                    <img src={url} alt="" />
                    <figcaption>
                      <button
                        className={`bb-chip ${cover ? "active" : ""}`}
                        aria-pressed={cover}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            coverUrl: cover ? "" : url,
                          }))
                        }
                      >
                        {cover && <Check size={12} />} Cover
                      </button>
                      <button
                        className={`bb-chip ${included ? "active" : ""}`}
                        aria-pressed={included}
                        onClick={() => toggleImage(url)}
                      >
                        {included && <Check size={12} />} Include
                      </button>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          ) : (
            <p className="muted bb-images-empty">
              No images yet. Upload images here or add reference images to your
              Brand Profile.
            </p>
          )}
          <footer>
            <span className="muted">
              {draft.imageUrls.length} of {brandBookImageLimit} images selected
              {draft.coverUrl ? " · cover chosen" : " · no cover"}
            </span>
            <div>
              <button className="btn" onClick={() => setEditing(false)}>
                <X size={14} /> Cancel
              </button>
              <button
                className="btn primary"
                onClick={saveImages}
                disabled={!!busy}
              >
                {busy === "save" ? "Saving…" : "Save images"}
              </button>
            </div>
          </footer>
        </div>
      )}

      <BrandBookDocument profile={profile} book={book} editable />
    </section>
  );
}

export function BrandBookPrint() {
  const { profile, book, error } = useBrandBook();
  if (error) return <p className="error">{error}</p>;
  if (!book) return <div className="empty">Loading brand book…</div>;
  if (!profile)
    return (
      <div className="empty">
        <h2>No brand profile yet</h2>
        <Link className="btn" href={profilePath}>
          Open Brand Profile
        </Link>
      </div>
    );
  return (
    <main className="bb-standalone">
      <div className="bb-standalone-bar no-print">
        <Link className="btn" href={bookPath}>
          Back to Brand Book
        </Link>
        <button className="btn primary" onClick={() => window.print()}>
          <Download size={15} /> Print / Save PDF
        </button>
      </div>
      <BrandBookDocument profile={profile} book={book} />
    </main>
  );
}

export function SharedBrandBook({ token }: { token: string }) {
  const [data, setData] = useState<PublishedBrandBook | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    request<PublishedBrandBook>(
      `/api/share/brand-book/${encodeURIComponent(token)}`,
    )
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, [token]);
  if (error)
    return (
      <div className="empty">
        <h1>Brand book unavailable</h1>
        <p>{error}</p>
      </div>
    );
  if (!data) return <div className="empty">Loading brand book…</div>;
  return (
    <main className="bb-standalone">
      <div className="bb-standalone-bar no-print">
        <span className="muted">Read-only brand book</span>
        <button className="btn primary" onClick={() => window.print()}>
          <Download size={15} /> Print / Save PDF
        </button>
      </div>
      <BrandBookDocument profile={data.profile} book={data.book} />
    </main>
  );
}

function Chapter({
  title,
  intro,
  filled,
  editable,
  missing,
  children,
}: {
  title: string;
  intro?: ReactNode;
  filled: boolean;
  editable?: boolean;
  missing?: ReactNode;
  children: ReactNode;
}) {
  if (!filled && !editable) return null;
  return (
    <section className={`bb-chapter ${filled ? "" : "missing"}`}>
      <div className="bb-chapter-head">
        <span className="bb-chapter-num" aria-hidden="true" />
        <h2>{title}</h2>
        {intro && <p className="bb-chapter-intro">{intro}</p>}
      </div>
      <div className="bb-chapter-body">
        {filled ? (
          children
        ) : (
          <p className="bb-missing">
            {missing || (
              <>
                Not defined yet.{" "}
                <Link href={profilePath}>Add it in your Brand Profile</Link>
              </>
            )}
          </p>
        )}
      </div>
    </section>
  );
}

function BrandBookDocument({
  profile,
  book,
  editable,
}: {
  profile: BookProfile;
  book: BookImages;
  editable?: boolean;
}) {
  const accent = profile.colors[0] || "#1e2026";
  const coverDark = book.coverUrl ? true : isDark(accent);
  const updated = book.updatedAt || profile.updatedAt;
  return (
    <article className="bb-document">
      <section
        className={`bb-cover ${coverDark ? "dark" : "light"}`}
        style={{ background: accent }}
      >
        {book.coverUrl && (
          <img className="bb-cover-image" src={book.coverUrl} alt="" />
        )}
        <div className="bb-cover-content">
          {profile.logo && (
            <img
              className="bb-cover-logo"
              src={profile.logo.url}
              alt={`${profile.name} logo`}
            />
          )}
          <h1>{profile.name}</h1>
          <span>Brand Book</span>
          {updated && (
            <small>
              Updated{" "}
              {new Date(updated).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </small>
          )}
        </div>
      </section>

      <Chapter
        title="About the brand"
        intro="Who the brand is and where it stands."
        filled={!!(profile.description || profile.positioning)}
        editable={editable}
      >
        {profile.description && (
          <p className="bb-lead">{profile.description}</p>
        )}
        {profile.positioning && (
          <div className="bb-block">
            <h3>Positioning</h3>
            <p>{profile.positioning}</p>
          </div>
        )}
      </Chapter>
      <Chapter
        title="Brand values"
        intro="The principles the brand is built on."
        filled={!!profile.values}
        editable={editable}
      >
        <p className="bb-quote">{profile.values}</p>
      </Chapter>
      <Chapter
        title="Target audience"
        intro="The people the brand designs for."
        filled={!!profile.audience}
        editable={editable}
      >
        <p>{profile.audience}</p>
      </Chapter>
      <Chapter
        title="Tone of voice"
        intro="How the brand sounds in words."
        filled={!!profile.tone}
        editable={editable}
      >
        <p className="bb-quote">{profile.tone}</p>
      </Chapter>
      <Chapter
        title="Logo"
        intro="The primary mark, and the room to give it."
        filled={!!profile.logo}
        editable={editable}
      >
        {profile.logo && (
          <div className="bb-logo-grid">
            <figure>
              <div className="bb-logo-tile">
                <img
                  src={profile.logo.url}
                  alt={`${profile.name} logo on white`}
                />
              </div>
              <figcaption>On light backgrounds</figcaption>
            </figure>
            <figure>
              <div className="bb-logo-tile" style={{ background: accent }}>
                <img
                  src={profile.logo.url}
                  alt={`${profile.name} logo on brand color`}
                />
              </div>
              <figcaption>On brand color {accent}</figcaption>
            </figure>
          </div>
        )}
      </Chapter>
      <Chapter
        title="Color palette"
        intro="The colors that carry the brand's personality."
        filled={profile.colors.length > 0}
        editable={editable}
      >
        <div className="bb-colors">
          {profile.colors.map((hex) => (
            <figure key={hex}>
              <div
                className={`bb-swatch ${isDark(hex) ? "dark" : "light"}`}
                style={{ background: hex }}
              />
              <figcaption>
                <strong>{hex}</strong>
                <span>RGB {rgb(hex).join(", ")}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Chapter>
      <Chapter
        title="Typography"
        intro="The typefaces that set the brand's voice."
        filled={profile.fonts.length > 0}
        editable={editable}
      >
        <div className="bb-fonts">
          {profile.fonts.map((font, i) => (
            <div
              className="bb-font"
              key={font}
              style={{ fontFamily: `"${font}", Inter, Arial, sans-serif` }}
            >
              <span className="bb-font-eyebrow">
                {i === 0 ? "Primary typeface" : "Secondary typeface"}
              </span>
              <strong className="bb-font-name">{font}</strong>
              <p className="bb-font-alpha">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
              <p className="bb-font-alpha">
                abcdefghijklmnopqrstuvwxyz 0123456789
              </p>
            </div>
          ))}
        </div>
        <p className="bb-note">
          Samples use the font when it is installed on this device; otherwise a
          fallback is shown.
        </p>
      </Chapter>
      <Chapter
        title="Imagery"
        intro="The visual world the brand lives in."
        filled={book.imageUrls.length > 0}
        editable={editable}
        missing="No images selected yet. Use Edit images to choose up to seven."
      >
        <div
          className={`bb-imagery count-${Math.min(book.imageUrls.length, 4)}`}
        >
          {book.imageUrls.map((url) => (
            <img key={url} src={url} alt="" />
          ))}
        </div>
      </Chapter>
    </article>
  );
}
