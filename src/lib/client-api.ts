export async function request<T>(
  url: string,
  options?: {
    method?: string;
    json?: unknown;
    form?: FormData;
    signal?: AbortSignal;
  },
): Promise<T> {
  const hasJson = options?.json !== undefined;
  const response = await fetch(url, {
    method: options?.method ?? "GET",
    headers:
      hasJson && !options?.form
        ? { "Content-Type": "application/json" }
        : undefined,
    body:
      options?.form ?? (hasJson ? JSON.stringify(options?.json) : undefined),
    signal: options?.signal,
  });
  if (!response.ok) {
    let data: unknown;
    try {
      data = await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
    }
    throw new Error(
      data &&
        typeof data === "object" &&
        "error" in data &&
        typeof data.error === "string" &&
        data.error
        ? data.error
        : "The request could not be completed.",
    );
  }
  return response.json() as Promise<T>;
}

export async function uploadFile(
  file: File,
  options?: { imagesOnly?: boolean },
): Promise<string> {
  if (options?.imagesOnly && !/\.(png|jpe?g|webp)$/i.test(file.name))
    throw new Error("Choose PNG, JPEG or WebP images.");
  const form = new FormData();
  form.append("file", file);
  const { url } = await request<{ url: string }>("/api/uploads", {
    method: "POST",
    form,
  });
  return url;
}

export const assetsPath = "/sites/techstyles/";
