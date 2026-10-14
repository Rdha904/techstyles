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

## Populated editor observed + layout transfer — 2026-10-13

The signed-in Pomelli account already had a Business Profile ("Teletext"), so the populated editor at `/bdna` — previously an open item — was observed directly. Nothing was created, no field was edited and nothing was saved; only the existing profile was viewed. Reference captures live in `screenshots/`: `pomelli-overview-top.png`, `pomelli-overview-colors-values.png`, `pomelli-overview-aesthetic-tone.png`, `pomelli-business-details.png`, `pomelli-card-edit-modal.png` and the clean walkthrough `pomelli-business-profile-walkthrough.gif`. The onboarding routes (`/onboarding`) redirect straight back to the home once a profile exists, so the website / "No website yet?" / scratch / template entry screens were not re-captured this session; they stay documented from the earlier sessions above and our local flow already implements them.

Observed Pomelli editor (dark theme, olive accent — not copied):
- Centered serif title "Your Business Profile" + one-line subtitle.
- Full-width segmented tabs: **Brand Overview** / **Business Details**.
- Brand Overview is a card canvas alternating full-width and two-column cards: name + URL (full); logo + typography with a large "Aa" specimen (two-col); **colours as circular swatches with the hex centred underneath** (full); tagline + brand values as pills (two-col); brand aesthetic + tone of voice as pills (two-col); business overview paragraph (full).
- A right-hand **"Pomelli Agent"** panel (greeting, quick-action chips, message input) shows on Overview; on Business Details it is hidden and the canvas spans full width.
- A floating, centred bottom action bar: Reset · Brand Book · Create Website.
- **Business Details is a two-column grid of cards, each with a circular pencil button that opens a modal** (title + helper line + structured fields + Apply). Cards seen: Location, Phone Number, Open hours, Keywords, Social media (social-icon row), Call To Action Links, Testimonials.

Layout/flow transferred to `brand-profile.tsx` and `brand-profile.css`, keeping our light theme, Figtree, `--blue` (#4663bc) and Lucide icons, with no Google assets or text:
- Brand Overview rebuilt to the same rhythm: a **hero name card** (large name input, plus a read-only website URL line when set), logo + typography (live "Aa" specimen per font), **circular colour swatches with hex below**, brand values + tone of voice, then reference images.
- Business Details converted to **per-card pencil cards that open an edit modal** ("Apply to draft"). Applying only edits the local draft; the existing review checkbox and explicit Save still gate persistence, and editing still invalidates the review confirmation.
- The scattered indigo accents were unified to our `--blue`. The previous always-visible Business Details textareas, the `display:contents` canvas flattening and the awaiting-start skeleton were replaced; scratch now simply dims the canvas until Skip/Upload.
- Assistant panel and the save bar were kept.

Verified on localhost:3100 in Chrome at 1440px against the live saved draft: tabs switch, the hero name, logo, "Aa" specimen, circular colour swatch (hex below) and reference band render, Business Details shows the pencil cards, and the pencil opens the pre-filled edit modal (Cancel / Apply to draft). No test color was saved — the draft swatch added for the check was removed, returning the status to "Saved profile"; the stored workspace profile was not changed. No browser console errors. `npm run check` (lint, TypeScript, production build) and the 19 tests pass. The 1440px screenshot capture does not reflow with window resizing, so the responsive stacking (added for ≤950px / ≤750px) was not visually confirmed in-browser.

## Brand Book observed + editorial redesign — 2026-10-13

Pomelli's Brand Book (`/brand-book`) — previously "Unknown" in `pomelli-analysis.md` — was observed on the same signed-in account; nothing was published, downloaded or regenerated (the Publish toggle and Download PDF were left untouched). Captures in `screenshots/`: `pomelli-brandbook-cover.png`, `-overview.png`, `-logo.png`, `-typography.png`, `-colors.png`, `-voice.png`, and the clean walkthrough `pomelli-brand-book.gif`.

Observed Pomelli Brand Book (dark chrome around the document, olive accent — not copied):
- Centered serif title "Your Brand Book" + subtitle, then a document card with a publish-toggle bar on top and, at the bottom, Edit / Download PDF / Open in New Tab.
- **Full-bleed photo cover** with the brand name very large and a letter-spaced "BRAND BOOK" caption; a "made by Pomelli" chip plus download/share icons.
- **Numbered editorial pages**, each a two-column spread: a small number + title + generic intro on the left, and a large showcase on the right — 01 Brand Overview (overview text + big tagline quote), 02 Brand Logo (logotype + "Logo Clear Space" diagram), 03 Typography ("PRIMARY TYPEFACE" + big face name + alphabet), 04 Color Palette (large named swatches), 05 Brand Voice (values quote + aesthetic / tone cards). Pages alternate white and light-grey. A "made by Pomelli / Report legal issue" footer closes the document.

Transferred to `brand-book.tsx` / `brand-book.css` (light theme, Figtree, `--blue`, Lucide; no Google assets, chips or text):
- The shared `BrandBookDocument` (editor, print and published views) is now **numbered editorial pages** via a CSS counter; each `Chapter` is a two-column spread — number + title + a short generic category intro on the left, showcase on the right — with alternating page backgrounds.
- Cover centred, with the brand name large and a letter-spaced "Brand Book" caption beneath it.
- Brand values and Tone of voice render as large display quotes; Typography shows a "Primary / Secondary typeface" eyebrow + big face name + alphabet; colour swatches are larger blocks with HEX / RGB captions. Missing fields still show "Not defined yet" with a link to the profile, and no boilerplate brand text is generated (intros describe the category, not the brand).
- The two stray purple accents were unified to our blue. Two-column spreads collapse to one column on small screens and in print.

Verified on localhost:3100 in Chrome at 1440px against the saved profile (name, positioning, values, audience, tone, logo, font "Georgia", no colours): centred cover, chapters 01–08 numbered with intros and alternating backgrounds, values/tone as big quotes, the "Georgia" typeface specimen, and graceful "Not defined yet" states for the empty colour and imagery pages. No console errors; the print route and brand-book API return 200. Running `next build` while the dev server was live had clobbered its `.next` cache and served stale output, so the dev server was restarted clean before this pass. `npm run lint`, `npm run typecheck`, `npm run build` and the 19 tests pass. Nothing in the workspace was published or changed.
