// Every CSS file must have zero color, radius or element-weight drift outside
// the top-level token block. Font-face weight ranges describe font metadata.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, readdirSync } = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function countDrift(css, isGlobals = false) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  // Only the first, top-level token block in globals.css is exempt.
  if (isGlobals) css = css.replace(/^\s*:root\s*\{[^{}]*\}/, "");
  // Custom properties cannot be used in @font-face descriptors. Keep the
  // supported variable-font range literal, while checking other declarations.
  css = css.replace(/@font-face\s*\{[^{}]*\}/gi, (block) =>
    block.replace(/font-weight\s*:[^;{}]+;/gi, ""),
  );

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
      !/^(?:320|340|400|480|520|700|inherit|var\([^)]*\))$/.test(value)
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
  test(`${relativePath} has zero design-token drift`, () => {
    const counts = countDrift(
      readFileSync(path.join(root, relativePath), "utf8"),
      relativePath === "src/app/globals.css",
    );
    for (const [category, count] of Object.entries(counts)) {
      assert.equal(
        count,
        0,
        `${relativePath}: ${category} has ${count}, expected zero. Use design tokens.`,
      );
    }
  });
}
