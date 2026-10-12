import https from "node:https";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { ApiError } from "./store";
export function publicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0)) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  // Reject mapped/transition/local IPv6 ranges; accept only global unicast.
  return (
    isIP(address) === 6 &&
    /^[23][0-9a-f]{3}:/i.test(address) &&
    !/^(2001:(0:|db8:|10:|20:)|2002:)/i.test(address)
  );
}
export function websiteUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ApiError("Enter a complete HTTPS website URL.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    url.hostname === "localhost" ||
    url.hostname.endsWith(".local")
  )
    throw new ApiError(
      "Use a public HTTPS URL without credentials or a custom port.",
    );
  return url;
}
export async function readPublicUrl(
  raw: string,
  limit = 2_000_000,
  redirects = 0,
): Promise<{ bytes: Buffer; type: string; url: string }> {
  const url = websiteUrl(raw);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const records = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await lookup(host, { all: true });
  if (!records.length || records.some((r) => !publicAddress(r.address)))
    throw new ApiError("This address is not a public website.");
  const pinned = records[0];
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "Techstyles-BrandProfile/1.0",
          Accept: "text/html,text/css,image/png,image/jpeg,image/webp",
          "Accept-Encoding": "identity",
        },
        // Pin the validated address so DNS changes cannot redirect into the local network.
        lookup: (_hostname, options, callback) => {
          if (options.all)
            callback(null, [
              { address: pinned.address, family: pinned.family },
            ]);
          else callback(null, pinned.address, pinned.family);
        },
      },
      (response) => {
        const status = response.statusCode || 0;
        if (
          [301, 302, 303, 307, 308].includes(status) &&
          response.headers.location
        ) {
          response.resume();
          if (redirects >= 3) {
            reject(new ApiError("The website redirected too many times."));
            return;
          }
          readPublicUrl(
            new URL(response.headers.location, url).href,
            limit,
            redirects + 1,
          ).then(resolve, reject);
          return;
        }
        if (status < 200 || status >= 300) {
          response.resume();
          reject(
            new ApiError(
              `Website returned HTTP ${status}. Upload files or enter details manually.`,
            ),
          );
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > limit)
            response.destroy(
              new ApiError("Website content exceeds the import size limit."),
            );
          else chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () =>
          resolve({
            bytes: Buffer.concat(chunks),
            type: String(response.headers["content-type"] || ""),
            url: url.href,
          }),
        );
      },
    );
    const timeout = setTimeout(
      () =>
        req.destroy(
          new ApiError(
            "Website import timed out. Try uploading files instead.",
          ),
        ),
      12000,
    );
    req.on("close", () => clearTimeout(timeout));
    req.on("error", (error) =>
      reject(
        error instanceof ApiError
          ? error
          : new ApiError(
              "Could not read this website. It may block automated access. Upload files or enter details manually.",
            ),
      ),
    );
  });
}
