import type {
  Product,
  QuoteRequest,
  QuoteRequestAction,
  QuoteRequestStatus,
} from "./types";

export const quoteRequestActions: Record<
  QuoteRequestStatus,
  QuoteRequestAction[]
> = {
  draft: ["send", "decline"],
  sent: ["decline"],
  quoted: ["choose", "decline"],
  chosen: ["unchoose"],
  declined: ["reopen"],
};

export function changedSinceSent(
  product: Pick<Product, "techPackUpdatedAt">,
  request: QuoteRequest,
) {
  return (
    !!request.sentAt &&
    ["sent", "quoted", "chosen"].includes(request.status) &&
    product.techPackUpdatedAt > request.sentAt
  );
}
