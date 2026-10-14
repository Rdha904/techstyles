"use client";
import Link from "next/link";
import { ArrowUpRight, Factory, FileText, Columns3 } from "lucide-react";
import type { Manufacturer, Product, QuoteRequest } from "@/lib/types";
import {
  quoteRequestStatuses,
  sourcingOverviewCounts,
} from "@/lib/quote-request-list";
import "./sourcing-panel.css";
import "./manufacturer-quotes.css";

export function ManufacturersOverview({
  manufacturers,
  products,
  quoteRequests,
}: {
  manufacturers: Manufacturer[];
  products: Product[];
  quoteRequests: QuoteRequest[];
}) {
  const counts = sourcingOverviewCounts(products, quoteRequests);
  const cards = [
    {
      title: "Manufacturers",
      slug: "manufacturers",
      icon: Factory,
      tone: "blue",
      description:
        "Build your directory of garment manufacturers and keep contact details close at hand.",
      detail: `${manufacturers.length} manufacturers in your directory`,
    },
    {
      title: "Quote Requests",
      slug: "quote-requests",
      icon: FileText,
      tone: "teal",
      description:
        "Follow requests across your products, from the first draft to a chosen quote.",
      detail: "Record requests and quotes in each product’s Sourcing panel.",
    },
    {
      title: "Quote Comparison",
      slug: "quote-comparison",
      icon: Columns3,
      tone: "violet",
      description:
        "Compare prices, minimum quantities and lead times, then choose a manufacturer for your product.",
      detail: `${counts.chosenProducts} products with a chosen request`,
    },
  ];
  return (
    <section
      className="manufacturer-quotes-page sourcing-overview"
      aria-labelledby="sourcing-overview-title"
    >
      <header className="manufacturer-quotes-heading">
        <span className="module-eyebrow">MANUFACTURERS &amp; QUOTES</span>
        <h2 id="sourcing-overview-title">
          Find the right manufacturer for your products
        </h2>
        <p>Track your sourcing workflow and compare the quotes you receive.</p>
      </header>
      <div className="sourcing-overview-stats">
        {quoteRequestStatuses.map((status) => (
          <div key={status}>
            <span className={`sourcing-status sourcing-status-${status}`}>
              {status}
            </span>
            <strong>{counts.byStatus[status]}</strong>
          </div>
        ))}
        <div>
          <span>Manufacturers</span>
          <strong>{manufacturers.length}</strong>
        </div>
        <div>
          <span>Products with a chosen request</span>
          <strong>{counts.chosenProducts}</strong>
        </div>
      </div>
      <p className="manufacturer-quotes-note">
        Request and product counts exclude archived products.
      </p>
      <div className="sourcing-overview-grid">
        {cards.map((card) => (
          <Link
            key={card.slug}
            href={`/modules/manufacturers/${card.slug}`}
            className={`sourcing-overview-card ${card.tone}`}
          >
            <span className="sourcing-overview-icon">
              <card.icon size={26} strokeWidth={1.7} />
            </span>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            <div className="sourcing-overview-detail">{card.detail}</div>
            <div className="sourcing-overview-action">
              <span>Open {card.title.toLowerCase()}</span>
              <ArrowUpRight size={19} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
