"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Columns3 } from "lucide-react";
import type { Manufacturer, Product, Quote, QuoteRequest } from "@/lib/types";
import { quoteRequestsApi, request } from "@/lib/client-api";
import {
  comparisonProducts,
  comparisonRequests,
  rankQuotes,
} from "@/lib/quote-comparison";
import "./sourcing-panel.css";
import "./manufacturer-quotes.css";

const fields: {
  label: string;
  value: (quote: Quote) => ReactNode;
  rank?: "price" | "lead";
  numeric?: boolean;
}[] = [
  {
    label: "Unit price",
    numeric: true,
    value: (quote) =>
      quote.unitPrice != null ? `${quote.unitPrice} ${quote.currency}` : "—",
    rank: "price",
  },
  { label: "MOQ", numeric: true, value: (quote) => quote.moq ?? "—" },
  {
    label: "Production lead time",
    numeric: true,
    value: (quote) =>
      quote.productionLeadTimeDays != null
        ? `${quote.productionLeadTimeDays} days`
        : "—",
    rank: "lead",
  },
  {
    label: "Sample cost",
    numeric: true,
    value: (quote) =>
      quote.sampleCost != null ? `${quote.sampleCost} ${quote.currency}` : "—",
  },
  {
    label: "Sample lead time",
    numeric: true,
    value: (quote) =>
      quote.sampleLeadTimeDays != null
        ? `${quote.sampleLeadTimeDays} days`
        : "—",
  },
  {
    label: "Received date",
    numeric: true,
    value: (quote) =>
      quote.receivedAt
        ? new Date(`${quote.receivedAt}T00:00:00`).toLocaleDateString()
        : "—",
  },
  { label: "Notes", value: (quote) => quote.notes || "—" },
  {
    label: "Attachment",
    value: (quote) =>
      quote.attachment ? (
        <a href={quote.attachment.url} target="_blank" rel="noreferrer">
          {quote.attachment.name}
        </a>
      ) : (
        "—"
      ),
  },
];

