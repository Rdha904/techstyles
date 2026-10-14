import type { Product } from "./types";

export type DraftStatus = "saved" | "saving" | "error";
export interface DraftState {
  product: Product;
  status: DraftStatus;
  error: string;
  unsaved: boolean;
}
export interface DraftTransport {
  patch(id: string, data: Partial<Product>): Promise<Product>;
  load(id: string): Promise<Product>;
}

function mergeRows(data: Partial<Product>, base: Product, current: Product) {
  const merged: Partial<Product> = { ...data };
  for (const key of [
    "materials",
    "measurements",
    "comments",
    "colors",
    "artworks",
    "attachments",
    "samples",
    "annotations",
  ] as const) {
    const incoming = data[key];
    if (!incoming) continue;
    const before = base[key] as { id: string }[];
    const freshRows = current[key] as { id: string }[];
    const rows = (incoming as { id: string }[]).map((row) => {
      const original = before.find((x) => x.id === row.id);
      const fresh = freshRows.find((x) => x.id === row.id);
      if (!original || !fresh) return row;
      const changed = Object.fromEntries(
        Object.entries(row).filter(
          ([k, v]) =>
            JSON.stringify(v) !==
            JSON.stringify((original as unknown as Record<string, unknown>)[k]),
        ),
      );
      return { ...fresh, ...changed };
    });
    const added = freshRows.filter(
      (x) =>
        !before.some((b) => b.id === x.id) && !rows.some((r) => r.id === x.id),
    );
    Object.assign(merged, { [key]: [...rows, ...added] });
  }
  return merged;
}

type ProductKey = keyof Product;
interface Payload {
  data: Partial<Product>;
  built: number;
  fields: {
    key: ProductKey;
    edit: number | undefined;
    value: string | undefined;
  }[];
}

export function createProductDraft(
  initial: Product,
  transport: DraftTransport,
  onState: (s: DraftState) => void,
): {
  save(data: Partial<Product>, base?: Product): Promise<void>;
  retry(): Promise<void>;
  replace(product: Product): void;
  readonly state: DraftState;
} {
  let state: DraftState = {
    product: initial,
    status: "saved",
    error: "",
    unsaved: false,
  };
  let queue: Promise<void> = Promise.resolve();
  let revision = 0;
  let activity = 0;
  let pending = 0;
  let built = 0;
  let lastError = "";
  let reconcileVersion: number | undefined;
  const edits = new Map<ProductKey, number>();
  // Store build order so an earlier-built success cannot clear a newer failure.
  const dirty = new Map<ProductKey, number>();

  function publish(product = state.product) {
    const unsaved = dirty.size > 0;
    if (!unsaved) lastError = "";
    state = {
      product,
      status: pending ? "saving" : unsaved ? "error" : "saved",
      error: unsaved ? lastError : "",
      unsaved,
    };
    onState(state);
  }

  function dirtyValues(): Partial<Product> {
    return Object.fromEntries(
      [...dirty.keys()].map((key) => [key, state.product[key]]),
    );
  }

  function overlay(product: Product): Product {
    return dirty.size ? { ...product, ...dirtyValues() } : product;
  }

  function payload(data: Partial<Product>): Payload {
    return {
      data,
      built: ++built,
      fields: (Object.keys(data) as ProductKey[]).map((key) => ({
        key,
        edit: edits.get(key),
        value: JSON.stringify(data[key]),
      })),
    };
  }

  async function reconcile(version: number) {
    try {
      const product = await transport.load(initial.id);
      if (version === activity && pending === 0) publish(overlay(product));
    } catch {
      // A failed reconcile does not create a save error or discard draft values.
    }
  }

  function enqueue(
    version: number,
    getPayload: () => Payload,
    optimistic = state.product,
  ) {
    activity++;
    pending++;
    const operation = queue
      .catch(() => undefined)
      .then(async () => {
        const attempt = getPayload();
        try {
          if (!attempt.fields.length) return;
          const result = await transport.patch(initial.id, attempt.data);
          for (const { key, edit, value } of attempt.fields) {
            if (
              (dirty.get(key) ?? 0) <= attempt.built &&
              edits.get(key) === edit &&
              JSON.stringify(state.product[key]) === value
            )
              dirty.delete(key);
          }
          if (version === revision) publish(overlay(result));
        } catch (error) {
          for (const { key } of attempt.fields)
            dirty.set(key, Math.max(dirty.get(key) ?? 0, attempt.built));
          lastError = (error as Error).message;
          throw error;
        } finally {
          pending--;
          publish();
          if (pending === 0 && reconcileVersion !== undefined) {
            const version = reconcileVersion;
            reconcileVersion = undefined;
            void reconcile(version);
          }
        }
      });
    queue = operation;
    publish(optimistic);
    return operation;
  }

  return {
    get state() {
      return state;
    },
    replace(product) {
      revision++;
      activity++;
      reconcileVersion = pending ? activity : undefined;
      publish(overlay(product));
    },
    save(data, base = state.product) {
      const merged = mergeRows(data, base, state.product);
      const version = ++revision;
      for (const key of Object.keys(merged) as ProductKey[])
        edits.set(key, version);
      const attempt = payload(merged);
      return enqueue(version, () => attempt, { ...state.product, ...merged });
    },
    retry() {
      // Retrying changes no values: a no-op retry must not hide a pending save's response.
      return enqueue(revision, () => payload(dirtyValues()));
    },
  };
}
