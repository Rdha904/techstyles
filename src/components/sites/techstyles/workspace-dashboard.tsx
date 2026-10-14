"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  FolderKanban,
  Shirt,
  Share2,
  Factory,
  Lightbulb,
  Pencil,
  ClipboardCheck,
  Layers,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Megaphone,
  Package,
  CircleCheck,
} from "lucide-react";
import type { Product } from "@/lib/types";
import { dashboardSummary } from "@/lib/dashboard";
import { BrandProfileSummary } from "./brand-profile";
import "./workspace-dashboard.css";

const areas = [
  {
    name: "Concept & Audience",
    href: "/modules/concept/overview",
    icon: Lightbulb,
    text: "Build your brand foundation",
    ready: true,
  },
  {
    name: "Design & Tech Packs",
    href: "/products",
    icon: Pencil,
    text: "Develop your products and collections",
    ready: true,
  },
  {
    name: "Manufacturers & Quotes",
    href: "/modules/manufacturers/overview",
    icon: Factory,
    text: "Plan your sourcing workflow",
    ready: true,
  },
  {
    name: "Samples & Approvals",
    href: "/modules/samples/overview",
    icon: ClipboardCheck,
    text: "Plan sampling and reviews",
  },
  {
    name: "Production",
    href: "/modules/production/overview",
    icon: Layers,
    text: "Plan your production workflow",
  },
  {
    name: "Quality & Inventory",
    href: "/modules/quality/overview",
    icon: ShieldCheck,
    text: "Plan quality checks and stock",
  },
  {
    name: "Store & Sales",
    href: "/modules/store/overview",
    icon: ShoppingBag,
    text: "Plan your sales channels",
  },
  {
    name: "Shipping & Feedback",
    href: "/modules/shipping/overview",
    icon: Truck,
    text: "Plan delivery and customer feedback",
  },
  {
    name: "Marketing",
    href: "/modules/marketing/overview",
    icon: Megaphone,
    text: "Access your brand profile and planned tools",
  },
];

export function WorkspaceDashboard({
  products,
  loading,
  failed,
}: {
  products: Product[];
  loading: boolean;
  failed: boolean;
}) {
  const summary = dashboardSummary(products);
  const recent = summary.recentActivity
    .slice(0, 4)
    .map(({ id }) => products.find((product) => product.id === id)!);
  const stats = [
    {
      name: "Active products",
      value: summary.activeProducts,
      icon: Shirt,
      href: "/products",
    },
    {
      name: "Collections",
      value: summary.collections,
      icon: FolderKanban,
      href: "/projects",
    },
    {
      name: "Products with a manufacturer",
      value: summary.productsWithManufacturer,
      icon: Factory,
      href: "/products",
    },
    {
      name: "Shared tech packs",
      value: summary.sharedTechPacks,
      icon: Share2,
      href: "/products",
    },
    {
      name: "Products in development",
      value: summary.productsInDevelopment,
      icon: Package,
      href: "/products",
    },
    {
      name: "Products in production",
      value: summary.productsInProduction,
      icon: CircleCheck,
      href: "/products",
    },
  ];
  return (
    <section className="workspace-dashboard">
      <header className="workspace-dashboard-intro">
        <div>
          <span className="module-eyebrow">YOUR WORKSPACE AT A GLANCE</span>
          <h2>From brand idea to finished product</h2>
          <p>
            Your brand foundation, product progress and workspaces in one place.
          </p>
        </div>
        <Link className="btn primary" href="/products">
          Open products <ArrowUpRight size={16} />
        </Link>
      </header>
      <div className="workspace-stat-grid">
        {stats.map((stat) => (
          <Link href={stat.href} key={stat.name} className="workspace-stat">
            <stat.icon size={20} />
            <strong>{failed ? "—" : loading ? "…" : stat.value}</strong>
            <span>{stat.name}</span>
          </Link>
        ))}
      </div>
      <p className="workspace-stat-note">
        {failed
          ? "Product data could not be loaded. Reload the page to try again."
          : "Based on non-archived products in this workspace."}
      </p>
      <BrandProfileSummary />
      <section className="workspace-recent">
        <header>
          <div>
            <h3>Continue working</h3>
            <p>Your most recently updated products.</p>
          </div>
          <Link href="/products">
            View all products <ArrowUpRight size={15} />
          </Link>
        </header>
        {loading ? (
          <p role="status">Loading products…</p>
        ) : failed ? (
          <p>Recent products are unavailable.</p>
        ) : recent.length ? (
          <div className="workspace-recent-grid">
            {recent.map((product) => (
              <Link
                href={`/products/${product.id}`}
                key={product.id}
                className="workspace-recent-product"
              >
                <span className="workspace-product-image">
                  {product.cover ? (
                    <img src={product.cover} alt="" />
                  ) : (
                    <Shirt size={25} />
                  )}
                </span>
                <span>
                  <strong>{product.name}</strong>
                  <small>
                    {product.project || "No collection"} · {product.stage}
                  </small>
                </span>
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="workspace-empty">
            <Shirt size={25} />
            <p>
              No products yet. Start your first tech pack in Design &amp; Tech
              Packs.
            </p>
            <Link className="btn" href="/products">
              Start a product <ArrowUpRight size={15} />
            </Link>
          </div>
        )}
      </section>
      <section className="workspace-recent">
        <header>
          <h3>Recent activity</h3>
        </header>
        {loading ? (
          <p role="status">Loading activity…</p>
        ) : failed ? (
          <p>Recent activity is unavailable.</p>
        ) : summary.recentActivity.length ? (
          <ul className="workspace-activity-list">
            {summary.recentActivity.map((product) => (
              <li key={product.id}>
                <Link href={`/products/${product.id}`}>{product.name}</Link>
                <time dateTime={product.updatedAt}>
                  {new Date(product.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p>No product updates yet.</p>
        )}
      </section>
      <section className="workspace-areas">
        <h3>Explore your workspace</h3>
        <p>Choose the next area of your brand to work on.</p>
        <div className="workspace-area-grid">
          {areas.map((area) => (
            <Link key={area.name} href={area.href} className="workspace-area">
              <area.icon size={22} />
              <div>
                <strong>{area.name}</strong>
                <p>{area.text}</p>
                {!area.ready && <small>Tools in development</small>}
              </div>
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
