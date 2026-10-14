# Manufacturers & Quotes — feature scope

Status: scoped 2026-10-14, ready for implementation. No implementation yet.
Vocabulary: see `GLOSSARY.md` (Manufacturer, Supplier, Quote Request, Quote).

## Why this feature

The workflow up to a shared tech pack exists. What the founder does after sharing, which is choosing manufacturers, collecting quotes and picking one, is missing. That is the thinnest step of the core workflow.

## Confirmed decisions

| # | Decision |
|---|---|
| Goal | Make the workflow after a tech pack is shared work end to end. |
| User | A small-brand founder who does design and sourcing themselves. |
| Setup | Stays local and single-user. The founder records everything; manufacturers never write into the app. |
| Out of scope | Dashboard cleanup (the two dashboards, hardcoded "Local Studio"). Separate task, no issue yet. |
| Feature | Manufacturers & sourcing: a directory plus per-product Quote Requests with Quotes. Samples & Approvals comes later. |
| Terms | Manufacturer = the garment factory; Supplier = fabric or trim vendor. The product-level "supplier" is renamed Manufacturer. `Material.supplier` keeps its meaning. Mills and trim vendors don't go in the directory. |
| Directory | Lives at Manufacturers & Quotes → Manufacturers (`/modules/manufacturers/manufacturers`), not as a library collection. Fields: name (required), contact person, email, phone, country/city, product categories, typical MOQ, notes. List and card views, search, filters by country and category. Certifications, payment terms and ratings are deferred. |
| Quote Request | One per product per manufacturer. States Draft → Sent → Quoted → Chosen / Declined, all changed by hand. Declined covers both sides saying no. |
| Share link | Keep the single share link per product. "Sent" only records a date. Per-manufacturer links are deferred until the app is hosted. |
| Quote | Fields: unit price and currency, MOQ, production lead time, sample cost, sample lead time, date received, notes, optional attachment. One price for the whole product; no tiers by quantity, size or colorway. |
| Migration | Each distinct non-empty `Product.supplier` (trimmed, case-insensitive) becomes a Manufacturer linked to its products. No Quote Requests are created. |

| Choosing | Marking a Quote Request Chosen sets the product's manufacturer. At most one Chosen per product; choosing another moves the previous one back to Quoted. Other requests are left alone. The stage never changes automatically; if it's earlier than Sampling, the app offers "Move to Sampling?". |
| Direct manufacturer | The product form's free-text supplier becomes a Manufacturer picker (choose, or create inline). Quote Requests are optional. |
| Sourcing panel | Quote Requests are managed in a Sourcing panel in the product editor. It is not a tech pack section: never in the share link, PDF, exclusion toggles or named versions. |
| Confidentiality | The share link and PDF never show the manufacturer, whatever the exclusion settings. |
| Sent tracking | Record the sent date. If the tech pack changed after a request was sent, the panel shows "Tech pack changed since sent". No automatic versions. |
| Deleting | A manufacturer used by a product or Quote Request can't be deleted; the app shows what uses it. Unused ones are deleted after confirmation. No archive state. |
| Module pages | Overview (counts by state + links), Manufacturers (directory), Quote Requests (list across products, filters by state, manufacturer, product), Quote Comparison (one product's quotes side by side, cheapest price and shortest lead time highlighted, Choose from there; mixed currencies are flagged and not ranked). Dashboard stat "Products with a supplier" becomes "Products with a manufacturer". |

| Outside the tech pack | The manufacturer is product-level data like `shareToken`: not in versions, unchanged by restore. Old versions' `supplier` values are ignored on restore. Sourcing changes don't count as tech pack changes. See [ADR 0001](../adr/0001-sourcing-outside-tech-pack.md). |
| Archive / delete | Archiving a product keeps its Quote Requests, hidden on the Quote Requests page unless "Show archived products" is on. Deleting a product deletes its Quote Requests; the confirmation says how many. |

## Acceptance criteria

1. Manufacturers: create, edit and delete them, with search and filters by country and category. Deleting one that's in use is blocked, and the app lists what uses it.
2. Existing `supplier` values are migrated once: one Manufacturer per distinct name (trimmed, case-insensitive), linked to its products, with no Quote Requests.
3. The product form's Manufacturer picker can choose an existing manufacturer or create one inline.
4. Sourcing panel: add a Quote Request (at most one per manufacturer for each product). States follow Draft → Sent → Quoted → Chosen / Declined, and Sent records a date. A Quote can be entered with all its fields, including an attachment.
5. Choosing a request sets the product's manufacturer, and only one request per product is Chosen at a time. The stage only changes after the founder confirms "Move to Sampling?".
6. "Tech pack changed since sent" appears after a tech pack edit and not after a sourcing change.
7. The share API response and the print view contain no manufacturer, Quote or Quote Request data, whatever the exclusion settings. Restoring a version leaves the manufacturer unchanged.
8. Overview, Manufacturers, Quote Requests and Quote Comparison work. Comparison highlights the cheapest price and shortest lead time and flags mixed currencies instead of ranking them. The dashboard stat reads "Products with a manufacturer".
9. Archived and deleted products behave as in "Archive / delete". The workspace backup includes manufacturers and Quote Requests.

## Verification

- `npm run check` and `npm test` pass, with new backend tests for criteria 1, 2, 4, 5, 7 and 9.
- Claude Code reviews the diff from Codex.
- Browser walkthrough on an isolated data directory: migration, adding a request, entering a quote, comparing, choosing, and checking that the share link is clean.

## Implementation tasks

Delegated to Codex one at a time; each is reviewed and its gates re-run before the next starts.

1. **Foundation** — Manufacturer model and API (including blocked delete), `manufacturerId` outside the tech pack snapshot, one-time migration, clean share/print/restore, basic Manufacturer select in the product form, dashboard stat rename. Status: done, commit `d7f2b47`.
2. **Directory and picker** — Manufacturers page (list/cards, search, country/category filters, edit, delete showing what uses it) and inline create in the product form's picker. Status: done, commit `52f41ac`.
3. **Quote Requests and Sourcing panel** — criteria 4–6. Quote Requests are stored per workspace, not on the product. A product-level `techPackUpdatedAt` drives "changed since sent"; it ignores comments, archiving and stage (stage is workflow status, not specification). Product deletion via the API cascades to its Quote Requests; a manufacturer used by a Quote Request can't be deleted. Status: done, commit `30bf148`.
4. **Module pages and cleanup** — criteria 8–9. The app has no product delete button (products are archived), so the "delete confirmation shows the count" part of criterion 9 doesn't apply; the API cascade from task 3 covers the data side. Status: done.

## Deferred

Mobile layouts and mobile testing (desktop only from task 3 on, decided 2026-10-14).
A product delete action in the UI.
Samples & Approvals; per-manufacturer share links (after hosting); quotes priced by quantity, size or colorway; certifications, payment terms and ratings on manufacturers; Suppliers (mills, trim vendors) as directory records; dashboard cleanup.
