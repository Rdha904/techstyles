import { randomUUID } from "node:crypto";
import { localAssetUrl, object, string } from "./api";
import { ApiError, findProduct, type WorkspaceData } from "./store";
import { findManufacturer } from "./manufacturers";
import { quoteRequestActions } from "./quote-request-status";
import type { Quote, QuoteRequest, QuoteRequestAction } from "./types";

export { changedSinceSent } from "./quote-request-status";

export function validateQuote(
  value: unknown,
  today = new Date().toISOString().slice(0, 10),
): Quote {
  const input = object(value);
  function number(
    field: string,
    optional = false,
    integer = false,
  ): number | null {
    const value = input[field];
    if (optional && (value === null || value === undefined)) return null;
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      (integer && !Number.isSafeInteger(value))
    )
      throw new ApiError(`Invalid ${field}`);
    return value;
  }
  const currency = string(input.currency, "currency", 3);
  if (!/^[A-Z]{3}$/.test(currency))
    throw new ApiError("Currency must be a 3-letter uppercase code");
  const receivedAt =
    input.receivedAt === undefined
      ? today
      : string(input.receivedAt, "received date", 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(receivedAt) ||
    !Number.isFinite(Date.parse(receivedAt)) ||
    new Date(receivedAt).toISOString().slice(0, 10) !== receivedAt
  )
    throw new ApiError("Invalid received date");
  let attachment: Quote["attachment"] = null;
  if (input.attachment !== null && input.attachment !== undefined) {
    const asset = object(input.attachment);
    const name = string(asset.name, "attachment name", 500).trim();
    const url = string(asset.url, "attachment URL", 1000);
    if (!name || !localAssetUrl(url) || !url.startsWith("/api/uploads/"))
      throw new ApiError("Use a local uploaded asset for the quote attachment");
    attachment = { name, url };
  }
  return {
    unitPrice: number("unitPrice") as number,
    currency,
    moq: number("moq", true, true),
    productionLeadTimeDays: number("productionLeadTimeDays", true, true),
    sampleCost: number("sampleCost", true),
    sampleLeadTimeDays: number("sampleLeadTimeDays", true, true),
    receivedAt,
    notes: input.notes === undefined ? "" : string(input.notes, "quote notes"),
    attachment,
  };
}

export function findQuoteRequest(data: WorkspaceData, id: string) {
  const request = data.quoteRequests.find((item) => item.id === id);
  if (!request) throw new ApiError("Quote Request not found", 404);
  return request;
}

export function createQuoteRequest(
  data: WorkspaceData,
  input: Record<string, unknown>,
  now = new Date().toISOString(),
  id = randomUUID(),
): QuoteRequest {
  const productId = string(input.productId, "product ID", 200);
  const manufacturerId = string(input.manufacturerId, "manufacturer ID", 200);
  findProduct(data, productId);
  findManufacturer(data, manufacturerId);
  if (
    data.quoteRequests.some(
      (item) =>
        item.productId === productId && item.manufacturerId === manufacturerId,
    )
  )
    throw new ApiError(
      "A Quote Request already exists for this product and manufacturer",
      409,
    );
  const request: QuoteRequest = {
    id,
    productId,
    manufacturerId,
    status: "draft",
    sentAt: null,
    quote: null,
    createdAt: now,
    updatedAt: now,
  };
  data.quoteRequests.unshift(request);
  return request;
}

export function updateQuoteRequest(
  data: WorkspaceData,
  id: string,
  input: Record<string, unknown>,
  now = new Date().toISOString(),
) {
  const request = findQuoteRequest(data, id);
  const product = findProduct(data, request.productId);
  if ((input.quote !== undefined) === (input.action !== undefined))
    throw new ApiError("Provide either an action or a quote");
  if (input.quote !== undefined) {
    if (!["sent", "quoted", "chosen"].includes(request.status))
      throw new ApiError(
        "A quote can only be saved on a sent, quoted or chosen request",
      );
    request.quote = validateQuote(input.quote, now.slice(0, 10));
    if (request.status === "sent") request.status = "quoted";
  } else {
    const action = string(input.action, "action", 30) as QuoteRequestAction;
    if (!quoteRequestActions[request.status].includes(action))
      throw new ApiError("Invalid Quote Request transition");
    if (action === "send") {
      request.status = "sent";
      request.sentAt = now;
    } else if (action === "decline") request.status = "declined";
    else if (action === "reopen")
      request.status = request.quote
        ? "quoted"
        : request.sentAt
          ? "sent"
          : "draft";
    else if (action === "unchoose") request.status = "quoted";
    else if (action === "choose") {
      for (const other of data.quoteRequests)
        if (
          other.productId === request.productId &&
          other.status === "chosen"
        ) {
          other.status = "quoted";
          other.updatedAt = now;
        }
      request.status = "chosen";
      product.manufacturerId = request.manufacturerId;
      product.updatedAt = now;
    }
  }
  request.updatedAt = now;
  return {
    request,
    product: { id: product.id, manufacturerId: product.manufacturerId },
  };
}

export function deleteQuoteRequest(data: WorkspaceData, id: string) {
  findQuoteRequest(data, id);
  data.quoteRequests = data.quoteRequests.filter((item) => item.id !== id);
}
