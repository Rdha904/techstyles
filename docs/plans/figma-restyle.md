# Figma-style restyle — plan

Status: approved 2026-10-15, in progress on branch `figma-restyle` (one PR, one commit per task).
Visual reference: `docs/design/dashboard-preview-figma.html` (built from `docs/design/DESIGN_Figma.md`).
Scope: the desktop app at 1440px, light theme only. Mobile stays out of scope.

## Why

The app's styling has grown page by page. It has 10 CSS files, about 380 hard-coded hex colors (31 of them the old blue `#4663bc`), 12 different border radii, font sizes from 10px to 30px, and weights from 400 to 900. The user chose the Figma direction from two previews. This plan applies it everywhere in one consistent system instead of restyling page by page.

## The system in one paragraph

A white gallery canvas with black text, one indigo for the main action, and imagery that carries all the color. On image-heavy overview pages the type is large and light. On working screens (tables, forms, the editor) the same palette, radii and components are used at a compact size. Elevation comes from thin lines and white space. The one soft shadow is reserved for things that float: the dashboard hero card, modals, menus and popovers.

## Two densities, one set of tokens

Every screen uses one of two densities. They share colors, radii, components and the font, and differ only in type scale and spacing.

| | Gallery density | Work density |
|---|---|---|
| Used on | Dashboard, module overview pages, Products library, Brand Profile overview, Brand Book | Product editor (tech pack sections, BOM, measurements, comments, versions), canvas chrome, Manufacturers & Quotes tables, sourcing panel, quote comparison, libraries, Settings, all modals and forms |
| Page title (`h1`) | 56px / weight 320 (dashboard hero only); 36px / 340 elsewhere | 28px / 400 |
| Section heading | 36px / 340 | 20px / 480 |
| Card / item title | 18px / 520 | 15px / 520 |
| Body | 16–18px / 400 | 14px / 400 |
| Secondary text | 14–15px graphite | 13px graphite |
| Technical values | — | JetBrains Mono 12px, +0.04em: style codes, measurements, hex values, POM codes, dates in lists |
| Section gap | 72px | 32px |
| Panel padding | 24–36px | 16–20px |

Figma's own rule of "nothing below 16px" is relaxed to 13–14px on working screens. That is the main adaptation for density. Nothing goes below 12px, which is the floor for mono annotations, down from today's 10–11px labels.

Weights are limited to 320, 340, 400, 480 and 520. 700 is used only for the workspace name in the sidebar. Today's 500, 600 and 700 map to 480 and 520.

## Tokens

These go into `:root` in `src/app/globals.css` as the only source of color, type, radius and shadow values. The old variables (`--blue`, `--line`, `--muted`, `--ink`, `--bg`) stay for the first task as aliases of the new tokens, so nothing breaks while files are migrated. They are removed at the end.

| Token | Value | Use |
|---|---|---|
| `--ink` | `#000000` | Text, icons, strong rules, ghost-button borders |
| `--paper` | `#ffffff` | Canvas and surfaces |
| `--mist` | `#e2e2e2` | Dividers, table row lines, input borders (hover: `--ink`) |
| `--mist-soft` | `#f4f4f4` | Image grounds, hover rows, table header band, quiet tags |
| `--graphite` | `#595959` | Secondary text (7:1 on white) |
| `--indigo` / `--indigo-press` | `#4d49fc` / `#3c38e0` | Primary button, focus ring, active nav icon, selected state |
| `--ok`, `--warn`, `--danger` | `#1f7a45`, `#9a5b00`, `#c62828` + 8% tints | Status only: saved, errors, the Declined and Chosen quote states, destructive actions. Never decoration. |
| Radius | 2 / 8 / 16 / pill | 2: icon tiles, small badges. 8: inputs, ghost buttons, menus, table containers. 16: cards, panels, modals, images. Pill: primary buttons, status and stage chips. |
| `--shadow-float` | `0 24px 70px rgba(0,0,0,.10)` | Only on floating layers (hero card, modal, dropdown, popover, toast) |

The per-area accents in `manufacturer-quotes.css` (`--area-accent` green/purple/blue) are removed. Areas are told apart by label and icon, not color.

## Shared components

These are restyled once in `globals.css` and reused, replacing per-page variants.

- **Buttons:** primary is an indigo pill, at most one per view. Secondary is a ghost button with a black border and 8px radius. Tertiary is quiet: no border, mist-soft on hover. Destructive is a ghost button with `--danger` text, plus a filled red button inside confirmation dialogs only. Two heights: 40px (gallery) and 32px (work).
- **Inputs, selects and textareas:** 36px tall, 8px radius, 1px `--mist` border, `--ink` border on hover, 2px indigo focus ring. Labels sit above the field at 13px weight 480, with no uppercase labels anywhere. Help text is 13px graphite. Errors are 13px `--danger` under the field.
- **Tables (BOM, measurements, quotes, materials, manufacturers):** 40px rows (36px in the measurement grid). The header band is mist-soft with 12px weight 480 graphite sentence-case labels. Rows are separated by 1px `--mist` lines, with no vertical lines except in measurement grids. Numbers are right-aligned with tabular figures, and codes and measurements use mono. Each table sits in a 16px-radius container with its own horizontal scroll, and the first column is sticky in wide grids.
- **Chips:** stage (Idea, Development, Sampling, Production) and quote state (Draft, Sent, Quoted, Chosen, Declined) are pills. Neutral states are mist-soft with ink text. Chosen is filled ink. Declined uses the `--danger` tint.
- **Panels and cards:** white with a 1px `--mist` border and 16px radius on work screens. On gallery pages, cards have no border and rely on the image ground and white space, as in the preview.
- **Modals:** 16px radius with the float shadow and a 50% white backdrop blur. The title is 20px weight 480. Actions sit bottom-right, with the primary pill on the right.
- **Navigation:** sidebars as in the preview. The active item has a mist-soft fill, weight 520 and an indigo icon. The "Independent workspace · Saved on this computer" banner folds into the 64px borderless top bar as a mono note.
- **Product image (`ProductImage` component):** one component used on the dashboard, Products library, recent activity, the picker and the editor cover. See the fallback below.