export function QuoteComparisonPage({
  products,
  manufacturers,
  quoteRequests,
  productId,
  onSave,
  onChoose,
  onProductSave,
}: {
  products: Product[];
  manufacturers: Manufacturer[];
  quoteRequests: QuoteRequest[];
  productId?: string;
  onSave: (request: QuoteRequest) => void;
  onChoose: (product: Pick<Product, "id" | "manufacturerId">) => void;
  onProductSave: (product: Product) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [suggestSampling, setSuggestSampling] = useState(false);
  const eligibleProducts = comparisonProducts(products, quoteRequests);
  const product = eligibleProducts.find((product) => product.id === productId);
  const quotes = product ? comparisonRequests(quoteRequests, product.id) : [];
  const ranking = rankQuotes(quotes);
  const manufacturerById = new Map(
    manufacturers.map((manufacturer) => [manufacturer.id, manufacturer]),
  );
  async function run(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function action(quoteRequest: QuoteRequest, action: "choose" | "unchoose") {
    return run(async () => {
      const result = await quoteRequestsApi.update(quoteRequest.id, { action });
      onSave(result.request);
      if (action === "choose") onChoose(result.product);
      setSuggestSampling(action === "choose");
    });
  }
  return (
    <section className="manufacturer-quotes-page">
      <header className="manufacturer-quotes-heading">
        <h1>Quote Comparison</h1>
        <p>
          Compare quotes side by side and choose a manufacturer for your
          product.
        </p>
      </header>
      <label className="quote-comparison-selector">
        Product
        <select
          value={product?.id || ""}
          disabled={busy}
          onChange={(event) =>
            router.push(
              `/modules/manufacturers/quote-comparison${event.target.value ? `/${encodeURIComponent(event.target.value)}` : ""}`,
            )
          }
        >
          <option value="">Choose a product</option>
          {eligibleProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
              {product.archived ? " (archived)" : ""}
            </option>
          ))}
        </select>
      </label>
      <p className="manufacturer-quotes-note">
        Products with quotes are listed. Archived products appear only while
        they have a chosen request.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {product &&
        suggestSampling &&
        !["Sampling", "Production", "Completed"].includes(product.stage) && (
          <div className="sourcing-suggestion">
            <span>Manufacturer chosen. Move to Sampling?</span>
            <button
              className="btn primary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  onProductSave(
                    await request<Product>(
                      `/api/products/${encodeURIComponent(product.id)}`,
                      { method: "PATCH", json: { stage: "Sampling" } },
                    ),
                  );
                  setSuggestSampling(false);
                })
              }
            >
              Move to Sampling
            </button>
            <button
              className="btn"
              disabled={busy}
              onClick={() => setSuggestSampling(false)}
            >
              Dismiss
            </button>
          </div>
        )}
      {!product ? (
        <div className="manufacturer-quotes-empty">
          <Columns3 size={36} />
          <h2>
            {productId
              ? "Product unavailable for comparison"
              : eligibleProducts.length
                ? "Choose a product to compare quotes"
                : "No quotes to compare yet"}
          </h2>
          <p>
            {productId
              ? "Choose another product. This product may be archived without a chosen request, or have no quotes to compare."
              : "Record quotes in a product’s Sourcing panel, then compare them here."}
          </p>
          <Link className="btn" href="/products">
            Open Products
          </Link>
        </div>
      ) : (
        <>
          <div className="quote-comparison-product">
            <h2>{product.name}</h2>
            <Link href={`/products/${encodeURIComponent(product.id)}#sourcing`}>
              Open Sourcing
            </Link>
          </div>
          {quotes.length < 2 && (
            <p className="quote-comparison-notice">
              Comparison needs at least two quotes. Add another quote in the
              product’s Sourcing panel.
            </p>
          )}
          {ranking.mixedCurrencies && (
            <p className="quote-comparison-notice" role="status">
              These quotes use different currencies. Unit prices are not ranked;
              production lead times are still compared.
            </p>
          )}
          {!quotes.length ? (
            <div className="manufacturer-quotes-empty">
              <h2>No quoted or chosen requests</h2>
              <p>
                Declined requests are excluded. Record or reopen a quote in the
                product’s Sourcing panel to compare it.
              </p>
            </div>
          ) : (
            <div className="manufacturer-quotes-table-wrap">
              <table
                className="quote-comparison-table"
                style={{ minWidth: 180 + quotes.length * 250 }}
              >
                <thead>
                  <tr>
                    <th scope="col">Manufacturer</th>
                    {quotes.map((quoteRequest) => (
                      <th scope="col" key={quoteRequest.id}>
                        {manufacturerById.get(quoteRequest.manufacturerId)
                          ?.name || "Unknown manufacturer"}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Status</th>
                    {quotes.map((quoteRequest) => (
                      <td key={quoteRequest.id}>
                        <span
                          className={`sourcing-status sourcing-status-${quoteRequest.status}`}
                        >
                          {quoteRequest.status}
                        </span>
                      </td>
                    ))}
                  </tr>
                  {fields.map((field) => (
                    <tr key={field.label}>
                      <th scope="row">{field.label}</th>
                      {quotes.map((quoteRequest) => {
                        const best =
                          field.rank === "price"
                            ? ranking.lowestPriceIds.includes(quoteRequest.id)
                            : field.rank === "lead" &&
                              ranking.shortestLeadTimeIds.includes(
                                quoteRequest.id,
                              );
                        return (
                          <td
                            key={quoteRequest.id}
                            className={`${field.numeric ? "quote-numeric" : ""}${best ? " quote-comparison-best" : ""}`}
                          >
                            {field.value(quoteRequest.quote!)}
                            {best && (
                              <small>
                                {field.rank === "price"
                                  ? "Lowest price"
                                  : "Shortest lead time"}
                              </small>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row">Choose manufacturer</th>
                    {quotes.map((quoteRequest) => (
                      <td key={quoteRequest.id}>
                        <button
                          className={`btn ${quoteRequest.status === "chosen" ? "selected" : ""}`}
                          aria-pressed={quoteRequest.status === "chosen"}
                          disabled={busy}
                          aria-label={`Choose ${manufacturerById.get(quoteRequest.manufacturerId)?.name || "manufacturer"}`}
                          onClick={() =>
                            action(
                              quoteRequest,
                              quoteRequest.status === "chosen"
                                ? "unchoose"
                                : "choose",
                            )
                          }
                        >
                          {quoteRequest.status === "chosen"
                            ? "Chosen"
                            : "Choose"}
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
