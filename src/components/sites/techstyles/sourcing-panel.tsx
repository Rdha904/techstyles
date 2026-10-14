"use client";
import { useState, type FormEvent } from "react";
import type {
  Manufacturer,
  Product,
  Quote,
  QuoteRequest,
  QuoteRequestAction,
} from "@/lib/types";
import { quoteRequestsApi, uploadFile } from "@/lib/client-api";
import {
  changedSinceSent,
  quoteRequestActions,
} from "@/lib/quote-request-status";
import { ManufacturerPicker } from "./manufacturer-picker";
import { Modal } from "./ui";
import "./sourcing-panel.css";

const actionLabels: Record<QuoteRequestAction, string> = {
  send: "Mark as sent",
  decline: "Decline",
  reopen: "Reopen",
  choose: "Choose",
  unchoose: "Unchoose",
};
const numericFields = [
  ["unitPrice", "Unit price", false, false],
  ["moq", "MOQ", true, true],
  ["productionLeadTimeDays", "Production lead time (days)", true, true],
  ["sampleCost", "Sample cost (same currency)", true, false],
  ["sampleLeadTimeDays", "Sample lead time (days)", true, true],
] as const;

export function SourcingPanel({
  product,
  manufacturers,
  requests,
  onManufacturerSave,
  onSave,
  onDelete,
  onChoose,
  onMoveToSampling,
}: {
  product: Product;
  manufacturers: Manufacturer[];
  requests: QuoteRequest[];
  onManufacturerSave: (manufacturer: Manufacturer) => void;
  onSave: (request: QuoteRequest) => void;
  onDelete: (id: string) => void;
  onChoose: (manufacturerId: string | null) => void;
  onMoveToSampling: () => Promise<void>;
}) {
  const [manufacturerId, setManufacturerId] = useState("");
  const [manufacturerBusy, setManufacturerBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<QuoteRequest | null>(null);
  const [deleting, setDeleting] = useState<QuoteRequest | null>(null);
  const [attachment, setAttachment] = useState<Quote["attachment"]>(null);
  const [suggestSampling, setSuggestSampling] = useState(false);
  const available = manufacturers.filter(
    (item) => !requests.some((request) => request.manufacturerId === item.id),
  );
  const disabled = busy || manufacturerBusy;
  async function run(operation: () => Promise<void>) {
    if (disabled) return;
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
  function action(request: QuoteRequest, action: QuoteRequestAction) {
    return run(async () => {
      const result = await quoteRequestsApi.update(request.id, { action });
      onSave(result.request);
      if (action === "choose") {
        onChoose(result.product.manufacturerId);
        setSuggestSampling(true);
      }
    });
  }
  function openQuote(request: QuoteRequest) {
    setError("");
    setAttachment(request.quote?.attachment ?? null);
    setEditing(request);
  }
  function saveQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const fields = new FormData(event.currentTarget);
    const numbers = Object.fromEntries(
      numericFields.map(([key, , optional]) => [
        key,
        optional && fields.get(key) === "" ? null : Number(fields.get(key)),
      ]),
    );
    void run(async () => {
      const result = await quoteRequestsApi.update(editing.id, {
        quote: {
          ...numbers,
          currency: String(fields.get("currency")),
          receivedAt: String(fields.get("receivedAt")),
          notes: String(fields.get("notes")),
          attachment,
        } as Quote,
      });
      onSave(result.request);
      setEditing(null);
    });
  }
  return (
    <section
      id="sourcing"
      className="sourcing-panel no-print"
      aria-labelledby="sourcing-title"
    >
      <header className="sourcing-heading">
        <div>
          <h2 id="sourcing-title">Sourcing</h2>
          <p>
            Only visible to you · Never shared or included in the PDF or
            versions
          </p>
        </div>
        <span className="sourcing-private">Private</span>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="sourcing-add">
        <ManufacturerPicker
          label="Add manufacturer to request"
          emptyLabel="Choose a manufacturer"
          manufacturers={available}
          value={manufacturerId}
          onChange={setManufacturerId}
          onManufacturerSave={onManufacturerSave}
          onActiveChange={setManufacturerBusy}
          disabled={busy}
        />
        <button
          type="button"
          className="btn primary"
          disabled={disabled || !manufacturerId}
          onClick={() =>
            run(async () => {
              onSave(
                await quoteRequestsApi.create({
                  productId: product.id,
                  manufacturerId,
                }),
              );
              setManufacturerId("");
            })
          }
        >
          Add Quote Request
        </button>
      </div>
      {suggestSampling &&
        !["Sampling", "Production", "Completed"].includes(product.stage) && (
          <div className="sourcing-suggestion">
            <span>Manufacturer chosen. Move to Sampling?</span>
            <button
              className="btn primary"
              disabled={disabled}
              onClick={() =>
                run(async () => {
                  await onMoveToSampling();
                  setSuggestSampling(false);
                })
              }
            >
              Move to Sampling
            </button>
            <button
              className="btn"
              disabled={disabled}
              onClick={() => setSuggestSampling(false)}
            >
              Dismiss
            </button>
          </div>
        )}
      {!requests.length && (
        <p className="muted">
          Add a manufacturer to start collecting quotes for this product.
        </p>
      )}
      <div className="sourcing-requests">
        {requests.map((request) => (
          <article className="sourcing-request" key={request.id}>
            <div className="sourcing-request-heading">
              <h3>
                {manufacturers.find(
                  (item) => item.id === request.manufacturerId,
                )?.name || "Unknown manufacturer"}
              </h3>
              <span
                className={`sourcing-status sourcing-status-${request.status}`}
              >
                {request.status}
              </span>
            </div>
            <p className="muted">
              {request.sentAt
                ? `Sent ${new Date(request.sentAt).toLocaleDateString()}`
                : "Not sent yet"}
            </p>
            {changedSinceSent(product, request) && (
              <p className="sourcing-warning">Tech pack changed since sent</p>
            )}
            {request.quote && (
              <>
                <dl className="sourcing-summary">
                  <div>
                    <dt>Unit price</dt>
                    <dd>
                      {request.quote.unitPrice} {request.quote.currency}
                    </dd>
                  </div>
                  <div>
                    <dt>MOQ</dt>
                    <dd>{request.quote.moq ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Production lead time</dt>
                    <dd>
                      {request.quote.productionLeadTimeDays === null
                        ? "—"
                        : `${request.quote.productionLeadTimeDays} days`}
                    </dd>
                  </div>
                  <div>
                    <dt>Sample cost</dt>
                    <dd>
                      {request.quote.sampleCost === null
                        ? "—"
                        : `${request.quote.sampleCost} ${request.quote.currency}`}
                    </dd>
                  </div>
                  <div>
                    <dt>Sample lead time</dt>
                    <dd>
                      {request.quote.sampleLeadTimeDays === null
                        ? "—"
                        : `${request.quote.sampleLeadTimeDays} days`}
                    </dd>
                  </div>
                  <div>
                    <dt>Received</dt>
                    <dd>{request.quote.receivedAt}</dd>
                  </div>
                </dl>
                {request.quote.notes && (
                  <p className="sourcing-notes">{request.quote.notes}</p>
                )}
                {request.quote.attachment && (
                  <a
                    href={request.quote.attachment.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {request.quote.attachment.name}
                  </a>
                )}
              </>
            )}
            <div className="sourcing-actions">
              {quoteRequestActions[request.status].map((value) => (
                <button
                  key={value}
                  className={`btn${value === "unchoose" ? " selected" : ""}`}
                  aria-pressed={
                    value === "choose" || value === "unchoose"
                      ? request.status === "chosen"
                      : undefined
                  }
                  disabled={disabled}
                  onClick={() => action(request, value)}
                >
                  {actionLabels[value]}
                </button>
              ))}
              {["sent", "quoted", "chosen"].includes(request.status) && (
                <button
                  className="btn"
                  disabled={disabled}
                  onClick={() => openQuote(request)}
                >
                  {request.quote ? "Edit quote" : "Enter quote"}
                </button>
              )}
              <button
                className="btn danger"
                disabled={disabled}
                onClick={() => {
                  setError("");
                  setDeleting(request);
                }}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
      {editing && (
        <Modal
          title={editing.quote ? "Edit quote" : "Enter quote"}
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <form onSubmit={saveQuote}>
            <fieldset className="sourcing-quote-fields" disabled={busy}>
              <div className="form-grid">
                {numericFields.map(([key, label, optional, integer]) => (
                  <label key={key}>
                    {label}
                    {!optional && " *"}
                    <input
                      type="number"
                      name={key}
                      min="0"
                      step={integer ? "1" : "any"}
                      required={!optional}
                      defaultValue={editing.quote?.[key] ?? ""}
                    />
                  </label>
                ))}
                <label>
                  Currency *
                  <input
                    name="currency"
                    required
                    pattern="[A-Z]{3}"
                    minLength={3}
                    maxLength={3}
                    defaultValue={editing.quote?.currency ?? "EUR"}
                  />
                </label>
                <label>
                  Date received *
                  <input
                    name="receivedAt"
                    type="date"
                    required
                    defaultValue={
                      editing.quote?.receivedAt ??
                      new Date().toISOString().slice(0, 10)
                    }
                  />
                </label>
                <label className="full">
                  Notes
                  <textarea
                    name="notes"
                    maxLength={20000}
                    defaultValue={editing.quote?.notes ?? ""}
                  />
                </label>
                <label className="full">
                  Attachment (PDF or image)
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file)
                        void run(async () => {
                          setAttachment({
                            name: file.name,
                            url: await uploadFile(file),
                          });
                        });
                      event.target.value = "";
                    }}
                  />
                </label>
                {attachment && (
                  <div className="full sourcing-actions">
                    <a href={attachment.url} target="_blank" rel="noreferrer">
                      {attachment.name}
                    </a>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setAttachment(null)}
                    >
                      Remove attachment
                    </button>
                  </div>
                )}
              </div>
            </fieldset>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-footer">
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="btn primary" disabled={busy}>
                {busy ? "Saving…" : "Save quote"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="Delete Quote Request"
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <p>
            Delete this Quote Request and its quote? The product&apos;s
            manufacturer will stay unchanged.
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-footer">
            <button
              className="btn"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </button>
            <button
              className="btn danger"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await quoteRequestsApi.delete(deleting.id);
                  onDelete(deleting.id);
                  setDeleting(null);
                })
              }
            >
              {busy ? "Deleting…" : "Delete Quote Request"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
