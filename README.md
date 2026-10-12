# Techstyles — independent local dashboard

Reconstruction of the **application at app.techstyles.io**, not the marketing website. All application code, dependencies, configuration, assets and runtime data live in this directory. No WinningHunter route, component, API or configuration is used.

## Run

```sh
cd techstyles
npm install
npm run dev
```

Open http://localhost:3100. The start page is the dashboard. `npm run build && npm start` runs the production build on the same port.

## Available workflows

- Dashboard with actual product counts and recent products.
- Product library: search, category/project/supplier/stage filters, sorting, grid/list, archived products.
- Create/edit tech packs; image uploads and reusable libraries.
- Technical sketch, per-colorway filled images and mockup views.
- Canvas: raster panel fill, pan/zoom, notes/callouts, measurement lines with manually supplied values, positioned text, artwork placement, bitmap undo/redo, PNG export and saving.
- Colorways, editable bill of materials, graded measurements with cm/in units, construction instructions, labels, attachments and sample requests.
- Section comments; named version snapshots and restore with an automatic backup.
- Read-only live supplier links, server-side excluded-section redaction and link revocation.
- PDF through the dedicated print layout and browser **Print / Save PDF** dialog.
- Independent library CRUD for projects, sketches, materials, artwork, colors, size charts and attachments.
- Workspace JSON backup; uploaded files must be backed up with `data/uploads`.

## Brand Profile

Open **Concept & Audience → Brand Profile**. Start from a public HTTPS website, upload brand files, or enter details manually. Imported suggestions show their sources and are unchecked until selected. Applying suggestions only updates the draft. Review the fields, check the confirmation box and explicitly save.

Supported imports: TXT, Markdown, JSON, text PDFs (first 20 pages), PNG, JPEG and WebP. Up to five files, 10 MB each, 25 MB total. Only directly observed metadata, labeled text and CSS styles become suggestions; missing information stays blank. No OCR, DOCX parsing or JavaScript browser rendering is performed. No AI key is required for these imports.

The profile lives once in the existing workspace store, with revision checks to protect against stale edits. Design & Tech Packs and Marketing read the same saved profile. The existing AI dialog can optionally include its saved text, colors and font names. Logo and reference-image assets are centrally available; they are not automatically added as extra AI image references. Workspace backups include the profile.

Research, import limits and validation: `docs/research/brand-profile.md`.

## AI

Copy `.env.example` to `.env.local`, provide `OPENAI_API_KEY`, then restart. The server can generate sketches, artwork and labels, or create reference-based mockups. No API key is put into browser code. No billed generation was performed in verification; tests use mocked responses. Without a key the UI displays a configuration error, not a fake generated result. Provider model can be changed with `OPENAI_IMAGE_MODEL`.

## Storage and sharing

`data/workspace.json` is written atomically. Images/PDFs are in `data/uploads`. The files stay in this project directory. Run commands from this directory.

This is a local single-workspace application, without user authentication, team permissions or hosted cloud storage. A localhost share link works on the same computer. Real external manufacturer access requires a deployed server, authentication for the editor, and a persistent production data store. It is not deployed publicly.

## Checks

```sh
npm run check
npm test
```

Research and visual evidence: `docs/research/`. Backend contracts: `docs/backend.md`.

## Known differences from Techstyles

The core working flows are reconstructed. The full vector canvas engine (patterns, washes, stripes, seam brushes, editable vector shape system, per-view AI editing), automatic garment grading, all 21 templates and 32 proprietary size charts, spreadsheet import/export, section drag-reordering, original subscription/account system and simultaneous multi-user collaboration are not reproduced. Canvas undo/redo currently covers bitmap changes, not note history. Raster uploads are PNG/JPEG/WebP and attachments additionally support PDF. PDF export uses the browser dialog rather than the original one-click server generator. Some library dialogs are inferred from the observed common shell. The original workspace's personal uploaded garments were not copied; the demo uses public reference assets.
