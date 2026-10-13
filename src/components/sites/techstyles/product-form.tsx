"use client";
import { useState, type FormEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { request } from "@/lib/client-api";
import { Modal } from "./ui";

export function ProductForm({
  product,
  onClose,
  onSave,
}: {
  product?: Product;
  onClose: () => void;
  onSave: (p: Product) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (!String(data.code || "").trim())
      data.code = `${String(data.category).slice(0, 3).toUpperCase()}-${String(data.name).slice(0, 3).toUpperCase()}-${crypto.randomUUID().slice(0, 3).toUpperCase()}`;
    try {
      const p = await request<Product>(
        product ? `/api/products/${product.id}` : "/api/products",
        { method: product ? "PATCH" : "POST", json: data },
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
      onClose={onClose}
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
            Supplier
            <input name="supplier" defaultValue={product?.supplier} />
          </label>
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
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy}>
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
