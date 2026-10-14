"use client";
import { useState, type FormEvent } from "react";
import {
  Factory,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Manufacturer, Product, QuoteRequest } from "@/lib/types";
import { manufacturersApi } from "@/lib/client-api";
import {
  manufacturerFilterOptions,
  manufacturerMatches,
  parseManufacturerCategories,
  productsUsingManufacturer,
} from "@/lib/manufacturer-directory";
import { Modal } from "./ui";
import "./manufacturers.css";

export function ManufacturersPage({
  manufacturers,
  products,
  quoteRequests = [],
  onSave,
  onDelete,
}: {
  manufacturers: Manufacturer[];
  products: Product[];
  quoteRequests?: QuoteRequest[];
  onSave: (manufacturer: Manufacturer) => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [grid, setGrid] = useState(false);
  const [editing, setEditing] = useState<Manufacturer | "new" | null>(null);
  const [deleting, setDeleting] = useState<Manufacturer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const options = manufacturerFilterOptions(manufacturers);
  const activeCountry =
    options.countries.find(
      (value) => value.toLowerCase() === country.toLowerCase(),
    ) || "";
  const activeCategory =
    options.categories.find(
      (value) => value.toLowerCase() === category.toLowerCase(),
    ) || "";
  const filtered = manufacturers.filter((item) =>
    manufacturerMatches(item, {
      query,
      country: activeCountry,
      category: activeCategory,
    }),
  );
  const using = deleting
    ? productsUsingManufacturer(products, deleting.id)
    : [];

  const requestCount = deleting
    ? quoteRequests.filter((item) => item.manufacturerId === deleting.id).length
    : 0;

  function edit(manufacturer: Manufacturer | "new") {
    setError("");
    setEditing(manufacturer);
  }
  function confirmDelete(manufacturer: Manufacturer) {
    setError("");
    setDeleting(manufacturer);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !editing) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const data = {
      name: String(fields.name),
      contactName: String(fields.contactName),
      email: String(fields.email),
      phone: String(fields.phone),
      location: { country: String(fields.country), city: String(fields.city) },
      categories: parseManufacturerCategories(String(fields.categories)),
      typicalMoq: String(fields.typicalMoq),
      notes: String(fields.notes),
    };
    setBusy(true);
    setError("");
    try {
      const manufacturer =
        editing === "new"
          ? await manufacturersApi.create(data)
          : await manufacturersApi.update(editing.id, data);
      onSave(manufacturer);
      setNotice(
        editing === "new" ? "Manufacturer added." : "Manufacturer updated.",
      );
      setEditing(null);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (busy || !deleting || using.length || requestCount) return;
    setBusy(true);
    setError("");
    try {
      await manufacturersApi.delete(deleting.id);
      onDelete(deleting.id);
      setNotice("Manufacturer deleted.");
      setDeleting(null);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function actions(manufacturer: Manufacturer) {
    return (
      <div className="manufacturer-actions">
        <button
          className="icon-button"
          aria-label={`Edit ${manufacturer.name}`}
          onClick={() => edit(manufacturer)}
        >
          <Pencil size={15} />
        </button>
        <button
          className="icon-button"
          aria-label={`Delete ${manufacturer.name}`}
          onClick={() => confirmDelete(manufacturer)}
        >
          <Trash2 size={15} />
        </button>
      </div>
    );
  }
  const draft = editing && editing !== "new" ? editing : null;
  return (
    <div className="manufacturers-page">
      <header className="manufacturers-heading">
        <div>
          <h1>Manufacturers</h1>
          <p>
            Keep garment manufacturers and their contact details in one place.
          </p>
        </div>
        <button className="btn primary" onClick={() => edit("new")}>
          <Plus size={16} /> Add manufacturer
        </button>
      </header>
      {notice && (
        <div className="manufacturers-notice" role="status">
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="manufacturers-toolbar">
        <label className="manufacturers-search">
          <Search size={16} />
          <input
            aria-label="Search manufacturers"
            placeholder="Search manufacturers…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select
          aria-label="Filter country"
          value={activeCountry}
          onChange={(event) => setCountry(event.target.value)}
        >
          <option value="">All countries</option>
          {options.countries.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          aria-label="Filter category"
          value={activeCategory}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">All categories</option>
          {options.categories.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <div className="manufacturers-view">
          <button
            aria-label="List view"
            aria-pressed={!grid}
            onClick={() => setGrid(false)}
          >
            <List size={17} />
          </button>
          <button
            aria-label="Grid view"
            aria-pressed={grid}
            onClick={() => setGrid(true)}
          >
            <LayoutGrid size={17} />
          </button>
        </div>
      </div>
      {!filtered.length ? (
        <div className="manufacturers-empty">
          <Factory size={36} />
          <h2>
            {manufacturers.length
              ? "No manufacturers found"
              : "No manufacturers yet"}
          </h2>
          <p>
            {manufacturers.length
              ? "Try a different search or clear your filters."
              : "Add a garment manufacturer to start building your directory."}
          </p>
          {manufacturers.length ? (
            <button
              className="btn"
              onClick={() => {
                setQuery("");
                setCountry("");
                setCategory("");
              }}
            >
              Clear filters
            </button>
          ) : (
            <button className="btn primary" onClick={() => edit("new")}>
              <Plus size={16} /> Add manufacturer
            </button>
          )}
        </div>
      ) : grid ? (
        <div className="manufacturers-grid">
          {filtered.map((manufacturer) => (
            <article className="manufacturer-card" key={manufacturer.id}>
              <header>
                <button
                  className="manufacturer-name"
                  onClick={() => edit(manufacturer)}
                >
                  {manufacturer.name}
                </button>
                {actions(manufacturer)}
              </header>
              <p>
                {[manufacturer.location.city, manufacturer.location.country]
                  .filter(Boolean)
                  .join(", ") || "No location"}
              </p>
              <dl>
                <div>
                  <dt>Categories</dt>
                  <dd>{manufacturer.categories.join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt>Contact</dt>
                  <dd>
                    {manufacturer.contactName || manufacturer.email || "—"}
                    {manufacturer.contactName && manufacturer.email && (
                      <span>{manufacturer.email}</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Typical MOQ</dt>
                  <dd>{manufacturer.typicalMoq || "—"}</dd>
                </div>
                <div>
                  <dt>Products</dt>
                  <dd>
                    {
                      productsUsingManufacturer(products, manufacturer.id)
                        .length
                    }
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <div className="manufacturers-table-wrap">
          <table className="manufacturers-table">
            <thead>
              <tr>
                {[
                  "Name",
                  "Location",
                  "Categories",
                  "Contact",
                  "Typical MOQ",
                  "Products",
                  "Actions",
                ].map((label) => (
                  <th key={label} scope="col">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((manufacturer) => (
                <tr key={manufacturer.id}>
                  <td>
                    <button
                      className="manufacturer-name"
                      onClick={() => edit(manufacturer)}
                    >
                      {manufacturer.name}
                    </button>
                  </td>
                  <td>
                    {[manufacturer.location.city, manufacturer.location.country]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td>{manufacturer.categories.join(", ") || "—"}</td>
                  <td>
                    {manufacturer.contactName || manufacturer.email || "—"}
                    {manufacturer.contactName && manufacturer.email && (
                      <span>{manufacturer.email}</span>
                    )}
                  </td>
                  <td>{manufacturer.typicalMoq || "—"}</td>
                  <td>
                    {
                      productsUsingManufacturer(products, manufacturer.id)
                        .length
                    }
                  </td>
                  <td>{actions(manufacturer)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!!filtered.length && (
        <p className="manufacturers-count">
          Showing {filtered.length} of {manufacturers.length} manufacturers
        </p>
      )}
      {editing && (
        <Modal
          title={editing === "new" ? "Add manufacturer" : "Edit manufacturer"}
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <form onSubmit={save}>
            <div className="form-grid">
              <label className="full">
                Name *
                <input
                  name="name"
                  required
                  maxLength={200}
                  defaultValue={draft?.name}
                  autoFocus
                />
              </label>
              <label>
                Contact name
                <input
                  name="contactName"
                  maxLength={200}
                  defaultValue={draft?.contactName}
                />
              </label>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  maxLength={320}
                  defaultValue={draft?.email}
                />
              </label>
              <label>
                Phone
                <input
                  name="phone"
                  type="tel"
                  maxLength={100}
                  defaultValue={draft?.phone}
                />
              </label>
              <label>
                Typical MOQ
                <input
                  name="typicalMoq"
                  maxLength={200}
                  defaultValue={draft?.typicalMoq}
                  placeholder="e.g. 100 units"
                />
              </label>
              <label>
                Country
                <input
                  name="country"
                  maxLength={200}
                  defaultValue={draft?.location.country}
                />
              </label>
              <label>
                City
                <input
                  name="city"
                  maxLength={200}
                  defaultValue={draft?.location.city}
                />
              </label>
              <label className="full">
                Categories
                <input
                  name="categories"
                  defaultValue={draft?.categories.join(", ")}
                  placeholder="Hoodies, T-Shirts, Knitwear"
                />
                <small>Separate categories with commas.</small>
              </label>
              <label className="full">
                Notes
                <textarea
                  name="notes"
                  maxLength={20000}
                  defaultValue={draft?.notes}
                  rows={4}
                />
              </label>
            </div>
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
              <button type="submit" className="btn primary" disabled={busy}>
                {busy ? "Saving…" : "Save manufacturer"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="Delete manufacturer"
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <p>Delete “{deleting.name}” from your directory?</p>
          {using.length > 0 && (
            <div className="manufacturer-usage">
              <p>
                This manufacturer cannot be deleted while these products use it:
              </p>
              <ul>
                {using.map((product) => (
                  <li key={product.id}>
                    {product.name}
                    {product.archived ? " (archived)" : ""}
                  </li>
                ))}
              </ul>
              <p>Change their manufacturer before deleting this record.</p>
            </div>
          )}
          {requestCount > 0 && (
            <p className="manufacturer-usage">
              {requestCount} Quote Request{requestCount === 1 ? "" : "s"}{" "}
              {requestCount === 1 ? "uses" : "use"} this manufacturer. Delete
              those Quote Requests before deleting this record.
            </p>
          )}
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
              disabled={busy || using.length > 0 || requestCount > 0}
              onClick={remove}
            >
              {busy ? "Deleting…" : "Delete manufacturer"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
