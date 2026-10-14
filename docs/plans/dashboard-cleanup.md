# Dashboard & desktop UI cleanup — scope

Status: scoped 2026-10-14, ready for implementation.
Vocabulary: see `GLOSSARY.md` (Workspace, Brand Profile).

## Why

The app has two pages called "Dashboard". `/` renders the old Design & Tech Packs dashboard, while the sidebar's Dashboard link opens the newer workspace dashboard at `/modules/home/overview`. The Workspace is labelled with a hardcoded "Local Studio", and a few desktop layout issues remain from the Manufacturers & Quotes walkthrough.

## Confirmed decisions

| # | Decision |
|---|---|
| Dashboard | The workspace dashboard (`WorkspaceDashboard`) is the only dashboard and lives at `/`. The old `Dashboard` component is deleted. |
| Old dashboard content | Moves into the workspace dashboard: the Brand Profile summary card, the "in development" and "in production" counts, and recent activity shown compactly (one line per product, the latest few). The old "Recent Products" panel is dropped: "Continue working" covers it. |
| Old URLs | `/dashboard` and `/modules/home/overview` redirect to `/`. |
| Design & Tech Packs | The module opens on Products (`/products`). Its secondary navigation no longer lists "Dashboard". |
| Workspace name | The Brand Profile name, trimmed; "My workspace" when there's no profile or the name is empty. Avatar initials come from that name. |
| Where the name shows | Both sidebar footers, the product editor's "Owners" badge, and the author of new comments. Existing comments keep their stored author. |
| Support link | Removed from the sidebar for now. |
| Scope | Desktop only (1440px). Mobile is out of scope. |

## Design

- **One identity function.** `workspaceIdentity(profile: BrandProfile | null) → { name, initials }` in `src/lib` is the only place that turns a Brand Profile into a display name. The shell loads the Brand Profile once with its other data, and every consumer (sidebars, Owners badge, comment author) gets the identity from there instead of fetching or hardcoding it.
- **One dashboard summary function.** `dashboardSummary(products)` in `src/lib` returns the stat values and the recent-activity rows (active products only, newest first). `WorkspaceDashboard` renders what it returns. The counting rules get tests without a browser.
- **Routing stays in `resolveView`.** `/` maps to the workspace dashboard view there. Redirects for the old URLs use the mechanism the bundled Next.js docs (`node_modules/next/dist/docs/`) recommend for this version.

## Acceptance criteria

1. `/` shows the workspace dashboard with the Brand Profile summary, the stats (including "Products with a manufacturer", "in development" and "in production"), "Continue working", compact recent activity, and the module links.
2. `/dashboard` and `/modules/home/overview` redirect to `/`. The logo, the sidebar's Dashboard link and "Go to Dashboard" all lead to `/`.
3. Design & Tech Packs opens on `/products`, and its secondary navigation has no "Dashboard" entry. The dashboard's Design & Tech Packs link goes to `/products`.
4. "Local Studio" no longer appears anywhere in `src/`. The sidebars and Owners badge show the Workspace name, and a new comment is authored by it. With no Brand Profile, they show "My workspace".
5. The support link is gone.
6. At 1440px every page has exactly one `<h1>`, no page area scrolls sideways, and counts use correct singular/plural wording.

## Verification

- `npm run check` and `npm test` pass, with new tests for `workspaceIdentity` (name, trimming, fallback, initials) and `dashboardSummary` (counts, archived products excluded, activity order and limit).
- Claude Code reviews each Codex diff and reruns the gates.
- Browser pass at 1440px on an isolated `TECHSTYLES_DATA_DIR`: `/`, both redirects, every module overview, Products, the product editor (Owners badge and a new comment), and a workspace with no Brand Profile.

## Implementation tasks

Delegated to Codex one at a time. Each is reviewed and its gates rerun before the next starts.

1. **One dashboard at `/`.** Criteria 1–3, plus `dashboardSummary` and its tests. Status: not started.
2. **Workspace name and support link.** Criteria 4–5, plus `workspaceIdentity` and its tests. Status: not started.
3. **Desktop polish.** Criterion 6. Audit every page at 1440px and fix duplicate `<h1>`s (the shell header title and a page heading), sideways overflow and plural wording. Status: not started.

## Deferred

Mobile layouts. A separate Workspace name in Settings. Workspace-level activity beyond product updates.
