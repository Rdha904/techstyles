"use client";
import { useState } from "react";
import Link from "next/link";
import { FileText, Search } from "lucide-react";
import type { Manufacturer, Product, QuoteRequest } from "@/lib/types";
import { changedSinceSent } from "@/lib/quote-request-status";
import {
  filterQuoteRequests,
  quoteRequestStatuses,
} from "@/lib/quote-request-list";
import "./sourcing-panel.css";
import "./manufacturer-quotes.css";

export function QuoteRequestsPage({
  products,
  manufacturers,
  quoteRequests,
}: {
  products: Product[];
  manufacturers: Manufacturer[];
  quoteRequests: QuoteRequest[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [manufacturerId, setManufacturerId] = useState("");
  const [productId, setProductId] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const visibleProducts = products.filter(
    (product) => showArchived || !product.archived,
  );
  const activeProductId = visibleProducts.some(
    (product) => product.id === productId,
  )
    ? productId
    : "";
  const filtered = filterQuoteRequests(quoteRequests, products, manufacturers, {
    query,
    status,
    manufacturerId,
    productId: activeProductId,
    showArchived,
  });
  const productById = new Map(products.map((product) => [product.id, product]));
  const manufacturerById = new Map(
    manufacturers.map((manufacturer) => [manufacturer.id, manufacturer]),
  );
  function clearFilters() {
    setQuery("");
    setStatus("");
    setManufacturerId("");
    setProductId("");
    setShowArchived(false);
  }
  return (
    <section className="manufacturer-quotes-page">
      <header className="manufacturer-quotes-heading">
        <h1>Quote Requests</h1>
        <p>
          Track requests across your products. Manage them in the product’s
          Sourcing panel or choose a quote in Quote Comparison.
        </p>
      </header>
      <div className="quote-requests-toolbar">
        <label className="quote-requests-search">
          <Search size={16} />
          <input
            aria-label="Search Quote Requests"
            placeholder="Search products or manufacturers…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select
          aria-label="Filter status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All statuses</option>
          {quoteRequestStatuses.map((value) => (
            <option key={value} value={value}>
              {value[0].toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter manufacturer"
          value={manufacturerId}
          onChange={(event) => setManufacturerId(event.target.value)}
        >
          <option value="">All manufacturers</option>
          {manufacturers.map((manufacturer) => (
            <option key={manufacturer.id} value={manufacturer.id}>
              {manufacturer.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter product"
          value={activeProductId}
          onChange={(event) => setProductId(event.target.value)}
        >
          <option value="">All products</option>
          {visibleProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
              {product.archived ? " (archived)" : ""}
            </option>
          ))}
        </select>
        <label className="quote-requests-archived">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
          />
          Show archived products
        </label>
      </div>
      {!filtered.length ? (
        <div className="manufacturer-quotes-empty">
          <FileText size={36} />
          <h2>
            {quoteRequests.length
              ? "No matching Quote Requests"
              : "No Quote Requests yet"}
          </h2>
          <p>
            {quoteRequests.length
              ? "Try another search, clear your filters or show archived products."
              : "Open a product’s Sourcing panel to add a Quote Request."}
          </p>
          <div className="manufacturer-quotes-actions">
            {!!quoteRequests.length && (
              <button className="btn" onClick={clearFilters}>
                Clear filters
              </button>
            )}
            <Link className="btn" href="/products">
              Open Products
            </Link>
          </div>
        </div>
      ) : (
        <div className="manufacturer-quotes-table-wrap">
          <table className="quote-requests-table">
            <thead>
              <tr>
                {[
                  "Product",
                  "Manufacturer",
                  "Status",
                  "Sent date",
                  "Unit price",
                  "Production lead time",
                  "Tech pack",
                ].map((label) => (
                  <th
                    scope="col"
                    key={label}
                    className={
                      label === "Unit price" || label === "Production lead time"
                        ? "quote-numeric"
                        : undefined
                    }
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((request) => {
                const product = productById.get(request.productId)!;
                return (
                  <tr key={request.id}>
                    <td>
                      <Link
                        className="quote-product-name"
                        href={`/products/${encodeURIComponent(product.id)}#sourcing`}
                      >
                        {product.name}
                      </Link>
                      {product.archived && (
                        <small className="quote-requests-product-note">
                          Archived
                        </small>
                      )}
                    </td>
                    <td>
                      {manufacturerById.get(request.manufacturerId)?.name ||
                        "Unknown manufacturer"}
                    </td>
                    <td>
                      <span
                        className={`sourcing-status sourcing-status-${request.status}`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td>
                      {request.sentAt
                        ? new Date(request.sentAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="quote-numeric">
                      {request.quote?.unitPrice != null
                        ? `${request.quote.unitPrice} ${request.quote.currency}`
                        : "—"}
                    </td>
                    <td className="quote-numeric">
                      {request.quote?.productionLeadTimeDays != null
                        ? `${request.quote.productionLeadTimeDays} days`
                        : "—"}
                    </td>
                    <td>
                      {changedSinceSent(product, request) ? (
                        <span className="sourcing-warning">
                          Tech pack changed since sent
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!!filtered.length && (
        <p className="manufacturer-quotes-note">
          Showing {filtered.length} of {quoteRequests.length} Quote Requests
        </p>
      )}
    </section>
  );
}
