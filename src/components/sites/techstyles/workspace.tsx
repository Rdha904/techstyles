"use client";
import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Shirt,
  FolderKanban,
  Pencil,
  Layers,
  Paintbrush,
  Palette,
  Ruler,
  Paperclip,
  Search,
  Plus,
  PanelLeft,
  LifeBuoy,
  Settings,
  ChevronDown,
  Grid2X2,
  List,
  Package,
  CircleCheck,
  X,
  ArrowUpRight,
  Clock,
  Bell,
  Archive,
  MoreHorizontal,
  Lightbulb,
  Factory,
  ClipboardCheck,
  Truck,
  ShoppingBag,
  Megaphone,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { Product } from "@/lib/types";
import { BrandProfilePage, BrandProfileSummary } from "./brand-profile";
import { WorkspaceDashboard } from "./workspace-dashboard";
import { ConceptOverview } from "./concept-overview";
import { BrandBookPage, BrandBookPrint, SharedBrandBook } from "./brand-book";
import { LibraryPage } from "./libraries";
import { ProductEditor, ProductCanvas, SharedProduct } from "./product-editor";
export const assets = "/sites/techstyles/";
export async function api<T>(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data as T;
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", f);
    return () => document.removeEventListener("keydown", f);
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function Brand() {
  return (
    <Link href="/" className="brand">
      <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">
        {[
          [6, 6],
          [19, 6],
          [32, 6],
          [19, 19],
          [19, 32],
        ].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="10" height="10" rx="2.4" />
        ))}
      </svg>
      techstyles
    </Link>
  );
}
const nav = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["products", "Products", Shirt],
  ["projects", "Projects", FolderKanban],
  ["sketches", "Sketch Library", Pencil],
  ["materials", "Materials", Layers],
  ["artworks", "Artworks", Paintbrush],
  ["colors", "Colorways", Palette],
  ["size-charts", "Size Charts", Ruler],
  ["attachments", "Attachments Library", Paperclip],
] as const;
const modules = [
  {
    id: "home",
    label: "Dashboard",
    icon: LayoutDashboard,
    pages: ["Overview"],
  },
  {
    id: "concept",
    label: "Concept & Audience",
    icon: Lightbulb,
    pages: [
      "Overview",
      "Brand Profile",
      "Brand Book",
      "Target Audience",
      "Brand Website",
    ],
  },
  { id: "design", label: "Design & Tech Packs", icon: Pencil, pages: [] },
  {
    id: "manufacturers",
    label: "Manufacturers & Quotes",
    icon: Factory,
    pages: ["Overview", "Manufacturers", "Quote Requests", "Quote Comparison"],
  },
  {
    id: "samples",
    label: "Samples & Approvals",
    icon: ClipboardCheck,
    pages: ["Overview", "Sample Requests", "Sample Reviews", "Approvals"],
  },
  {
    id: "production",
    label: "Production",
    icon: Layers,
    pages: ["Overview", "Production Orders", "Timeline", "Milestones"],
  },
  {
    id: "quality",
    label: "Quality & Inventory",
    icon: ShieldCheck,
    pages: ["Overview", "Quality Checks", "Inventory", "Stock Movements"],
  },
  {
    id: "store",
    label: "Store & Sales",
    icon: ShoppingBag,
    pages: ["Overview", "Product Listings", "Orders", "Sales Analytics"],
  },
  {
    id: "shipping",
    label: "Shipping & Feedback",
    icon: Truck,
    pages: ["Overview", "Shipments", "Returns", "Customer Feedback"],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    pages: [
      "Overview",
      "Brand Profile",
      "Campaigns",
      "Content Calendar",
      "Assets",
    ],
  },
];
function pageSlug(label: string) {
  return label.toLowerCase().replaceAll(" ", "-");
}
const subtitles: Record<string, string> = {
  dashboard: "Product development overview",
  products: "Manage styles across all seasons and stages",
  projects: "Organize your collections and seasons",
  sketches: "Your reusable technical sketches",
  materials: "Manage your materials and BOM templates",
  artworks: "Manage artwork and decoration files",
  colors: "Your colorway and Pantone library",
  "size-charts": "Manage graded measurement specifications",
  attachments: "Reference files for your products",
  settings: "Workspace preferences and integrations",
};
export function ProductForm({
  product,
  onClose,
  onSave,
}: {
  product?: Product;
  onClose: () => void;
  onSave: (p: Product) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (!String(data.code || "").trim())
      data.code = `${String(data.category).slice(0, 3).toUpperCase()}-${String(data.name).slice(0, 3).toUpperCase()}-${crypto.randomUUID().slice(0, 3).toUpperCase()}`;
    try {
      const p = await api<Product>(
        product ? `/api/products/${product.id}` : "/api/products",
        product ? "PATCH" : "POST",
        data,
      );
      onSave(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={product ? "Edit Product" : "Add New Product"}
      onClose={onClose}
    >
      <p className="muted">
        Core product details — you&apos;ll add the full tech pack next.
      </p>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label className="full">
            Product Name *
            <input
              name="name"
              required
              defaultValue={product?.name}
              placeholder="e.g. Relaxed Fleece Hoodie"
              autoFocus
            />
          </label>
          <label>
            Product Code
            <input
              name="code"
              defaultValue={product?.code}
              placeholder="Leave blank to auto-generate"
            />
          </label>
          <label>
            Category *
            <select
              name="category"
              required
              defaultValue={product?.category || ""}
            >
              <option value="" disabled>
                Choose a category
              </option>
              {[
                "Hoodies",
                "T-Shirts",
                "Shirts",
                "Jackets",
                "Trousers",
                "Sweatshirts",
                "Shorts",
                "Dresses",
                "Knitwear",
                "Accessories",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Stage
            <select name="stage" defaultValue={product?.stage || "Idea"}>
              {[
                "Idea",
                "Development",
                "Sampling",
                "Production",
                "Completed",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Base size
            <select name="baseSize" defaultValue={product?.baseSize || "M"}>
              {["XS", "S", "M", "L", "XL", "XXL"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Project
            <input
              name="project"
              defaultValue={product?.project}
              placeholder="No project"
            />
          </label>
          <label>
            Supplier
            <input name="supplier" defaultValue={product?.supplier} />
          </label>
          <label className="full">
            Description
            <textarea
              name="description"
              defaultValue={product?.description}
              placeholder="Describe the fit, fabric and key details…"
            />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy}>
            {busy
              ? "Saving…"
              : product
                ? "Save Changes"
                : "Continue to Add Details"}{" "}
            <ArrowUpRight size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
function useNavigationPreference(key: string) {
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(key) === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      /* Storage may be unavailable. */
    }
  }, [key, value]);
  return [value, setValue] as const;
}
export function Workspace({ path }: { path: string[] }) {
  const router = useRouter();
  const section = path[0] || "dashboard";
  const pathKey = path.join("/");
  const activeModule =
    modules.find(
      (m) => m.id === (section === "modules" ? path[1] : "design"),
    ) || modules.find((module) => module.id === "design")!;
  const modulePage = activeModule.pages.find(
    (page) => pageSlug(page) === (path[2] || "overview"),
  );
  const isDesign = activeModule.id === "design";
  const isWorkspaceDashboard = activeModule.id === "home";
  const [primaryCollapsed, setPrimaryCollapsed] = useNavigationPreference(
    "techstyles-primary-collapsed",
  );
  const [secondaryHidden, setSecondaryHidden] = useNavigationPreference(
    "techstyles-secondary-hidden",
  );
  const [focusMode, setFocusMode] = useNavigationPreference(
    "techstyles-focus-mode",
  );
  function toggleSecondary() {
    if (window.matchMedia("(min-width: 1101px)").matches) {
      setFocusMode(false);
      setSecondaryHidden((hidden) => !hidden);
    } else {
      setSidebar((open) => !open);
    }
  }
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebar, setSidebar] = useState(
    () => sessionStorage.getItem("techstyles-navigation-open") === "true",
  );
  useEffect(() => {
    sessionStorage.removeItem("techstyles-navigation-open");
  }, [pathKey]);
  const [create, setCreate] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [toast, setToast] = useState("");
  const [notifications, setNotifications] = useState(false);
  function notify(text: string) {
    setToast(text);
    setTimeout(() => setToast(""), 3500);
  }
  useEffect(() => {
    if (pathKey.startsWith("share/")) return;
    let live = true;
    api<Product[]>("/api/products")
      .then((p) => {
        if (live) {
          setProducts(p);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (live) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, [pathKey]);
  const title =
    section === "modules"
      ? activeModule.id === "home"
        ? "Dashboard"
        : modulePage || "Page not found"
      : nav.find((n) => n[0] === section)?.[1] || "Settings";
  function saved(p: Product) {
    setProducts((old) =>
      old.some((x) => x.id === p.id)
        ? old.map((x) => (x.id === p.id ? p : x))
        : [p, ...old],
    );
    setCreate(false);
    router.push(`/products/${p.id}`);
  }
  useEffect(() => {
    if (!sidebar) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebar(false);
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [sidebar]);
  const product = products.find((p) => p.id === path[1]);
  if (section === "share" && path[1] === "brand-book")
    return <SharedBrandBook token={path[2] || ""} />;
  if (section === "share") return <SharedProduct token={path[1] || ""} />;
  if (
    section === "modules" &&
    path[1] === "concept" &&
    path[2] === "brand-book" &&
    path[3] === "print"
  )
    return <BrandBookPrint />;
  if (section === "products" && path[2] === "canvas" && product)
    return (
      <ProductCanvas
        product={product}
        onChange={(p) =>
          setProducts((old) => old.map((x) => (x.id === p.id ? p : x)))
        }
      />
    );
  if (section === "products" && path[2] === "print" && product)
    return <SharedProduct product={product} />;
  return (
    <div
      className={`app-shell ${primaryCollapsed ? "primary-collapsed" : ""} ${secondaryHidden || isWorkspaceDashboard ? "secondary-hidden" : ""} ${focusMode ? "focus-mode" : ""}`}
    >
      {sidebar && (
        <button
          className="navigation-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebar(false)}
        />
      )}
      <div
        className={`navigation-panel ${sidebar ? "open" : ""}`}
        id="workspace-navigation"
      >
        <aside
          className="module-sidebar"
          aria-label="Modules"
          id="module-navigation"
        >
          <div className="primary-heading">
            <Brand />
            <button
              className="icon-button desktop-navigation-control"
              aria-label={
                primaryCollapsed ? "Expand modules" : "Collapse modules"
              }
              title={primaryCollapsed ? "Expand modules" : "Collapse modules"}
              aria-expanded={!primaryCollapsed}
              aria-controls="module-navigation"
              onClick={() => setPrimaryCollapsed((collapsed) => !collapsed)}
            >
              {primaryCollapsed ? (
                <PanelLeftOpen size={17} />
              ) : (
                <PanelLeftClose size={17} />
              )}
            </button>
          </div>
          <span className="nav-label">WORKSPACE</span>
          <nav
            className="nav-links module-links"
            aria-label="Primary navigation"
          >
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Link
                  key={module.id}
                  aria-label={module.label}
                  title={primaryCollapsed ? module.label : undefined}
                  onClick={() => {
                    setSecondaryHidden(false);
                    if (sidebar)
                      sessionStorage.setItem(
                        "techstyles-navigation-open",
                        "true",
                      );
                  }}
                  href={
                    module.id === "design"
                      ? "/"
                      : `/modules/${module.id}/overview`
                  }
                  className={activeModule.id === module.id ? "active" : ""}
                  aria-current={
                    activeModule.id === module.id ? "true" : undefined
                  }
                >
                  <Icon size={18} />
                  <span>{module.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="module-footer">
            <span className="avatar">LS</span>
            <span>
              Local Studio<small>Your workspace</small>
            </span>
          </div>
        </aside>
        {!isWorkspaceDashboard && (
          <aside
            className="sidebar secondary-sidebar"
            id="page-navigation"
            aria-label={`${activeModule.label} navigation`}
          >
            <div className="module-heading">
              <h2>{activeModule.label}</h2>
              <button
                className="icon-button desktop-navigation-control"
                aria-label="Hide page sidebar"
                title="Hide page sidebar"
                onClick={() => setSecondaryHidden(true)}
              >
                <PanelLeftClose size={17} />
              </button>
              <button
                className="icon-button mobile-nav-close"
                aria-label="Close navigation"
                onClick={() => setSidebar(false)}
              >
                <X size={18} />
              </button>
            </div>
            {isDesign ? (
              <>
                <button
                  className="sidebar-search"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search size={14} /> Search...
                </button>
                <span className="nav-label">MAIN</span>
                <nav className="nav-links" aria-label="Design pages">
                  {nav.slice(0, 3).map(([key, label, Icon]) => (
                    <div key={key}>
                      <Link
                        className={section === key ? "active" : ""}
                        aria-current={section === key ? "page" : undefined}
                        href={key === "dashboard" ? "/" : `/${key}`}
                        onClick={() => setSidebar(false)}
                      >
                        <Icon size={16} />
                        {label}
                        {key === "products" && (
                          <ChevronDown
                            size={14}
                            style={{ marginLeft: "auto" }}
                          />
                        )}
                      </Link>
                      {key === "products" && section === "products" && (
                        <div className="subnav">
                          <Link
                            href="/products"
                            className={!path[1] ? "active" : ""}
                            onClick={() => setSidebar(false)}
                          >
                            <List size={14} />
                            Products Library
                          </Link>
                          <button onClick={() => setCreate(true)}>
                            <Plus size={14} />
                            Create new tech pack
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
                <nav className="nav-links" aria-label="Brand foundation">
                  <Link href="/modules/concept/brand-profile">
                    <Palette size={16} />
                    Brand Profile
                  </Link>
                </nav>
                <span className="nav-label">LIBRARY</span>
                <nav className="nav-links" aria-label="Library">
                  {nav.slice(3).map(([key, label, Icon]) => (
                    <Link
                      key={key}
                      className={section === key ? "active" : ""}
                      aria-current={section === key ? "page" : undefined}
                      href={`/${key}`}
                      onClick={() => setSidebar(false)}
                    >
                      <Icon size={16} />
                      {label}
                    </Link>
                  ))}
                </nav>
              </>
            ) : (
              <nav
                className="nav-links"
                aria-label={`${activeModule.label} pages`}
              >
                {activeModule.pages.map((page) => (
                  <Link
                    key={page}
                    href={
                      page === "Brand Profile"
                        ? "/modules/concept/brand-profile"
                        : `/modules/${activeModule.id}/${pageSlug(page)}`
                    }
                    className={modulePage === page ? "active" : ""}
                    aria-current={modulePage === page ? "page" : undefined}
                    onClick={() => setSidebar(false)}
                  >
                    <LayoutDashboard size={16} />
                    {page}
                  </Link>
                ))}
              </nav>
            )}
            <div className="sidebar-bottom">
              <nav className="nav-links" style={{ marginBottom: 0 }}>
                <a href="mailto:support@techstyles.io">
                  <LifeBuoy size={16} />
                  Support
                </a>
              </nav>
              <div className="profile">
                <span className="avatar">LS</span>
                <div>
                  <span>Local Studio</span>
                  <small style={{ display: "block", fontSize: 10 }}>
                    Your workspace
                  </small>
                </div>
                <Link
                  aria-label="Settings"
                  href="/settings"
                  className="icon-button"
                  style={{ marginLeft: "auto" }}
                >
                  <Settings size={15} />
                </Link>
              </div>
            </div>
          </aside>
        )}
      </div>
      <div className="app-main">
        <div className="local-banner">
          <div
            className="desktop-layout-controls"
            aria-label="Workspace layout"
          >
            <button
              className="icon-button"
              aria-label={
                primaryCollapsed ? "Expand modules" : "Collapse modules"
              }
              title={primaryCollapsed ? "Expand modules" : "Collapse modules"}
              aria-expanded={!primaryCollapsed && !focusMode}
              onClick={() => {
                setFocusMode(false);
                setPrimaryCollapsed((collapsed) => !collapsed);
              }}
            >
              <PanelLeft size={15} />
            </button>
            {!isWorkspaceDashboard && (
              <button
                className="icon-button"
                aria-label={
                  secondaryHidden || focusMode
                    ? "Show page sidebar"
                    : "Hide page sidebar"
                }
                title={
                  secondaryHidden || focusMode
                    ? "Show page sidebar"
                    : "Hide page sidebar"
                }
                aria-expanded={!secondaryHidden && !focusMode}
                aria-controls="page-navigation"
                onClick={() => {
                  setFocusMode(false);
                  setSecondaryHidden(focusMode ? false : !secondaryHidden);
                }}
              >
                <LayoutDashboard size={15} />
              </button>
            )}
            <button
              className="focus-toggle"
              aria-pressed={focusMode}
              onClick={() => setFocusMode((focused) => !focused)}
              title={
                focusMode ? "Restore previous layout" : "Hide both sidebars"
              }
            >
              {focusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              {focusMode ? "Exit focus" : "Focus mode"}
            </button>
          </div>
          <Clock size={13} /> Independent workspace · Saved on this computer{" "}
          <Link href="/settings" style={{ marginLeft: "auto" }}>
            Workspace settings
          </Link>
        </div>
        {product && section === "products" ? (
          <ProductEditor
            product={product}
            onChange={(p) =>
              setProducts((old) => old.map((x) => (x.id === p.id ? p : x)))
            }
            onToggleSidebar={toggleSecondary}
          />
        ) : (
          <>
            <header className="app-header">
              <button
                className="icon-button mobile-only-toggle"
                aria-label="Toggle navigation"
                aria-expanded={sidebar}
                aria-controls="workspace-navigation"
                onClick={() => setSidebar(!sidebar)}
              >
                <PanelLeft size={16} />
              </button>
              <div>
                <h1>{title}</h1>
                <small>
                  {section === "modules"
                    ? activeModule.label
                    : subtitles[section]}
                </small>
              </div>
              <span className="spacer" />
              {section === "products" && (
                <button className="btn primary" onClick={() => setCreate(true)}>
                  <Plus size={17} />
                  Create New Tech Pack
                </button>
              )}
              <Link className="btn" href="/settings">
                <Settings size={14} />
                <span className="header-subtitle">Workspace</span>
              </Link>
              <button
                className="icon-button"
                aria-label="Recent activity"
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={17} />
              </button>
            </header>
            <main className="app-content">
              {error && <p className="error">{error}</p>}
              {section === "modules" && activeModule.id === "home" ? (
                <WorkspaceDashboard
                  products={products}
                  loading={loading}
                  failed={!!error}
                />
              ) : section === "modules" &&
                activeModule.id === "concept" &&
                modulePage === "Brand Profile" ? (
                <BrandProfilePage />
              ) : section === "modules" &&
                activeModule.id === "concept" &&
                modulePage === "Brand Book" ? (
                <BrandBookPage />
              ) : section === "modules" &&
                activeModule.id === "concept" &&
                modulePage === "Overview" ? (
                <ConceptOverview />
              ) : section === "modules" && modulePage ? (
                <section className="module-workspace">
                  {activeModule.id === "marketing" && <BrandProfileSummary />}
                  <span className="module-eyebrow">{activeModule.label}</span>
                  <h2>
                    {modulePage === "Overview"
                      ? activeModule.label
                      : modulePage}
                  </h2>
                  <p className="muted">
                    {modulePage === "Overview"
                      ? "Choose an area below to open its workspace."
                      : "This workspace is ready for the next stage of your brand. Tools for this area have not been added yet."}
                  </p>
                  {modulePage === "Overview" ? (
                    <div className="module-page-grid">
                      {activeModule.pages.slice(1).map((page) => (
                        <Link
                          className="module-page-card"
                          key={page}
                          href={
                            page === "Brand Profile"
                              ? "/modules/concept/brand-profile"
                              : `/modules/${activeModule.id}/${pageSlug(page)}`
                          }
                        >
                          <LayoutDashboard size={21} />
                          <h3>{page}</h3>
                          <span>
                            Open workspace <ArrowUpRight size={16} />
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="module-empty">
                      <activeModule.icon size={36} />
                      <h3>No {modulePage.toLowerCase()} yet</h3>
                      <p>
                        Manage your designs and tech packs while this module is
                        being prepared.
                      </p>
                      <Link className="btn" href="/">
                        Open Design &amp; Tech Packs
                      </Link>
                    </div>
                  )}
                </section>
              ) : loading ? (
                <div className="empty">Loading your workspace…</div>
              ) : section === "products" && path[1] ? (
                <div className="empty">
                  <h2>Product not found</h2>
                  <Link className="btn" href="/products">
                    Back to Products
                  </Link>
                </div>
              ) : section === "dashboard" ? (
                <>
                  <BrandProfileSummary />
                  <Dashboard products={products} />
                </>
              ) : section === "products" ? (
                <ProductLibrary
                  products={products}
                  onCreate={() => setCreate(true)}
                />
              ) : section === "settings" ? (
                <SettingsPage notify={notify} />
              ) : nav.some((n) => n[0] === section) ? (
                <LibraryPage key={section} collection={section} />
              ) : (
                <div className="empty">
                  <h2>Page not found</h2>
                  <Link href="/">Go to Dashboard</Link>
                </div>
              )}
            </main>
          </>
        )}
      </div>
      {create && (
        <ProductForm onClose={() => setCreate(false)} onSave={saved} />
      )}
      {searchOpen && (
        <Modal
          title="Search your workspace"
          onClose={() => setSearchOpen(false)}
        >
          <input
            aria-label="Search products"
            autoFocus
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search products, names or codes…"
            style={{ width: "100%", margin: "20px 0" }}
          />
          {products
            .filter((p) =>
              (p.name + p.code)
                .toLowerCase()
                .includes(globalSearch.toLowerCase()),
            )
            .map((p) => (
              <Link
                key={p.id}
                className="recent-product"
                href={`/products/${p.id}`}
                onClick={() => setSearchOpen(false)}
              >
                <Shirt size={20} />
                {p.name}
                <span className="spacer" />
                <small>{p.code}</small>
              </Link>
            ))}
        </Modal>
      )}
      {notifications && (
        <Modal title="Recent Activity" onClose={() => setNotifications(false)}>
          {products.map((p) => (
            <Link
              href={`/products/${p.id}`}
              key={p.id}
              className="recent-product"
              onClick={() => setNotifications(false)}
            >
              <Package size={18} />
              <div>
                {p.name}
                <small>
                  Last modified {new Date(p.updatedAt).toLocaleString("en-US")}
                </small>
              </div>
            </Link>
          ))}
        </Modal>
      )}
      {toast && (
        <div role="status" className="toast">
          {toast}
        </div>
      )}
    </div>
  );
}
function Dashboard({ products }: { products: Product[] }) {
  return (
    <>
      <div className="stats">
        <div className="panel stat">
          <div>
            <small>PRODUCTS IN DEVELOPMENT</small>
            <strong>
              {
                products.filter(
                  (p) =>
                    !["Production", "Completed"].includes(p.stage) &&
                    !p.archived,
                ).length
              }
            </strong>
          </div>
          <Package size={21} />
        </div>
        <div className="panel stat">
          <div>
            <small>PRODUCTS IN PRODUCTION</small>
            <strong>
              {
                products.filter((p) => p.stage === "Production" && !p.archived)
                  .length
              }
            </strong>
          </div>
          <CircleCheck size={21} />
        </div>
      </div>
      <div className="dashboard-columns">
        <section className="panel">
          <div className="panel-title">
            <h2>Recent Products</h2>
            <Link
              href="/products"
              className="muted"
              style={{ color: "var(--blue)" }}
            >
              View all ↗
            </Link>
          </div>
          {products.slice(0, 6).map((p) => (
            <Link
              href={`/products/${p.id}`}
              className="recent-product"
              key={p.id}
            >
              <img
                src={p.cover || p.sketch || assets + "hero-sketch-hoodie.png"}
                alt=""
              />
              <div>
                {p.name}
                <small>{p.category}</small>
              </div>
              <span className="spacer" />
              <span className={`badge ${p.stage.toLowerCase()}`}>
                {p.stage}
              </span>
              <small>
                {new Date(p.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </small>
            </Link>
          ))}
          {!products.length && (
            <div className="empty">
              Create your first tech pack in Products.
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-title">
            <h2>Recent Activity</h2>
            <Link href="/products" className="btn">
              View All Activity <ArrowUpRight size={13} />
            </Link>
          </div>
          {products.slice(0, 6).map((p) => (
            <Link
              className="recent-product"
              href={`/products/${p.id}`}
              key={p.id}
            >
              <Package size={18} />
              <div>
                Updated product &quot;{p.name}&quot;
                <small>{new Date(p.updatedAt).toLocaleString("en-US")}</small>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
function ProductLibrary({
  products,
  onCreate,
}: {
  products: Product[];
  onCreate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [stage, setStage] = useState("");
  const [project, setProject] = useState("");
  const [supplier, setSupplier] = useState("");
  const [sort, setSort] = useState("updated");
  const [grid, setGrid] = useState(true);
  const [archived, setArchived] = useState(false);
  const filtered = products
    .filter(
      (p) =>
        !!p.archived === archived &&
        (!category || p.category === category) &&
        (!stage || p.stage === stage) &&
        (!project || p.project === project) &&
        (!supplier || p.supplier === supplier) &&
        (p.name + " " + p.code).toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : b.updatedAt.localeCompare(a.updatedAt),
    );
  return (
    <>
      <div className="product-filters">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Search products"
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {[
          [
            category,
            setCategory,
            "All Categories",
            products.map((p) => p.category),
          ],
          [project, setProject, "All Projects", products.map((p) => p.project)],
          [
            supplier,
            setSupplier,
            "All Suppliers",
            products.map((p) => p.supplier),
          ],
          [stage, setStage, "All Stages", products.map((p) => p.stage)],
        ].map(([v, set, label, options]) => (
          <select
            key={String(label)}
            aria-label={String(label)}
            value={v as string}
            onChange={(e) => (set as (s: string) => void)(e.target.value)}
          >
            <option value="">{String(label)}</option>
            {[...new Set(options as string[])].filter(Boolean).map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        ))}
        <select
          aria-label="Sort products"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="updated">Recently updated</option>
          <option value="name">Name A–Z</option>
        </select>
        <button
          className={`btn ${archived ? "primary" : ""}`}
          onClick={() => setArchived(!archived)}
        >
          <Archive size={14} />
          Archived
        </button>
      </div>
      <div className="view-tools">
        <button
          className={`btn ${!grid ? "primary" : ""}`}
          aria-label="List view"
          onClick={() => setGrid(false)}
        >
          <List size={17} />
        </button>
        <button
          className={`btn ${grid ? "primary" : ""}`}
          aria-label="Grid view"
          onClick={() => setGrid(true)}
        >
          <Grid2X2 size={17} />
        </button>
      </div>
      <small>
        {filtered.length} {filtered.length === 1 ? "style" : "styles"}
      </small>
      {!filtered.length ? (
        <div className="panel empty" style={{ marginTop: 20 }}>
          <Shirt size={35} />
          <h3>
            {products.length
              ? "No products match your filters"
              : "Your first tech pack starts here"}
          </h3>
          <p>
            Keep every detail, from first sketch to production, in one place.
          </p>
          <button className="btn primary" onClick={onCreate}>
            <Plus size={16} />
            Create New Tech Pack
          </button>
        </div>
      ) : grid ? (
        <div className="product-grid">
          {filtered.map((p) => (
            <Link
              className="panel product-card"
              key={p.id}
              href={`/products/${p.id}`}
            >
              <div className="product-card-image">
                {p.cover || p.sketch ? (
                  <img src={p.cover || p.sketch} alt={p.name} />
                ) : (
                  <Shirt size={75} strokeWidth={0.8} />
                )}
                <span className={`badge ${p.stage.toLowerCase()}`}>
                  {p.stage}
                </span>
              </div>
              <div className="product-card-text">
                <h3>
                  {p.name}
                  {p.id === "demo-hoodie" && (
                    <span className="badge sampling" style={{ marginLeft: 8 }}>
                      DEMO
                    </span>
                  )}
                </h3>
                <code>{p.code}</code>
                <p>
                  {p.category}
                  <span style={{ float: "right" }}>{p.project || "—"}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="panel table-wrap" style={{ marginTop: 18 }}>
          <table>
            <thead>
              <tr>
                {[
                  "Product",
                  "Article code",
                  "Category",
                  "Stage",
                  "Project",
                  "Updated",
                  "",
                ].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/products/${p.id}`}>{p.name}</Link>
                  </td>
                  <td>{p.code}</td>
                  <td>{p.category}</td>
                  <td>
                    <span className="badge">{p.stage}</span>
                  </td>
                  <td>{p.project || "—"}</td>
                  <td>{new Date(p.updatedAt).toLocaleDateString("en-US")}</td>
                  <td>
                    <Link
                      aria-label={`Open ${p.name}`}
                      href={`/products/${p.id}`}
                    >
                      <MoreHorizontal size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
function SettingsPage({ notify }: { notify: (s: string) => void }) {
  return (
    <section className="panel settings-panel">
      <h1>Workspace settings</h1>
      <p className="muted">Your independent Techstyles workspace</p>
      <h2 style={{ marginTop: 30 }}>Storage</h2>
      <p>
        Brand profiles, tech packs, libraries and uploads are saved on this
        computer, inside this application&apos;s data folder.
      </p>
      <h2 style={{ marginTop: 30 }}>AI generation</h2>
      <p>
        Add your own <code>OPENAI_API_KEY</code> to <code>.env.local</code> and
        restart the application to enable sketch and mockup generation. Without
        a configured key, no AI request is sent.
      </p>
      <p className="muted">
        This local workspace has no subscription or credit billing.
      </p>
      <h2 style={{ marginTop: 30 }}>Backup</h2>
      <button
        className="btn"
        onClick={async () => {
          try {
            const data = await api("/api/products");
            const libraries = await api("/api/libraries");
            const brand = await api<{ profile: unknown }>("/api/brand-profile");
            const url = URL.createObjectURL(
              new Blob(
                [
                  JSON.stringify(
                    { products: data, libraries, brandProfile: brand.profile },
                    null,
                    2,
                  ),
                ],
                { type: "application/json" },
              ),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = "techstyles-workspace.json";
            a.click();
            URL.revokeObjectURL(url);
            notify("Workspace data exported");
          } catch (e) {
            notify((e as Error).message);
          }
        }}
      >
        Export workspace data
      </button>
      <p className="muted" style={{ marginTop: 12 }}>
        Includes structured data. Keep the data/uploads folder with your backup
        for uploaded files.
      </p>
    </section>
  );
}
