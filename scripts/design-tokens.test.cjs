// The design-token allowlist may only go down as legacy CSS migrates to tokens.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, readdirSync } = require("node:fs");
const path = require("node:path");
const allowlist = require("./design-tokens-allowlist.json");

const root = path.resolve(__dirname, "..");

function countDrift(css, isGlobals = false) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  // Only the first, top-level token block in globals.css is exempt.
  if (isGlobals) css = css.replace(/^\s*:root\s*\{[^{}]*\}/, "");

  const counts = { hex: 0, rgb: 0, borderRadius: 0, fontWeight: 0 };
  for (const declaration of css.matchAll(
    /(?:^|[;{])\s*([\w-]+)\s*:\s*([^;{}]+)/g,
  )) {
    const property = declaration[1].toLowerCase();
    const value = declaration[2]
      .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, "")
      .replace(/\s*!important\s*$/i, "")
      .trim();
    counts.hex += (
      value.match(/#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{4}|[\da-f]{3})\b/gi) || []
    ).length;
    counts.rgb += (value.match(/\brgba?\s*\(/gi) || []).length;
    if (
      /^border-(?:radius|(?:top|bottom)-(?:left|right)-radius)$/.test(property)
    ) {
      const radii = value.match(/var\([^)]*\)|[^\s/]+/g) || [];
      counts.borderRadius += radii.filter(
        (radius) =>
          !/^(?:0|50%|2px|8px|16px|50px|999px|var\(--r-[\w-]+\))$/.test(radius),
      ).length;
    }
    if (
      property === "font-weight" &&
      !/^(?:300|320|340|400|480|520|700|inherit|var\([^)]*\))$/.test(value)
    ) {
      counts.fontWeight++;
    }
  }
  return counts;
}

for (const file of readdirSync(path.join(root, "src"), { recursive: true })
  .filter((file) => file.endsWith(".css"))
  .sort()) {
  const relativePath = `src/${file.split(path.sep).join("/")}`;
  test(`${relativePath} stays within its design-token allowlist`, () => {
    const counts = countDrift(
      readFileSync(path.join(root, relativePath), "utf8"),
      relativePath === "src/app/globals.css",
    );
    for (const [category, count] of Object.entries(counts)) {
      const allowed = allowlist[relativePath]?.[category] ?? 0;
      assert.ok(
        count <= allowed,
        `${relativePath}: ${category} has ${count}, allowed ${allowed}. Use design tokens; do not increase the allowlist.`,
      );
    }
  });
}
