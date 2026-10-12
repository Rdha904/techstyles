# Dashboard library implementation

This document covers only the independent dashboard application in `techstyles/`. No WinningHunter routes, assets or components are reused or modified.

## Evidence and approximation

The parent inspection supplied the Materials page reference: warm pale page background (`#fbfaf9`), Figtree typography, restrained blue primary action (`#4663bc`), All Materials and BOM Templates tabs, search and supplier/type/unit filters, list/grid controls, and a white rounded bordered table with Code, Name, Type, Composition, GSM, Supplier and Cost columns. The implementation follows that structure and palette.

The remaining library collections use the same application design system. Their descriptions, empty states, generic forms, card layout and upload interactions are local reconstructions. They are not independently verified copies of every corresponding original dialog. Locally seeded data and descriptions are illustrative workspace content. No claim of pixel-perfect reproduction is made for unobserved states.

## Routes and ownership

| Route | Collection | Main capability |
| --- | --- | --- |
| `/projects` | `projects` | Named collection records with descriptions |
| `/sketches` | `sketches` | Technical drawing uploads |
| `/materials` | `materials` | Material details, filtering and template records |
| `/artworks` | `artworks` | Artwork uploads |
| `/colors` | `colors` | HEX color swatches and Pantone references |
| `/size-charts` | `size-charts` | Size headers and measurement rows |
| `/attachments` | `attachments` | Image/PDF references |

`src/components/sites/techstyles/libraries.tsx` exports `LibraryPage({ collection })`. `libraries.css` scopes its styles. The parent workspace owns navigation and the app header. Rendering with `key={collection}` resets filters and modal state when navigating between collections.

## Actual interactions

- Library records load from `GET /api/libraries` and persist through POST, PATCH and DELETE endpoints. Errors remain visible instead of claiming successful persistence.
- All collections provide create, edit, delete with confirmation, text search, list/grid switching, empty results, and save/delete notifications.
- Materials support material code, type, composition, GSM, supplier, unit cost and unit of measure. Supplier/type/unit filters derive options from saved records. Template records use `data.isTemplate`; tabs separate them from normal materials.
- Colors support an interactive color picker, validated six-digit HEX values and freeform Pantone reference.
- Size charts accept comma-separated size labels and one measurement per line, such as `Chest: 48, 50, 52`. A table previews the entered measurements. Units are saved as `cm` or `in`.
- Sketches, artworks, materials and attachments upload PNG, JPG, WebP or PDF files through `/api/uploads`. The backend enforces the 10 MB limit. Asset URLs and filenames are saved in record data; library records expose a link to open uploaded files.
- Modal dismissal works through close, cancel, Escape and backdrop click. Save and close controls are disabled while a save/upload is underway.

## Deliberate limits

Projects are library records; they do not automatically organize or reassign products. Product forms currently maintain their project name separately. BOM templates are flagged reusable material records, not editable sets of multiple materials. Size charts use structured text entry rather than a spreadsheet editor and do not automatically grade measurements. Uploaded PDFs can be stored in sketch/artwork collections but do not render as image thumbnails; drawing operations require a raster image. Multi-user permissions, external supplier synchronization and remote account storage are not implemented by the library component.

Library creation alone does not attach a record to a product. Product editor library pickers perform that step. Those pickers and canvas behavior are owned by `product-editor.tsx`.

## Verification

The library component passed ESLint after its initial implementation. TypeScript reported no library errors; the initial check was blocked only by the then-unfinished parent workspace module. Full production checks and rendered desktop/mobile verification belong to the integrated application verification recorded by the parent task.
