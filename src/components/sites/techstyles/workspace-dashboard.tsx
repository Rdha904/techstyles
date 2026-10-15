"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Shirt,
  Factory,
  Lightbulb,
  Pencil,
  ClipboardCheck,
  Layers,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Megaphone,
  Plus,
} from "lucide-react";
import type { Product } from "@/lib/types";
import { dashboardHeroImages, dashboardSummary } from "@/lib/dashboard";
import { BrandProfileSummary } from "./brand-profile";
import { ProductImage } from "./product-image";
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
  onCreate,
}: {
  products: Product[];
  loading: boolean;
  failed: boolean;
  onCreate: () => void;
}) {
  const summary = dashboardSummary(products);
  const activity = summary.recentActivity.map(({ id }) =>
    products.find((product) => product.id === id)!,
  );
  const recent = activity.slice(0, 4);
  const heroImages = dashboardHeroImages(products);
  const hasCollage = heroImages.length >= 3;
  const stats = [
    {
      name: "Active products",
      value: summary.activeProducts,
      href: "/products",
    },
    {
      name: "Collections",
      value: summary.collections,
      href: "/projects",
    },
    {
      name: "Products with a manufacturer",
      value: summary.productsWithManufacturer,
      href: "/products",
    },
    {
      name: "Shared tech packs",
      value: summary.sharedTechPacks,
      href: "/products",
    },
    {
      name: "Products in development",
      value: summary.productsInDevelopment,
      href: "/products",
    },
    {
      name: "Products in production",
      value: summary.productsInProduction,
      href: "/products",
    },
  ];
  return (
    <div className="workspace-dashboard">
      <section className={`workspace-hero ${hasCollage ? "with-collage" : ""}`}>
        {hasCollage && (
          <div className="workspace-collage" aria-hidden="true">
            {heroImages.map((image, index) => (
              <figure
                className={`workspace-collage-${index + 1}`}
                key={`${index}-${image}`}
              >
                <img src={image} alt="" />
              </figure>
            ))}
          </div>
        )}
        <div className="workspace-hero-content">
          <h1>From brand idea to finished product</h1>
          <p>
            Your brand foundation, product progress and workspaces in one place.
          </p>
          <div className="workspace-hero-actions">
            {summary.activeProducts > 0 && (
              <Link className="btn primary" href="/products">
                Open products <ArrowUpRight size={16} />
              </Link>
            )}
            <button
              className={`btn ${summary.activeProducts ? "" : "primary"}`}
              onClick={onCreate}
            >
              <Plus size={16} /> New tech pack
            </button>
          </div>
        </div>
      </section>
      <section className="workspace-counts" aria-label="Workspace counts">
        <div className="workspace-stat-grid">
          {stats.map((stat) => (
            <Link href={stat.href} key={stat.name} className="workspace-stat">
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
      </section>
      <section aria-labelledby="workspace-continue-heading">
        <header className="workspace-section-heading">
          <div>
            <h2 id="workspace-continue-heading">Continue working</h2>
            <p>Your most recently updated products.</p>
          </div>
          <Link className="workspace-section-link" href="/products">
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
                <span className="workspace-product-tile">
                  <ProductImage product={product} size="tile" />
                  <span className="workspace-product-stage">
                    {product.stage}
                  </span>
                </span>
                <span>
                  <h3>{product.name}</h3>
                  <span className="workspace-product-meta">
                    <span>{product.project.trim() || "No collection"}</span>
                    <span>{product.code}</span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="workspace-empty">
            <Shirt size={40} aria-hidden="true" />
            <h3>Start your first tech pack</h3>
            <p>
              Bring your first product to life with its design, materials and
              measurements in one place.
            </p>
            <button className="btn" onClick={onCreate}>
              <Plus size={16} /> New tech pack
            </button>
          </div>
        )}
      </section>
      <div className="workspace-brand-activity">
        <section aria-labelledby="workspace-brand-heading">
          <header className="workspace-section-heading">
            <h2 id="workspace-brand-heading">Brand Profile</h2>
          </header>
          <BrandProfileSummary />
        </section>
        <section aria-labelledby="workspace-activity-heading">
          <header className="workspace-section-heading">
            <h2 id="workspace-activity-heading">Recent activity</h2>
          </header>
          {loading ? (
            <p role="status">Loading activity…</p>
          ) : failed ? (
            <p>Recent activity is unavailable.</p>
          ) : activity.length ? (
            <ul className="workspace-activity-list">
              {activity.map((product) => (
                <li key={product.id}>
                  <Link href={`/products/${product.id}`}>
                    <ProductImage product={product} size="thumb" />
                    <span>
                      <strong>{product.name}</strong>
                      <span className="workspace-activity-what">Updated</span>
                    </span>
                    <time dateTime={product.updatedAt}>
                      {new Date(product.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No product updates yet.</p>
          )}
        </section>
      </div>
      <section aria-labelledby="workspace-areas-heading">
        <header className="workspace-section-heading">
          <div>
            <h2 id="workspace-areas-heading">Explore your workspace</h2>
            <p>Choose the next area of your brand to work on.</p>
          </div>
        </header>
        <div className="workspace-area-grid">
          {areas.map((area) => (
            <Link key={area.name} href={area.href} className="workspace-area">
              <span className="workspace-area-icon">
                <area.icon size={17} />
              </span>
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
    </div>
  );
}
