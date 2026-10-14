"use client";
import { useEffect, useState } from "react";
import type { Manufacturer } from "@/lib/types";
import { manufacturersApi } from "@/lib/client-api";
import "./product-form.css";

export function ManufacturerPicker({
  manufacturers,
  value,
  onChange,
  onManufacturerSave,
  onActiveChange,
  disabled = false,
  label = "Manufacturer",
  emptyLabel = "None",
}: {
  manufacturers: Manufacturer[];
  value: string;
  onChange: (id: string) => void;
  onManufacturerSave: (manufacturer: Manufacturer) => void;
  onActiveChange?: (active: boolean) => void;
  disabled?: boolean;
  label?: string;
  emptyLabel?: string;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    onActiveChange?.(creating || busy);
  }, [creating, busy, onActiveChange]);
  function cancel() {
    setCreating(false);
    setName("");
    setError("");
  }
  async function add() {
    if (busy || disabled) return;
    if (!name.trim()) {
      setError("Manufacturer name is required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const manufacturer = await manufacturersApi.create({ name: name.trim() });
      onManufacturerSave(manufacturer);
      onChange(manufacturer.id);
      cancel();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <label>
        {label}
        <select
          name="manufacturerId"
          value={creating ? "__new__" : value}
          disabled={disabled || busy}
          onChange={(event) => {
            if (event.target.value === "__new__") {
              setCreating(true);
              setError("");
            } else {
              onChange(event.target.value);
              cancel();
            }
          }}
        >
          <option value="">{emptyLabel}</option>
          {manufacturers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
          <option value="__new__">+ New manufacturer…</option>
        </select>
      </label>
      {creating && (
        <div className="inline-manufacturer full">
          <label>
            New manufacturer name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void add();
                }
              }}
              maxLength={200}
              disabled={busy || disabled}
              placeholder="e.g. Knitwear Studio"
              autoFocus
            />
          </label>
          <div className="inline-manufacturer-actions">
            <button
              type="button"
              className="btn primary"
              disabled={busy || disabled}
              onClick={add}
            >
              {busy ? "Adding…" : "Add"}
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy || disabled}
              onClick={cancel}
            >
              Cancel
            </button>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </>
  );
}
