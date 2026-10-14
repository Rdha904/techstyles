"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { request } from "@/lib/client-api";
import { createProductDraft, type DraftTransport } from "@/lib/product-draft";
import type { Product } from "@/lib/types";

const transport: DraftTransport = {
  patch: (id, data) =>
    request<Product>(`/api/products/${id}`, { method: "PATCH", json: data }),
  load: (id) => request<Product>(`/api/products/${id}`),
};

function createSession(product: Product) {
  const produced = new WeakSet([product]);
  const listeners = new Set<() => void>();
  const draft = createProductDraft(product, transport, (state) => {
    produced.add(state.product);
    listeners.forEach((listener) => listener());
  });
  return { id: product.id, draft, produced, listeners };
}

export function useProductDraft(
  product: Product,
  onChange: (product: Product) => void,
) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const [session, setSession] = useState(() => createSession(product));
  if (session.id !== product.id) setSession(createSession(product));

  const subscribe = useCallback(
    (listener: () => void) => {
      let previous = session.draft.state.product;
      const update = () => {
        const next = session.draft.state.product;
        if (previous !== next) {
          previous = next;
          onChangeRef.current(next);
        }
        listener();
      };
      session.listeners.add(update);
      return () => {
        session.listeners.delete(update);
      };
    },
    [session],
  );
  const getSnapshot = useCallback(() => session.draft.state, [session]);
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!session.produced.has(product)) session.draft.replace(product);
  }, [product, session]);

  return { draft: session.draft, ...state };
}

export function saveInBackground(
  save: ((data: Partial<Product>) => Promise<void>) | undefined,
  data: Partial<Product> = {},
) {
  // Save errors are surfaced through draft state.
  if (save) void save(data).catch(() => undefined);
}
