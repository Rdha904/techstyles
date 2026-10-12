import { randomUUID } from "node:crypto";
import { load } from "cheerio";
import { ApiError } from "./store";
import { detectFile, saveUpload } from "./uploads";
import { readPublicUrl, websiteUrl } from "./safe-web";
import {
  brandTextFields,
  type BrandField,
  type BrandImport,
} from "./brand-types";
const labels: Record<string, BrandField> = {
  "brand name": "name",
  name: "name",
  website: "website",
  "brand description": "description",
  description: "description",
  "about us": "description",
  "brand values": "values",
  values: "values",
  positioning: "positioning",
  "brand positioning": "positioning",
  audience: "audience",
  "target audience": "audience",
  tone: "tone",
  "tone of voice": "tone",
  colors: "colors",
  "brand colors": "colors",
  fonts: "fonts",
  typography: "fonts",
};
export function newImport(): BrandImport {
  return { suggestions: [], warnings: [], sources: [] };
}
function add(
  result: BrandImport,
  field: BrandField,
  value: string,
  source: string,
  excerpt = value,
) {
  value = value.trim().slice(0, 6000);
  if (
    !value ||
    result.suggestions.some((s) => s.field === field && s.value === value) ||
    result.suggestions.length >= 80
  )
    return;
  result.suggestions.push({
    id: randomUUID(),
    field,
    value,
    source,
    excerpt: excerpt.slice(0, 1500),
  });
}
function color(value: string) {
  return value.length === 4
    ? `#${value
        .slice(1)
        .split("")
        .map((c) => c + c)
        .join("")}`.toUpperCase()
    : value.toUpperCase();
}
function addLabeled(
  result: BrandImport,
  field: BrandField,
  value: string,
  source: string,
) {
  if (field === "colors") {
    for (const hex of value.match(/#[\da-f]{6}\b|#[\da-f]{3}\b/gi) || [])
      add(result, field, color(hex), source, value);
  } else if (field === "fonts") {
    for (const font of value
      .split(/[,;\n]/)
      .map((f) => f.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean)
      .slice(0, 12))
      add(result, field, font, source, value);
  } else add(result, field, value, source);
}
export function extractText(text: string, source: string): BrandImport {
  const result = newImport();
  result.sources.push(source);
  const lines = text.slice(0, 120000).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
      .replace(/^\s*#{1,6}\s*/, "")
      .replace(/\*\*/g, "")
      .trim();
    const match = line.match(/^([^:]{1,40}):\s*(.+)$/);
    if (match && labels[match[1].toLowerCase()])
      addLabeled(result, labels[match[1].toLowerCase()], match[2], source);
    else if (labels[line.toLowerCase()]) {
      const block: string[] = [];
      for (let j = i + 1; j < Math.min(i + 12, lines.length); j++) {
        const next = lines[j].trim();
        if (
          (next === "" && block.length) ||
          /^#{1,6}\s/.test(next) ||
          /^[\w ]{1,40}:/.test(next) ||
          labels[next.toLowerCase()]
        )
          break;
        if (next) block.push(next);
      }
      addLabeled(result, labels[line.toLowerCase()], block.join("\n"), source);
    }
  }
  if (!result.suggestions.length)
    result.warnings.push(
      `${source}: No explicitly labeled brand details found. Add the missing information manually.`,
    );
  return result;
}
export function extractHtml(html: string, source: string) {
  const result = newImport();
  result.sources.push(source);
  const $ = load(html);
  const name =
    $('meta[property="og:site_name"]').attr("content") ||
    $("title").first().text();
  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content");
  add(
    result,
    "name",
    name || "",
    source,
    "Website title / site name: " + (name || ""),
  );
  if (description)
    add(
      result,
      "description",
      description,
      source,
      "Website description: " + description,
    );
  add(result, "website", source, source);
  $("script, noscript, nav, footer").remove();
  $("h1,h2,h3,h4").each((_index, el) => {
    const label = $(el).text().trim().toLowerCase();
    const field = labels[label];
    if (
      field &&
      brandTextFields.includes(field as (typeof brandTextFields)[number])
    ) {
      const text = $(el).nextUntil("h1,h2,h3,h4").text().trim();
      if (text) add(result, field, text, source, `${$(el).text()}: ${text}`);
    }
  });
  const css =
    $("style").text() +
    "\n" +
    $("[style]")
      .map((_i, e) => $(e).attr("style"))
      .get()
      .join("\n");
  extractCss(css, source, result);
  const resolve = (value?: string) => {
    try {
      return websiteUrl(new URL(value || "", source).href).href;
    } catch {
      return "";
    }
  };
  const styles = $('link[rel="stylesheet"]')
    .map((_i, e) => resolve($(e).attr("href")))
    .get()
    .filter(Boolean)
    .filter((url) => new URL(url).origin === new URL(source).origin)
    .slice(0, 3);
  const images: {
    url: string;
    field: "logo" | "referenceImages";
    name: string;
  }[] = [];
  $("img").each((_i, el) => {
    const name = $(el).attr("alt") || "Website image";
    const raw = $(el).attr("src") || $(el).attr("data-src");
    const url = raw ? resolve(raw) : "";
    if (url && !images.some((i) => i.url === url))
      images.push({
        url,
        field: /logo/i.test(name + " " + raw) ? "logo" : "referenceImages",
        name,
      });
  });
  const og = $('meta[property="og:image"]').attr("content");
  if (og)
    images.push({
      url: resolve(og),
      field: "referenceImages",
      name: "Website social image",
    });
  return {
    result,
    styles,
    images: images
      .filter((i) => i.url)
      .sort((a, b) => Number(b.field === "logo") - Number(a.field === "logo"))
      .slice(0, 6),
  };
}
export function extractCss(css: string, source: string, result: BrandImport) {
  const colorValues = [
    ...css.matchAll(
      /(?:^|[;{\s])(?:color|background(?:-color)?|border-color|--[\w-]*(?:color|primary|accent|brand)[\w-]*)\s*:\s*(#[\da-f]{6}\b|#[\da-f]{3}\b)/gi,
    ),
  ].map((m) => color(m[1]));
  for (const value of [...new Set(colorValues)].slice(0, 12))
    add(
      result,
      "colors",
      value,
      source,
      "CSS color declaration; verify that this belongs to your brand palette.",
    );
  for (const match of css.matchAll(/font-family\s*:\s*([^;}]+)/gi)) {
    const family = match[1]
      .split(",")[0]
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (
      family &&
      !/^(inherit|initial|unset|sans-serif|serif|monospace|system-ui|var\(|ui-)/i.test(
        family,
      )
    )
      add(result, "fonts", family, source, `font-family: ${match[1]}`);
  }
}
export async function importWebsite(raw: string): Promise<BrandImport> {
  const page = await readPublicUrl(raw);
  if (!/text\/html|application\/xhtml/i.test(page.type))
    throw new ApiError("This URL does not return an HTML website.");
  const { result, styles, images } = extractHtml(
    page.bytes.toString("utf8"),
    page.url,
  );
  await Promise.all(
    styles.map(async (url) => {
      try {
        const css = await readPublicUrl(url, 400000);
        if (/text\/css/i.test(css.type))
          extractCss(css.bytes.toString("utf8"), url, result);
      } catch {
        result.warnings.push(
          "A linked stylesheet could not be read. Add missing colors or fonts manually.",
        );
      }
    }),
  );
  await Promise.all(
    images.map(async (image) => {
      try {
        const resource = await readPublicUrl(image.url, 5_000_000);
        if (detectFile(resource.bytes) === "pdf") return;
        const saved = await saveUpload(resource.bytes);
        add(
          result,
          image.field,
          saved.url,
          page.url,
          `${image.name} — ${image.url}`,
        );
      } catch {
        result.warnings.push(
          `Image could not be imported: ${image.name}. Upload a PNG, JPEG or WebP copy if needed.`,
        );
      }
    }),
  );
  result.warnings.unshift(
    "Only the supplied page and up to three same-site stylesheets were inspected. JavaScript-rendered content, embedded SVG logos and unlabelled brand strategy may be missing. CSS colors and fonts are candidates, not confirmed brand choices.",
  );
  return result;
}
export async function importFiles(files: File[]): Promise<BrandImport> {
  const result = newImport();
  if (!files.length || files.length > 5)
    throw new ApiError("Choose between one and five files.");
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024)
      throw new ApiError(`${file.name}: Maximum file size is 10 MB.`);
    const bytes = Buffer.from(await file.arrayBuffer());
    result.sources.push(file.name);
    if (/\.(txt|md|json)$/i.test(file.name)) {
      const text = bytes.toString("utf8");
      if (text.includes("\u0000"))
        throw new ApiError(`${file.name}: This is not a text file.`);
      const extracted = extractText(text, file.name);
      if (/\.json$/i.test(file.name)) {
        try {
          const input = JSON.parse(text) as Record<string, unknown>;
          for (const field of [
            ...brandTextFields,
            "colors",
            "fonts",
          ] as const) {
            if (typeof input[field] === "string")
              addLabeled(extracted, field, input[field], file.name);
            else if (Array.isArray(input[field]))
              for (const v of input[field])
                if (typeof v === "string")
                  addLabeled(extracted, field, v, file.name);
          }
          if (extracted.suggestions.length) extracted.warnings = [];
        } catch {
          extracted.warnings.push(
            `${file.name}: Invalid JSON; only labeled text was inspected.`,
          );
        }
      }
      result.suggestions.push(...extracted.suggestions);
      result.warnings.push(...extracted.warnings);
    } else if (bytes.subarray(0, 5).toString() === "%PDF-") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: bytes, isEvalSupported: false });
      try {
        const parsed = await parser.getText({ first: 20 });
        const extracted = extractText(parsed.text, file.name);
        result.suggestions.push(...extracted.suggestions);
        result.warnings.push(...extracted.warnings);
        result.warnings.push(
          `${file.name}: Text from the first 20 pages was inspected. Scanned pages and embedded images require manual entry or separate image uploads.`,
        );
      } catch {
        result.warnings.push(
          `${file.name}: PDF text could not be read. Upload a text version or enter details manually.`,
        );
      } finally {
        await parser.destroy();
      }
    } else {
      const kind = detectFile(bytes);
      if (kind === "pdf") continue;
      const saved = await saveUpload(bytes);
      add(
        result,
        "referenceImages",
        saved.url,
        file.name,
        "Uploaded image. Review it and choose whether to use it as your logo or a visual reference.",
      );
      result.warnings.push(
        `${file.name}: Added as a visual reference candidate. Text, values and audience were not inferred from the image.`,
      );
    }
  }
  result.suggestions = result.suggestions.slice(0, 80);
  return result;
}
