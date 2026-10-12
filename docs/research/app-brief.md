# App inspection and route map

Inspected 2026-10-11 through the user's already authenticated Chrome session. Read-only source actions: dashboard, product library, add-product dialog (cancelled), user tech pack, demo Hoodie tech pack, BOM, canvas, Materials. Marketing media was inspected only as an asset source; no marketing page is in the application.

## Visual rules

Figtree body; body #fbfaf9; white 255px fixed sidebar; 44px banner; 56px app header; 24px main gutters. Blue actions around #4663bc. Thin neutral borders, 9–12px radii. Desktop dashboard: two compact stats, recent-products column twice the activity width. Product library: 4-column cards at 1440px. Editor: 288px cover/contents column and scrolling section document. Canvas: 76px tools, central 4:3 board, 300px page sidebar. Mobile source: sidebar hidden, stacked stats and panels. Adapted editor tables use horizontal scrolling.

## Route map

| Source | Local | Owner |
|---|---|---|
| app.techstyles.io/ | / (also /dashboard) | workspace.tsx |
| /products | /products | workspace.tsx |
| /products/:id | /products/:id | product-editor.tsx |
| /products/:id/canvas | same | product-editor.tsx |
| PDF export | /products/:id/print | product-editor.tsx |
| /share/:token | same | product-editor.tsx, share API |
| /projects /sketches /materials /artworks /colors /size-charts /attachments | same | libraries.tsx |
| /settings | /settings | workspace.tsx (local settings) |

Next App Router uses a root dashboard and catchall app route. The catchall displays an explicit missing-page state for unknown routes. All data APIs are independently implemented under src/app/api.

## Observed behaviors

Product create has required name/category, optional code, stage, base size, project, supplier and description. Tech packs have Overview, Sketch/Design, Colorways, BOM/Materials, Artworks, Instructions, Sizes/Measurements, Attachments, Samplings, Packaging/Labels, Version History. Source section navigation scrolls through one continuous document. Source comments attach to sections. Source export inclusion uses eye icons. Canvas tools include select, pan, measure, callout, note, fill, brush, pattern, wash, stripe, eraser, clean, artwork, text, shape. Implemented subset is documented in README.

## Assets

Public asset origins are recorded in assets.json. Figtree font files came from the stylesheet loaded by the original application (Google Fonts / fonts.gstatic.com). Branding T shape reproduced as SVG from its original 5-rectangle data SVG. Public hoodie flat, photoreal hoodie and label spec images are used. No source production JS bundle is used at runtime. Source account data and signed asset tokens were not saved.