## Fallback for workspaces without product images

- **Product tiles and thumbnails:** a product with no cover gets a mist-soft tile with a line icon for its category (hoodie, tee, jacket, trousers, or a generic garment), its product code in mono underneath, and its stage chip as usual. It looks deliberate, not broken, and the tile keeps the same size as tiles with images.
- **Dashboard hero:**
  - With 3 or more product covers, the collage uses the user's own covers (up to 6, newest first). The bundled marketing images are not used, because the collage must show the user's own work.
  - With fewer than 3, there is no collage and no floating card. The headline, subtext and actions sit left-aligned on the plain canvas, and the counts row follows directly. The page looks finished, not empty.
- **No products at all:** "Continue working" shows one wide empty state with a mist-soft ground, a garment icon, "Start your first tech pack" and the primary button. The collage and gallery do not render.

## What does not change

- The user's own brand colors, logos and fonts in Brand Profile and Brand Book. They are content, not chrome.
- Uploaded images, sketches, and canvas drawing colors and tools.
- **Printed and shared tech packs** (`/products/:id/print`, `/share/:token`): open question below. Manufacturers see these.

## Order of work (Codex tasks)

Each task is one reviewable diff. `npm run check` and `npm test` must pass after each, plus screenshots at 1440px of every route the task touches.

1. **Foundation.**
   - Self-host Inter (variable) and JetBrains Mono (both OFL) in `public/sites/techstyles/`, replacing Figtree.
   - Add the tokens, with aliases for the old variables.
   - Restyle base elements and the shared components: buttons, inputs, tables, chips, panels, modals, toasts, focus.
   - Add `scripts/design-tokens.test.cjs`. It fails if a CSS file outside the token block adds a new hex color, radius or font-weight outside the system. It starts with an allowlist of today's literals, which shrinks with each task.
2. **Shell.** Both sidebars, the top bar and banner, and the collapse and focus-mode controls.
3. **Dashboard.** Match the preview with real data, the `ProductImage` component and both hero fallbacks.
4. **Products library and product editor.** Library grid, editor layout and contents rail, all tech pack sections, BOM and measurement tables, comments, versions, the canvas header and tool chrome, the create-product modal.
5. **Sourcing.** Manufacturers & Quotes pages, the manufacturer picker, sourcing panel, quote requests and quote comparison.
6. **Libraries, Settings, Concept & Audience, Brand Profile and Brand Book chrome.**
7. **Cleanup.** Remove the old variable aliases, the remaining literals and inline `style={{}}` colors (about 54 in `product-editor.tsx`, `workspace.tsx` and others), and empty the allowlist. Then do a final pass across every route.

## Verification

- `npm run check` and `npm test` pass, including the token check.
- **Screenshots at 1440px** of every route (dashboard with images, with too few images, and empty; library; editor sections; canvas; each sourcing page; libraries; settings; Brand Profile; Brand Book), compared against the preview by Claude and then reviewed by the user.
- **Automated per route:** exactly one `<h1>`, no sideways page scroll, WCAG AA text contrast, a visible focus ring on every interactive element, no text below 12px, and every form control has a label.
- Run with `playwright-core` against `next dev --webpack -p 3110`, with `TECHSTYLES_DATA_DIR` pointing at a copy of `data/`. Add sample covers to test the collage.

## Decisions (2026-10-15)

| # | Decision |
|---|---|
| Printed and shared tech packs | Change only fonts and colors to the new tokens. Keep their layout as it is. |
| Font | Inter (variable, latin and latin-ext) replaces Figtree. JetBrains Mono is used for technical values. Both are self-hosted in `public/sites/techstyles/`. |
| Delivery | One branch (`figma-restyle`), one PR, one commit per task. Each task is reviewed and tested before the next starts. |
| Scope | Desktop only (1440px). No mobile layout work and no mobile testing. |

## Progress

| Task | Status | Commit |
|---|---|---|
| 1. Foundation | done | 4cf4d7b |
| 2. Shell | done | bd161e2 |
| 3. Dashboard | queued | |
| 4. Products library and editor | queued | |
| 5. Sourcing | queued | |
| 6. Libraries, Settings, Concept, Brand Profile and Brand Book | queued | |
| 7. Cleanup | queued | |

### Needs your eyes

(Design decisions made during implementation that you may want to overrule.)

- **Toggle buttons are dark, not indigo.** The list/grid toggles, the Archived filter and choosing a quote used the main-button style to show "on". They now use a dark selected state, so indigo stays reserved for the one main action. A chosen quote shows as a pressed dark button.
- **Module sidebar is 244px wide** (was 225px), so every module name fits on one line at 14px.
- **The header's "Workspace" button is gone.** The banner's "Workspace settings" link already goes to Settings. The products button now reads "New tech pack".
- **Pages with their own heading** (libraries, Settings, sourcing pages, Brand Book) show only a small context title in the header instead of repeating the headline.
