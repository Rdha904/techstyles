export const navRoutes = [
  ["products", "Products"],
  ["projects", "Projects"],
  ["sketches", "Sketch Library"],
  ["materials", "Materials"],
  ["artworks", "Artworks"],
  ["colors", "Colorways"],
  ["size-charts", "Size Charts"],
  ["attachments", "Attachments Library"],
] as const;
export const moduleRoutes = [
  {
    id: "home",
    label: "Dashboard",
    pages: ["Overview"],
  },
  {
    id: "concept",
    label: "Concept & Audience",
    pages: [
      "Overview",
      "Brand Profile",
      "Audience & Market",
      "Moodboards",
      "Brand Book",
    ],
  },
  { id: "design", label: "Design & Tech Packs", pages: [] },
  {
    id: "manufacturers",
    label: "Manufacturers & Quotes",
    pages: ["Overview", "Manufacturers", "Quote Requests", "Quote Comparison"],
  },
  {
    id: "samples",
    label: "Samples & Approvals",
    pages: ["Overview", "Sample Requests", "Sample Reviews", "Approvals"],
  },
  {
    id: "production",
    label: "Production",
    pages: ["Overview", "Production Orders", "Timeline", "Milestones"],
  },
  {
    id: "quality",
    label: "Quality & Inventory",
    pages: ["Overview", "Quality Checks", "Inventory", "Stock Movements"],
  },
  {
    id: "store",
    label: "Store & Sales",
    pages: [
      "Overview",
      "Product Listings",
      "Orders",
      "Sales Analytics",
      "Brand Website",
    ],
  },
  {
    id: "shipping",
    label: "Shipping & Feedback",
    pages: ["Overview", "Shipments", "Returns", "Customer Feedback"],
  },
  {
    id: "marketing",
    label: "Marketing",
    pages: [
      "Overview",
      "Brand Profile",
      "Campaigns",
      "Content Calendar",
      "Assets",
    ],
  },
];
export function pageSlug(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type WorkspaceView =
  | { kind: "shared-brand-book"; token: string }
  | { kind: "shared-product"; token: string }
  | { kind: "brand-book-print" }
  | { kind: "product-canvas"; productId: string }
  | { kind: "product-print"; productId: string }
  | { kind: "product"; productId: string }
  | { kind: "module-home" }
  | { kind: "brand-profile" }
  | { kind: "brand-book" }
  | { kind: "manufacturers" }
  | { kind: "manufacturers-overview" }
  | { kind: "quote-requests" }
  | { kind: "quote-comparison"; productId?: string }
  | { kind: "concept-overview" }
  | { kind: "module-page" }
  | { kind: "product-library" }
  | { kind: "settings" }
  | { kind: "library"; collection: string }
  | { kind: "not-found" };

export function viewOwnsPageHeading(view: WorkspaceView): boolean {
  return [
    "settings",
    "library",
    "manufacturers",
    "quote-requests",
    "quote-comparison",
    "brand-book",
  ].includes(view.kind);
}

export function resolveView(path: string[]) {
  const section = path[0] || "dashboard";
  const activeModule =
    moduleRoutes.find(
      (module) =>
        module.id ===
        (section === "modules"
          ? path[1]
          : section === "dashboard"
            ? "home"
            : "design"),
    ) || moduleRoutes.find((module) => module.id === "design")!;
  const modulePage = activeModule.pages.find(
    (page) => pageSlug(page) === (path[2] || "overview"),
  );
  const title =
    activeModule.id === "home"
      ? "Dashboard"
      : section === "modules"
        ? modulePage || "Page not found"
        : navRoutes.find((entry) => entry[0] === section)?.[1] || "Settings";

  function routeView(): WorkspaceView {
    if (section === "share" && path[1] === "brand-book")
      return { kind: "shared-brand-book", token: path[2] || "" };
    if (section === "share")
      return { kind: "shared-product", token: path[1] || "" };
    if (
      section === "modules" &&
      path[1] === "concept" &&
      path[2] === "brand-book" &&
      path[3] === "print"
    )
      return { kind: "brand-book-print" };
    if (section === "products" && path[2] === "canvas")
      return { kind: "product-canvas", productId: path[1] };
    if (section === "products" && path[2] === "print")
      return { kind: "product-print", productId: path[1] };
    if (section === "modules") {
      if (activeModule.id === "home") return { kind: "module-home" };
      if (activeModule.id === "concept") {
        if (modulePage === "Brand Profile") return { kind: "brand-profile" };
        if (modulePage === "Brand Book") return { kind: "brand-book" };
        if (modulePage === "Overview") return { kind: "concept-overview" };
      }
      if (activeModule.id === "manufacturers") {
        if (modulePage === "Overview" && path.length <= 3)
          return { kind: "manufacturers-overview" };
        if (modulePage === "Manufacturers" && path.length === 3)
          return { kind: "manufacturers" };
        if (modulePage === "Quote Requests" && path.length === 3)
          return { kind: "quote-requests" };
        if (modulePage === "Quote Comparison") {
          if (path.length === 3) return { kind: "quote-comparison" };
          if (path.length === 4 && path[3])
            return { kind: "quote-comparison", productId: path[3] };
        }
      }
      if (modulePage) return { kind: "module-page" };
    }
    if (section === "products" && path[1])
      return { kind: "product", productId: path[1] };
    if (section === "dashboard") return { kind: "module-home" };
    if (section === "products") return { kind: "product-library" };
    if (section === "settings") return { kind: "settings" };
    if (navRoutes.some((entry) => entry[0] === section))
      return { kind: "library", collection: section };
    return { kind: "not-found" };
  }

  return {
    section,
    moduleId: activeModule.id,
    modulePage,
    title,
    itemId: path[1],
    view: routeView(),
  };
}
