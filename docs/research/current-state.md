# Current state — baseline for the whole-project plan

Compiled 2026-10-15 from `main` at a3a9fe0 (40 commits; PRs #1–#3 merged). This is the baseline the project plan builds on: everything listed as built or decided here is preserved unless a later decision explicitly reopens it.

Health at this commit: `npm test` 260/260 pass; `npm run check` (lint, typecheck, production build) passes.

## Who and what

From `GLOSSARY.md` and the plans: a single small-brand founder who does design and sourcing themselves. Techstyles is their **Workspace**: they define the brand, develop products as tech packs, and take them through sourcing to production. Local, single-user, no sign-in; manufacturers never write into the app.

## Modules

The sidebar lists 10 entries (`src/components/sites/techstyles/workspace-routes.ts`): the Dashboard plus 9 modules. Any module page without a dedicated view renders a generic placeholder ("Tools for this area have not been added yet").

| Module | Status | What exists |
|---|---|---|
| Dashboard | **Built** | Single dashboard at `/` (gallery style): Brand Profile summary, stage counts, continue working, compact recent activity. |
| Concept & Audience | **Partial** (2 of 4 pages) | Overview; **Brand Profile** (website/file import with reviewed suggestions, manual edit, revision checks); **Brand Book** (renders the profile, print to PDF, revocable public link). **Audience & Market** and **Moodboards** are placeholders. |
| Design & Tech Packs | **Built** (the core) | Product library (search, filters, sort, grid/list, archive); tech pack editor with 11 sections (overview, sketch, colorways, BOM, artworks, instructions, sizes, attachments, samplings, packaging, versions); raster canvas; comments; named versions with restore; share link with section exclusion; print to PDF; 7 libraries (projects, sketches, materials, artworks, colorways, size charts, attachments); optional OpenAI image generation. |
| Manufacturers & Quotes | **Built** | Manufacturer directory; Quote Requests (Draft → Sent → Quoted → Chosen/Declined, by hand); Quotes; quote comparison; Sourcing panel on the product. |
| Samples & Approvals | **Placeholder** | Pages: Sample Requests, Sample Reviews, Approvals. Building block: the tech pack's **Samplings** section already records sample requests (size, color, quantity, free-text status) inside the tech pack snapshot. |
| Production | **Placeholder** | Pages: Production Orders, Timeline, Milestones. The product `stage` field has Idea / Development / Sampling / Production / Completed. |
| Quality & Inventory | **Placeholder** | Pages: Quality Checks, Inventory, Stock Movements. |
| Store & Sales | **Placeholder** | Pages: Product Listings, Orders, Sales Analytics, Brand Website (moved here from Concept on 2026-10-13). |
| Shipping & Feedback | **Placeholder** | Pages: Shipments, Returns, Customer Feedback. |
| Marketing | **Placeholder** | Pages: Brand Profile (links to the Concept one), Campaigns, Content Calendar, Assets. Shows the Brand Profile summary. |

## Platform

- Next.js 16.3.5 (webpack), React 19. No database: `data/workspace.json` (atomic writes) plus `data/uploads/`, behind a `WorkspaceRepository` and `FileStorage` interface so a database and sign-in can replace them (`docs/backend.md`).
- Workspace-scoped storage exists, but `currentWorkspaceId()` is always `default`.
- Share links (tech pack, Brand Book) work on localhost only; real external access needs hosting plus authentication.
- Tests: `node --test scripts/*.test.cjs`, 18 test files over `src/lib` modules.
- Visual system: Figma-style gallery/work densities, Inter, design tokens (`docs/plans/figma-restyle.md`).

## Settled decisions (preserve)

| Decision | Source |
|---|---|
| Sourcing data (manufacturer, Quote Requests, Quotes) stays outside the tech pack: never in snapshots, share links, PDF or exclusions | ADR 0001 |
| Domain terms: Workspace, Brand Profile, Tech Pack, Sourcing, Manufacturer vs Supplier, Quote Request, Quote | `GLOSSARY.md` |
| Local, single-user; the founder records everything; manufacturers never write into the app | `docs/plans/manufacturers-and-quotes.md` |
| One share link per product; per-manufacturer links wait for hosting | same |
| One Quote per Quote Request; one price for the whole product | same |
| The workspace dashboard is the only dashboard, at `/`; Workspace name comes from the Brand Profile | `docs/plans/dashboard-cleanup.md` |
| Desktop only (1440px), light theme only | plans; memory |
| Figma direction for the whole app, two densities | `docs/plans/figma-restyle.md` |
| Concept & Audience order: Brand Profile → Audience & Market → Moodboards → Brand Book; Brand Website belongs to Store & Sales | `docs/research/pomelli-analysis.md` |
| Brand Book never duplicates or generates content; it renders the profile | same |
| Imports never invent data; suggestions are unchecked until the founder selects them | `README.md`, `docs/research/brand-profile.md` |
| Generated AI content needs a key; without one the UI shows an error, never a fake result | `README.md` |
| Implementation work is delegated to Codex; Claude plans and reviews | `CLAUDE.md` |

## Deferred items (from earlier plans)

- Mobile layouts and testing.
- A separate Workspace name in Settings; workspace activity beyond product updates.
- A product delete action in the UI.
- Samples & Approvals ("comes later").
- Per-manufacturer share links (after hosting).
- Quotes priced by quantity, size or colorway.
- Manufacturer certifications, payment terms and ratings.
- Suppliers (mills, trim vendors) as directory records.
- Concept proposals not yet built: Audience segments (`audienceSegments[]`), import improvements (DOCX, HEIC, limits), an AI assistant that suggests fields (after a provider abstraction), Brand Website (deferred).
- Canvas and tech pack gaps vs the original Techstyles app (vector engine, grading, templates, spreadsheet import/export, section reordering, note undo): `README.md` "Known differences".

## Loose ends found

- `docs/plans/manufacturers-and-quotes.md` line 3 still says "No implementation yet"; it was merged in PR #1.
- `README.md` is stale: it describes the old dashboard, "supplier" filters and "supplier links" (now Manufacturer).
- Unchoosing a Chosen Quote Request sets it back to Quoted but does not clear the product's manufacturer (`src/lib/quote-requests.ts` sets `product.manufacturerId` only on choose).
- The tech pack's sample status is free text, and the product `stage` is set by hand; nothing links them to Quote Requests yet.
- Marketing lists "Brand Profile" as its own page, which duplicates the Concept & Audience page.
- No GitHub issues exist yet; work so far was planned in `docs/plans/` files.
