"use client";

import { useRef, useState } from "react";
import { productsApi } from "@/lib/client-api";
import type { Product } from "@/lib/types";
import { Modal } from "./ui";
import "./product-deletion.css";

export function DeleteProductDialog({
  product,
  onClose,
  onDeleted,
}: {
  product: Pick<Product, "id" | "name">;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await productsApi.delete(product.id);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not delete this product.",
      );
      pending.current = false;
      setBusy(false);
      return;
    }
    onDeleted(product.id);
  }

  return (
    <Modal
      title="Delete product"
      onClose={() => {
        if (!pending.current) onClose();
      }}
    >
      <div className="product-delete-confirmation">
        <p>Delete “{product.name}”?</p>
        <p>
          This deletion is permanent and removes its tech pack, versions, share
          link and Quote Requests.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <button className="btn" autoFocus disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button className="btn danger" disabled={busy} onClick={remove}>
            {busy ? "Deleting…" : "Delete product"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
