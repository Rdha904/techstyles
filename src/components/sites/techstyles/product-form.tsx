"use client";
import { useState, type FormEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Product, Manufacturer } from "@/lib/types";
import { request, manufacturersApi } from "@/lib/client-api";
import { Modal } from "./ui";
import "./product-form.css";

export function ProductForm({
  product,
  manufacturers,
  onManufacturerSave,
  onClose,
  onSave,
}: {
  product?: Product;
  manufacturers: Manufacturer[];
  onManufacturerSave: (manufacturer: Manufacturer) => void;
  onClose: () => void;
  onSave: (p: Product) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [manufacturerId, setManufacturerId] = useState(
    product?.manufacturerId || "",
  );
  const [creatingManufacturer, setCreatingManufacturer] = useState(false);
  const [manufacturerName, setManufacturerName] = useState("");
  const [manufacturerError, setManufacturerError] = useState("");
  const [manufacturerBusy, setManufacturerBusy] = useState(false);
  function cancelManufacturer() {
    setCreatingManufacturer(false);
    setManufacturerName("");
    setManufacturerError("");
  }
  async function addManufacturer() {
    if (manufacturerBusy) return;
    const name = manufacturerName.trim();
    if (!name) {
      setManufacturerError("Manufacturer name is required");
      return;
    }
    setManufacturerBusy(true);
    setManufacturerError("");
    try {
      const manufacturer = await manufacturersApi.create({ name });
      onManufacturerSave(manufacturer);
      setManufacturerId(manufacturer.id);
      cancelManufacturer();
    } catch (error) {
      setManufacturerError((error as Error).message);
    } finally {
      setManufacturerBusy(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || creatingManufacturer || manufacturerBusy) return;
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (!String(data.code || "").trim())
      data.code = `${String(data.category).slice(0, 3).toUpperCase()}-${String(data.name).slice(0, 3).toUpperCase()}-${crypto.randomUUID().slice(0, 3).toUpperCase()}`;
    try {
      const p = await request<Product>(
        product ? `/api/products/${product.id}` : "/api/products",
        {
          method: product ? "PATCH" : "POST",
          json: { ...data, manufacturerId: manufacturerId || null },
        },
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
      onClose={() => {
        if (!manufacturerBusy) onClose();
      }}
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
            Manufacturer
            <select
              name="manufacturerId"
              value={creatingManufacturer ? "__new__" : manufacturerId}
              disabled={busy || manufacturerBusy}
              onChange={(event) => {
                if (event.target.value === "__new__") {
                  setCreatingManufacturer(true);
                  setManufacturerError("");
                } else {
                  setManufacturerId(event.target.value);
                  cancelManufacturer();
                }
              }}
            >
              <option value="">None</option>
              {manufacturers.map((manufacturer) => (
                <option key={manufacturer.id} value={manufacturer.id}>
                  {manufacturer.name}
                </option>
              ))}
              <option value="__new__">+ New manufacturer…</option>
            </select>
          </label>
          {creatingManufacturer && (
            <div className="inline-manufacturer full">
              <label>
                New manufacturer name
                <input
                  value={manufacturerName}
                  onChange={(event) => setManufacturerName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void addManufacturer();
                    }
                  }}
                  maxLength={200}
                  disabled={manufacturerBusy}
                  placeholder="e.g. Knitwear Studio"
                  autoFocus
                />
              </label>
              <div className="inline-manufacturer-actions">
                <button
                  type="button"
                  className="btn primary"
                  disabled={manufacturerBusy}
                  onClick={addManufacturer}
                >
                  {manufacturerBusy ? "Adding…" : "Add"}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={manufacturerBusy}
                  onClick={cancelManufacturer}
                >
                  Cancel
                </button>
              </div>
              {manufacturerError && (
                <p className="error" role="alert">
                  {manufacturerError}
                </p>
              )}
            </div>
          )}
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
          <button
            type="button"
            className="btn"
            disabled={manufacturerBusy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn primary"
            disabled={busy || creatingManufacturer || manufacturerBusy}
          >
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
