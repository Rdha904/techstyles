"use client";
import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { X } from "lucide-react";

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", f);
    return () => document.removeEventListener("keydown", f);
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function Brand() {
  return (
    <Link href="/" className="brand">
      <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">
        {[
          [6, 6],
          [19, 6],
          [32, 6],
          [19, 19],
          [19, 32],
        ].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="10" height="10" rx="2.4" />
        ))}
      </svg>
      techstyles
    </Link>
  );
}
