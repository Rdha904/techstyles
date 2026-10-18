import type { ProductSample } from "./types";

export function migrateSamplings(
  samples: readonly (ProductSample & { status?: string })[],
): ProductSample[] {
  return samples.map(({ status, ...sample }) => {
    if (status?.trim()) {
      sample.note = sample.note?.trim() ? `${sample.note} · ${status}` : status;
    }
    return sample;
  });
}
