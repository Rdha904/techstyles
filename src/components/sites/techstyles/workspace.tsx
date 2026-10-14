"use client";
import { useEffect, useState } from "react";
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
  Settings,
  ChevronDown,
  Grid2X2,
  List,
  Package,
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
import type { Product, Manufacturer, QuoteRequest } from "@/lib/types";
import type { BrandProfile } from "@/lib/brand-types";
import { workspaceIdentity } from "@/lib/workspace-identity";
import { BrandProfilePage, BrandProfileSummary } from "./brand-profile";
import { WorkspaceDashboard } from "./workspace-dashboard";
import { ConceptOverview } from "./concept-overview";
import { BrandBookPage, BrandBookPrint, SharedBrandBook } from "./brand-book";
import { LibraryPage } from "./libraries";
import { ManufacturersPage } from "./manufacturers";
import { ManufacturersOverview } from "./manufacturers-overview";
import { QuoteRequestsPage } from "./quote-requests";
import { QuoteComparisonPage } from "./quote-comparison";
import { ProductEditor, ProductCanvas, SharedProduct } from "./product-editor";
import { request, manufacturersApi, quoteRequestsApi } from "@/lib/client-api";
import { Modal, Brand } from "./ui";
import { ProductForm } from "./product-form";
import {
  navRoutes,
  moduleRoutes,
  pageSlug,
  resolveView,
  viewOwnsPageHeading,
} from "./workspace-routes";
const navIcons = {
  products: Shirt,
  projects: FolderKanban,
  sketches: Pencil,
  materials: Layers,
  artworks: Paintbrush,
  colors: Palette,
  "size-charts": Ruler,
  attachments: Paperclip,
};
const moduleIcons = {
  home: LayoutDashboard,
  concept: Lightbulb,
  design: Pencil,
  manufacturers: Factory,
  samples: ClipboardCheck,
  production: Layers,
  quality: ShieldCheck,
  store: ShoppingBag,
  shipping: Truck,
  marketing: Megaphone,
};
const nav = navRoutes.map(
  ([key, label]) => [key, label, navIcons[key]] as const,
);
const modules = moduleRoutes.map((module) => ({
  ...module,
  icon: moduleIcons[module.id as keyof typeof moduleIcons],
}));
const subtitles: Record<string, string> = {
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
  const { section, moduleId, modulePage, title, itemId, view } =
    resolveView(path);
  const pathKey = path.join("/");
  const activeModule = modules.find((module) => module.id === moduleId)!;
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
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const identity = workspaceIdentity(brandProfile);
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
    Promise.all([
      request<Product[]>("/api/products"),
      manufacturersApi.list(),
      quoteRequestsApi.list(),
      request<{ profile: BrandProfile | null }>("/api/brand-profile").catch(
        () => ({ profile: null }),
      ),
    ])
      .then(([p, manufacturers, requests, { profile }]) => {
        if (live) {
          setProducts(p);
          setManufacturers(manufacturers);
          setQuoteRequests(requests);
          setBrandProfile(profile ?? null);
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
  function saved(p: Product) {
    setProducts((old) =>
      old.some((x) => x.id === p.id)
        ? old.map((x) => (x.id === p.id ? p : x))
        : [p, ...old],
    );
    setCreate(false);
    router.push(`/products/${p.id}`);
  }
  function saveManufacturer(manufacturer: Manufacturer) {
    setManufacturers((old) =>
      old.some((item) => item.id === manufacturer.id)
        ? old.map((item) => (item.id === manufacturer.id ? manufacturer : item))
        : [manufacturer, ...old],
    );
  }
  function saveQuoteRequest(request: QuoteRequest) {
    setQuoteRequests((old) => [
      request,
      ...old
        .filter((item) => item.id !== request.id)
        .map((item) =>
          request.status === "chosen" &&
          item.productId === request.productId &&
          item.status === "chosen"
            ? {
                ...item,
                status: "quoted" as const,
                updatedAt: request.updatedAt,
              }
            : item,
        ),
    ]);
  }
  useEffect(() => {
    if (!sidebar) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebar(false);
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [sidebar]);
  const product = products.find((p) => p.id === itemId);
  switch (view.kind) {
    case "shared-brand-book":
      return <SharedBrandBook token={view.token} />;
    case "shared-product":
      return <SharedProduct token={view.token} />;
    case "brand-book-print":
      return <BrandBookPrint />;
    case "product-canvas":
      if (product)
        return (
          <ProductCanvas
            product={product}
            onChange={(p) =>
              setProducts((old) => old.map((x) => (x.id === p.id ? p : x)))
            }
          />
        );
      break;
    case "product-print":
      if (product) return <SharedProduct product={product} />;
      break;
  }
  function renderMainContent() {
    // Module workspaces render before the shell's loading fallback.
    switch (view.kind) {
      case "module-home":
        return (
          <WorkspaceDashboard
            products={products}
            loading={loading}
            failed={!!error}
            onCreate={() => setCreate(true)}
          />
        );
      case "brand-profile":
        return <BrandProfilePage />;
      case "brand-book":
        return <BrandBookPage />;
      case "concept-overview":
        return <ConceptOverview />;
      case "module-page":
        return (
          <section className="module-workspace">
            {activeModule.id === "marketing" && <BrandProfileSummary />}
            <span className="module-eyebrow">{activeModule.label}</span>
            <h2>
              {modulePage === "Overview" ? activeModule.label : modulePage}
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
                <h3>No {modulePage!.toLowerCase()} yet</h3>
                <p>
                  Manage your designs and tech packs while this module is being
                  prepared.
                </p>
                <Link className="btn" href="/products">
                  Open Design &amp; Tech Packs
                </Link>
              </div>
            )}
          </section>
        );
    }
    if (loading) return <div className="empty">Loading your workspace…</div>;
    if (
      error &&
      ["manufacturers-overview", "quote-requests", "quote-comparison"].includes(
        view.kind,
      )
    )
      return (
        <div className="empty" role="alert">
          Sourcing data could not be loaded. Reload the page to try again.
        </div>
      );
    switch (view.kind) {
      case "manufacturers-overview":
        return (
          <ManufacturersOverview
            products={products}
            manufacturers={manufacturers}
            quoteRequests={quoteRequests}
          />
        );
      case "quote-requests":
        return (
          <QuoteRequestsPage
            products={products}
            manufacturers={manufacturers}
            quoteRequests={quoteRequests}
          />
        );
      case "quote-comparison":
        return (
          <QuoteComparisonPage
            key={view.productId || "select-product"}
            productId={view.productId}
            products={products}
            manufacturers={manufacturers}
            quoteRequests={quoteRequests}
            onSave={saveQuoteRequest}
            onChoose={(product) =>
              setProducts((old) =>
                old.map((item) =>
                  item.id === product.id
                    ? { ...item, manufacturerId: product.manufacturerId }
                    : item,
                ),
              )
            }
            onProductSave={(product) =>
              setProducts((old) =>
                old.map((item) => (item.id === product.id ? product : item)),
              )
            }
          />
        );
      case "manufacturers":
        if (error)
          return (
            <div className="empty">Manufacturers could not be loaded.</div>
          );
        return (
          <ManufacturersPage
            manufacturers={manufacturers}
            products={products}
            quoteRequests={quoteRequests}
            onSave={saveManufacturer}
            onDelete={(id) =>
              setManufacturers((old) => old.filter((item) => item.id !== id))
            }
          />
        );
      case "product":
      case "product-canvas":
      case "product-print":
        if (itemId)
          return (
            <div className="empty">
              <h2>Product not found</h2>
              <Link className="btn" href="/products">
                Back to Products
              </Link>
            </div>
          );
        // An empty product id still falls through to the library.
        return (
          <ProductLibrary
            products={products}
            manufacturers={manufacturers}
            onCreate={() => setCreate(true)}
          />
        );
      case "product-library":
        return (
          <ProductLibrary
            products={products}
            manufacturers={manufacturers}
            onCreate={() => setCreate(true)}
          />
        );
      case "settings":
        return <SettingsPage notify={notify} />;
      case "library":
        return (
          <LibraryPage key={view.collection} collection={view.collection} />
        );
      case "not-found":
        return (
          <div className="empty">
            <h2>Page not found</h2>
            <Link href="/">Go to Dashboard</Link>
          </div>
        );
    }
  }
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
                    module.id === "home"
                      ? "/"
                      : module.id === "design"
                        ? "/products"
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
            <span className="avatar">{identity.initials}</span>
            <span>
              {identity.name}
              <small>Your workspace</small>
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
                <span className="nav-label">Main</span>
                <nav className="nav-links" aria-label="Design pages">
                  {nav.slice(0, 2).map(([key, label, Icon]) => (
                    <div key={key}>
                      <Link
                        className={section === key ? "active" : ""}
                        aria-current={section === key ? "page" : undefined}
                        href={`/${key}`}
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
                            className={!itemId ? "active" : ""}
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
                <span className="nav-label">Library</span>
                <nav className="nav-links" aria-label="Library">
                  {nav.slice(2).map(([key, label, Icon]) => (
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
              <div className="profile">
                <span className="avatar">{identity.initials}</span>
                <div>
                  <span>{identity.name}</span>
                  <small className="workspace-caption">
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
          <span className="workspace-save-note">
            <Clock size={13} /> Independent workspace · Saved on this computer
          </span>
          <Link href="/settings" className="workspace-settings-link">
            Workspace settings
          </Link>
        </div>
        {product &&
        (view.kind === "product" ||
          view.kind === "product-canvas" ||
          view.kind === "product-print" ||
          view.kind === "product-library") ? (
          <ProductEditor
            product={product}
            identity={identity}
            manufacturers={manufacturers}
            onManufacturerSave={saveManufacturer}
            quoteRequests={quoteRequests.filter(
              (item) => item.productId === product.id,
            )}
            onQuoteRequestSave={saveQuoteRequest}
            onQuoteRequestDelete={(id) =>
              setQuoteRequests((old) => old.filter((item) => item.id !== id))
            }
            onChange={(p) =>
              setProducts((old) => old.map((x) => (x.id === p.id ? p : x)))
            }
            onToggleSidebar={toggleSecondary}
          />
        ) : (
          <>
            <header className="app-header workspace-header">
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
                {viewOwnsPageHeading(view) ? (
                  <p className="app-header-title">{title}</p>
                ) : (
                  <h1>{title}</h1>
                )}
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
                  New tech pack
                </button>
              )}
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
              {renderMainContent()}
            </main>
          </>
        )}
      </div>
      {create && (
        <ProductForm
          manufacturers={manufacturers}
          onManufacturerSave={saveManufacturer}
          onClose={() => setCreate(false)}
          onSave={saved}
        />
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
function ProductLibrary({
  products,
  manufacturers,
  onCreate,
}: {
  products: Product[];
  manufacturers: Manufacturer[];
  onCreate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [stage, setStage] = useState("");
  const [project, setProject] = useState("");
  const [manufacturerId, setManufacturerId] = useState("");
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
        (!manufacturerId || p.manufacturerId === manufacturerId) &&
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
          aria-label="Filter manufacturer"
          value={manufacturerId}
          onChange={(e) => setManufacturerId(e.target.value)}
        >
          <option value="">All Manufacturers</option>
          {manufacturers.map((manufacturer) => (
            <option key={manufacturer.id} value={manufacturer.id}>
              {manufacturer.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort products"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="updated">Recently updated</option>
          <option value="name">Name A–Z</option>
        </select>
        <button
          className={`btn ${archived ? "selected" : ""}`}
          aria-pressed={archived}
          onClick={() => setArchived(!archived)}
        >
          <Archive size={14} />
          Archived
        </button>
      </div>
      <div className="view-tools">
        <button
          className={`btn ${!grid ? "selected" : ""}`}
          aria-label="List view"
          aria-pressed={!grid}
          onClick={() => setGrid(false)}
        >
          <List size={17} />
        </button>
        <button
          className={`btn ${grid ? "selected" : ""}`}
          aria-label="Grid view"
          aria-pressed={grid}
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
            const [data, libraries, brand, manufacturers, quoteRequests] =
              await Promise.all([
                request("/api/products"),
                request("/api/libraries"),
                request<{ profile: unknown }>("/api/brand-profile"),
                manufacturersApi.list(),
                quoteRequestsApi.list(),
              ]);
            const url = URL.createObjectURL(
              new Blob(
                [
                  JSON.stringify(
                    {
                      products: data,
                      libraries,
                      brandProfile: brand.profile,
                      manufacturers,
                      quoteRequests,
                    },
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
