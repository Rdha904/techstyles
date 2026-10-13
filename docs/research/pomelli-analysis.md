# Pomelli analysis — Concept & Audience scope

Compiled 2026-10-13. Analysis only; no code changed.

## Evidence levels

- **Observed**: seen in the signed-in Pomelli session on 2026-10-11/12 (see `brand-profile.md`, screenshots in `screenshots/`).
- **Documented**: stated in official Google sources, not observed by us.
- **Unknown**: neither observed nor documented.

The 2026-10-13 session had no browser access, so no new screenshots were taken and nothing was clicked in Pomelli.

Sources:
- Business Profile: https://support.google.com/labs/answer/17090488
- Brand Books: https://support.google.com/labs/answer/17094292
- Websites: https://support.google.com/labs/answer/17090489
- Announcement, 2026-05-19: https://blog.google/innovation-and-ai/models-and-research/google-labs/pomelli-agentic-capabilities/

## Pomelli features

| Area | Feature | Evidence |
|---|---|---|
| Profile setup | Website entry → "Continue" (analysis up to ~8 min) | Entry observed; analysis documented |
| | "No website yet?" → "From scratch" / template | Observed |
| | From scratch: file upload or Skip → `/review` with Brand Overview / Business Details tabs, card canvas, closable right assistant | Observed (live page stayed in loading state) |
| | Template gallery (3×2 photo cards) | Observed via user screenshot |
| | Google Business Profile import (one-off, no sync) | Documented |
| | Uploads: pdf, docx, pptx, txt, md, jpg, png, heic, mp3, wav; 20 files × 25 MB | Documented |
| Profile editing | Direct field editing, left side | Documented |
| | Pomelli Agent: prompt-based edits to any section; chat | Documented; agent behaviour not observed |
| | Profile fields: fonts, colors, values, images (+ tone seen in canvas) | Documented / observed |
| Brand Book | Auto-generated from the profile, no separate data entry | Documented |
| | Cover: pick, upload or generate; up to 7 images; "Edit Images" | Documented |
| | "Download PDF", "Preview in New Tab", Publish toggle + share link | Documented |
| | Section structure / layout | **Unknown** |
| Websites | "Create Website", "Regenerate", prompt-based "Edit", versions (restore/delete) | Documented |
| | Custom URL suffix, Preview, Publish toggle, share link | Documented |
| | Site type (landing/multi-page/shop), hosting domain, custom domains | **Unknown** |
| Target audience | No dedicated module documented | Documented absence |
| Catalog | Products from URL or scratch, image sync, from Photoshoot | Documented |
| Photoshoots / Campaigns | Generated product imagery and campaign content | Documented |

Brand Book and website creation do exist in Pomelli, but only the official help confirms it. We have not seen either feature ourselves.

## Mapping to Techstyles

| Pomelli | Techstyles today | Recommendation |
|---|---|---|
| Business Profile | Brand Profile (website / scratch / template, review-before-save, evidence) | Keep. Close specific gaps (below), no redesign. |
| Pomelli Agent | Guided manual assistant, no AI | Add later as AI suggestions that go through the existing review step, behind a provider interface. |
| Uploads | txt, md, json, text PDF, png, jpg, webp; 5 × 10 MB | Add DOCX (common for fashion briefs). Consider HEIC. Skip audio and pptx for now. |
| Brand Book | "Coming soon" card | **Build**: a generated view of the Brand Profile (see below). |
| Target audience | Single free-text `audience` field | **Build**: structured fashion segments stored in the same profile. |
| Websites | "Coming soon" card | **Defer.** Hosting and site generation compete with Shopify and similar tools and sit outside the tech-pack core. |
| Catalog | Products / tech packs | Do not create a catalog. Optional later: "Create product from URL". |
| Photoshoot | Image generation (mockup kind) | Already covered. Extend in Marketing. |
| Campaigns | Marketing → Campaigns placeholder | Marketing phase. Reuse profile and products. |

## Proposal

### 1. Brand Book (first)
- **No new brand data.** The book renders the saved Brand Profile: name, logo, description, values, positioning, audience, tone, colors (swatches with hex), fonts (live specimens), reference images.
- **Stored only:** `brandBook: { coverUrl, imageUrls (max 7), shareToken }` on the workspace.
- **Cover:** choose from the profile's reference images or upload. Generation only if `OPENAI_API_KEY` is set, using the existing generate route.
- **PDF export:** reuse the browser-print approach from the tech-pack export.
- **Publish:** reuse the share-token pattern (`/share/...`). Read-only and revocable.
- **Empty fields:** omitted or shown as "Not defined yet" with a link to the profile. Never filled with generated text.
- **Editing:** "Edit Brand Profile" links to the existing editor. No second editor.

### 2. Target Audience
- Extend `BrandProfile` with `audienceSegments[]`: name, age range, gender/fit focus, size range, price sensitivity, lifestyle and occasions, purchase channels, key needs.
- Keep `audience` as the summary text. Business Details shows the summary and links to Target Audience.
- The Brand Book reads the segments.
- Templates may suggest segments through the existing unchecked review flow.

### 3. Profile import improvements
- DOCX text extraction.
- Optional HEIC → reference image.
- Raise the upload limits moderately.
- Known gap: JavaScript-rendered websites are not imported.

### 4. AI assistant (after the provider abstraction)
- Chat produces field suggestions with sources.
- Suggestions go through the existing review step. Nothing is saved without confirmation.

### 5. Brand Website — deferred
- Change the card status to "Later" or keep "Coming soon".
- Revisit after pilot feedback.

## Open items needing browser access or user screenshots
- Brand Book page layout and sections.
- Website editor and a published site example.
- Pomelli Agent chat behaviour.
- Populated profile editor after generation.

## Implemented: Brand Book (2026-10-13)

Route `/modules/concept/brand-book` (component `brand-book.tsx`). The page renders the saved Brand Profile as a document: cover, about/positioning, values, audience, tone, logo on light and brand-color backgrounds, color swatches (HEX/RGB), typography samples and imagery.

- **Stored separately, workspace-scoped:** only `brandBook: {coverUrl, imageUrls ≤ 7, shareToken, updatedAt}`. Content is never duplicated or generated.
- **Missing profile fields:** the editor shows "Not defined yet" with a link to the profile. Print and published views omit those sections.
- **Without a profile:** a prompt to create the profile.
- **Images:** chosen from the profile's reference images or new uploads. No AI cover generation yet.
- **Export:** `/modules/concept/brand-book/print` uses the browser print / Save PDF workflow.
- **Publishing:** `POST`/`DELETE /api/brand-book/share`. The public page is `/share/brand-book/<token>` (API `/api/share/brand-book/<token>`) and omits import evidence, revision and token.

Font samples use the named font only when it is installed on the viewer's device.

Verified: lint, TypeScript, production build, 19 tests (4 new). Pages and API were smoke-tested over HTTP on an isolated data directory. Not verified: visual rendering in a browser (no browser access this session).

## Concept & Audience structure (2026-10-13)

Concept & Audience now follows the workflow. The pages are:
1. Brand Profile
2. Audience & Market — target audience plus competitors and price positioning
3. Moodboards — collection concept: inspiration, seasonal colors, materials, silhouettes
4. Brand Book — the shareable output

Brand Website moved to Store & Sales; it is a sales and online-presence concern, not concept. Audience & Market, Moodboards and Brand Website remain "Coming soon" until they are built. Page slugs now drop punctuation (`Audience & Market` → `audience-market`).
