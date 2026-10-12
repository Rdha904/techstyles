# Brand Profile research and implementation

Inspected 11 October 2026: https://labs.google.com/u/0/pomelli/bdna and Google's official help https://support.google.com/labs/answer/17090488?hl=en-GB .

## Observed versus documented
The authenticated Pomelli entry showed a Business Profile onboarding flow: website entry or "No website yet?", followed by "From scratch" with file uploads or curated templates. No new Pomelli profile was submitted or generated. The populated editor was not accessible without creating one. Official Google help describes an editable identity including fonts, colors, values and images, review before use, and reuse in campaigns and photoshoots. The implementation adapts that concept, not Pomelli's visual design or Google Business Profile integration.

## Existing system reused
The existing application had no brand model or importer. Brand Profile extends the existing workspace.json store, atomic transaction queue, API error wrapper, image upload storage, application navigation, dashboard and image-generation dialog. It does not create a duplicate colors library or separate marketing profile. Canonical route: /modules/concept/brand-profile. Marketing and Design link to that same editor and read /api/brand-profile.

## Import and review
HTTPS website import reads the supplied HTML, up to three same-origin CSS files and six raster image candidates. It uses actual metadata, explicitly labeled headings, CSS color declarations and font-family declarations. Content is not executed. Unknown strategic information stays empty. Assets are copied into existing local upload storage. Private networks, credentialed URLs, non-HTTPS addresses, unsafe redirects and large responses are rejected; DNS is checked and pinned per request.

Files: TXT, Markdown, JSON, text PDFs (first 20 pages), PNG, JPEG and WebP; five files maximum, 10 MB each, 25 MB combined. Image uploads are visual candidates, not OCR or semantic brand analysis. DOCX, scanned PDF OCR, inline SVG and JavaScript-rendered websites are not supported. Label text like "Brand name:", "Target audience:", "Brand values:" and "Tone of voice:" yields attributable suggestions. Unlabelled narrative requires manual entry. JSON accepts the central profile's textual fields, colors and fonts.

Suggestions are initially unchecked, with field-level source and evidence. Users may choose a candidate image as a logo or reference. Applying choices only edits a local draft; a review checkbox and explicit Save are required to persist. Incomplete fields remain blank. Revision checking prevents stale tabs from overwriting newer saved profiles. Edits invalidate the review checkbox; stale imported evidence is removed on save.

## Shared use
Dashboard and Marketing show the saved profile. The existing image-generation dialog offers an explicit opt-in to include saved textual brand context, color codes and font names in its existing provider request. Logo/reference images remain centrally available but are not automatically passed as multiple image-generation references. Marketing campaign generation remains outside this change. Workspace JSON backup includes the profile; local assets still require backing up data/uploads.

## Checks
Focused tests cover legacy store compatibility, review requirement, persistence, revision conflicts, validation, evidence filtering, deterministic HTML/CSS/text/JSON extraction, PDF parsing, unsafe URLs and saved-brand generation context. Existing product/upload/share tests remain in place. No paid AI generation or Pomelli profile generation is used for validation.

Final validation: lint, TypeScript, production build and 13 tests passed. Interactive browser QA was attempted on an isolated data directory at localhost:3102, but browser access was denied by the permission gate. No visual pass or end-to-end browser success is claimed. The isolated preview was stopped. The actual workspace was not populated with QA profile data.

## Follow-up browser verification on port 3100
After the user corrected the port, the page was verified in Chrome at 1440px width with no horizontal overflow or browser console errors. The manual-entry button focuses the name field. Saving remains disabled until a name and explicit review confirmation are present; editing invalidates confirmation. Design and Marketing both link to the same central profile. No profile was saved or existing workspace data changed. The file upload attempt was separately denied by browser permissions, so end-to-end import review and save remain covered by automated tests, not a completed browser run. Screenshot: screenshots/brand-profile-desktop.jpg.

## Guided setup refinement
New profiles now begin with a website-only step. "No website yet?" reveals From scratch and From template. From scratch offers file upload or manual continuation. Templates supply optional palette, font and tone suggestions through the existing unchecked review screen; they do not invent brand facts. The editor appears after manual continuation or applying selected suggestions. Saved profiles open directly in the editor, with an Import more details action. Browser checks covered both setup branches, template review/discard and return navigation without saving test data.

## Scratch workspace — 2026-10-12

Observed Pomelli `/onboarding` → From scratch → `/review` in the signed-in Chrome tab. The review page exposes Brand Overview / Business Details tabs, a card canvas (name, logo, fonts, colors, values, tone, etc.) and a closable right assistant. The live source remained in its loading phase; the user-provided screenshot supplies the initial upload / Skip state. No source files or brand information were submitted.

Local destination remains `/modules/concept/brand-profile`. `brand-profile.tsx` and its scoped stylesheet now reuse the central draft/editor/import endpoints for the scratch canvas. The separate scratch upload page is removed. Upload goes through existing explicit suggestion review; Skip enables manual editing. The assistant can be closed/reopened and provides guided, verbatim field entry. Overview contains visual identity, values, tone and references; Business Details contains website, description, positioning and audience. Existing application styling/navigation and supported file limits are preserved. No Pomelli branding, AI chat, audio, additional document formats, or artificial completeness percentages are claimed.

Validation: production check (lint, TypeScript, build); Chrome scratch entry, Skip, both tabs, guide answer copied to the draft, and closing the assistant. Temporary name cleared without saving. Upload UI was not exercised because of the earlier browser-upload restriction; import backend is unchanged.

## Clothing template gallery — 2026-10-12

The user-supplied Pomelli template screenshot is the reference for a three-column, two-row photographic gallery with rounded cards and centered title/category overlays. Local templates are exclusively clothing: Everyday Essentials, Urban Collective, Motion Studio, Atelier Edit, Indigo Works and Alpine Layers. Data lives in `src/lib/brand-templates.ts`. Each includes illustrative description, values, positioning, audience, tone, palette and fonts. Existing review/select/apply flow is reused; no name, website, logo or reference images are automatically inserted. These are example concepts, not verified brand claims.

Gallery-only photographs are downloaded locally (not added to a user's profile). Sources, each with `?auto=format&fit=crop&w=700&q=85`:
- essentials.jpg: https://images.unsplash.com/photo-1434389677669-e08b4cac3105
- streetwear.jpg: https://images.unsplash.com/photo-1551028719-00167b16eac5
- activewear.jpg: https://images.unsplash.com/photo-1518310383802-640c2de311b2
- premium.jpg: https://images.unsplash.com/photo-1483985988355-763728e1935b
- denim.jpg: https://images.unsplash.com/photo-1542272604-787c3835535d
- outdoor.jpg: https://images.unsplash.com/photo-1551698618-1dfe5d97d256
