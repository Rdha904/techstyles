import type {
  Manufacturer,
  Product,
  QuoteRequest,
  QuoteRequestStatus,
} from "./types";

export const quoteRequestStatuses: QuoteRequestStatus[] = [
  "draft",
  "sent",
  "quoted",
  "chosen",
  "declined",
];

export function filterQuoteRequests(
  requests: QuoteRequest[],
  products: Product[],
  manufacturers: Manufacturer[],
  filters: {
    status?: string;
    manufacturerId?: string;
    productId?: string;
    query?: string;
    showArchived?: boolean;
  } = {},
) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const manufacturerById = new Map(
    manufacturers.map((manufacturer) => [manufacturer.id, manufacturer]),
  );
  const query = filters.query?.trim().toLowerCase() || "";
  return requests.filter((request) => {
    const product = productById.get(request.productId);
    if (!product || (product.archived && !filters.showArchived)) return false;
    if (filters.status && request.status !== filters.status) return false;
    if (
      filters.manufacturerId &&
      request.manufacturerId !== filters.manufacturerId
    )
      return false;
    if (filters.productId && request.productId !== filters.productId)
      return false;
    return (
      !query ||
      product.name.toLowerCase().includes(query) ||
      !!manufacturerById
        .get(request.manufacturerId)
        ?.name.toLowerCase()
        .includes(query)
    );
  });
}

export function sourcingOverviewCounts(
  products: Product[],
  requests: QuoteRequest[],
) {
  const activeIds = new Set(
    products
      .filter((product) => !product.archived)
      .map((product) => product.id),
  );
  const byStatus: Record<QuoteRequestStatus, number> = {
    draft: 0,
    sent: 0,
    quoted: 0,
    chosen: 0,
    declined: 0,
  };
  const chosenProducts = new Set<string>();
  for (const request of requests) {
    if (!activeIds.has(request.productId)) continue;
    byStatus[request.status]++;
    if (request.status === "chosen") chosenProducts.add(request.productId);
  }
  return { byStatus, chosenProducts: chosenProducts.size };
}
