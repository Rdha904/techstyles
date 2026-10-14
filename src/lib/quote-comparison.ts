import type { Product, QuoteRequest } from "./types";

export function comparisonRequests(
  requests: QuoteRequest[],
  productId: string,
) {
  return requests.filter(
    (request) =>
      request.productId === productId &&
      (request.status === "quoted" || request.status === "chosen") &&
      request.quote !== null,
  );
}

export function comparisonProducts(
  products: Product[],
  requests: QuoteRequest[],
) {
  return products.filter((product) => {
    const quotes = requests.filter(
      (request) => request.productId === product.id && request.quote !== null,
    );
    return (
      quotes.length > 0 &&
      (!product.archived ||
        quotes.some((request) => request.status === "chosen"))
    );
  });
}

export function rankQuotes(requests: QuoteRequest[]) {
  const quotes = requests.filter(
    (request) =>
      (request.status === "quoted" || request.status === "chosen") &&
      request.quote !== null,
  );
  const mixedCurrencies =
    new Set(quotes.map((request) => request.quote!.currency)).size > 1;
  function lowestIds(field: "unitPrice" | "productionLeadTimeDays") {
    const values = quotes.flatMap((request) => {
      const value = request.quote![field];
      return value !== null && Number.isFinite(value)
        ? [{ id: request.id, value }]
        : [];
    });
    const lowest = Math.min(...values.map((item) => item.value));
    return values
      .filter((item) => item.value === lowest)
      .map((item) => item.id);
  }
  return {
    mixedCurrencies,
    lowestPriceIds: mixedCurrencies ? [] : lowestIds("unitPrice"),
    shortestLeadTimeIds: lowestIds("productionLeadTimeDays"),
  };
}
