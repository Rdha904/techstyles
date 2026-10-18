# Techstyles roadmap

Agreed 2026-10-18 through the map [Plan the whole Techstyles project](https://github.com/Rdha904/techstyles/issues/4). Each section links the ticket that holds the full decision. The baseline is [`docs/research/current-state.md`](research/current-state.md); built work and its settled decisions stand.

## Vision and user

Techstyles is a hosted product for many fashion brands. Each **Founder** works in their own **Workspace** with isolated data, defines the brand, develops products as tech packs, and takes them through sourcing, samples and production. It runs locally for now. [ADR 0002](adr/0002-hosted-multi-brand-saas.md), [Product horizon](https://github.com/Rdha904/techstyles/issues/5).

- **Pilot:** BARCA uses the local app with real products. It is the primary test brand.
- **Initial release:** the first hosted release. Other founders sign up, with one Founder per Workspace. Manufacturers have no accounts; they get read-only, revocable tech pack links, one per Quote Request.

## Project-wide constraints

- Desktop only (1440px), light theme, Figma direction with two densities.
- Every feature is scoped by Workspace and reads and writes only through `WorkspaceRepository` and `FileStorage`. Nothing assumes a single brand. Anything that only works with a hosted server is marked as such.
- No external user, founder or manufacturer, gets access before sign-in, authorization on every route and verified cross-workspace data isolation are complete.
- Sourcing data (Manufacturer, Quote Requests, Quotes, Samples) stays outside the tech pack ([ADR 0001](adr/0001-sourcing-outside-tech-pack.md)).
- AI: image generation stays in tech pack images. A shared AI provider interface is built only when a second AI use is validated. Any AI feature needs a key, shows an error rather than a fake result, and goes through review before anything is saved.

## How work is prioritised

[How to prioritise](https://github.com/Rdha904/techstyles/issues/6), applied in order:

1. **Prefer integrations.** Where Shopify or its apps already do the job, connecting to them is the default. Techstyles builds an overlapping feature only when it offers clear user value, typically a link to the tech pack, a Quote or a Manufacturer.
2. **Rank by validated need, in lifecycle order.** BARCA's next real step comes first. Needs validated with other target brands (interviews, demos, tests) also count. Gaps and deferred items move up only when a validated need is blocked by them.
3. **Release only validated work.** A module goes into the initial release once BARCA has used it or it has been tested with target brands.
4. **Tie-breaks:** first, the item that adds the least new structure; then, the item that keeps the move to hosting cheaper.

## Modules

[Module positions](https://github.com/Rdha904/techstyles/issues/9). Positions are now, next, later or cut.

| Module / page | Status | Position | Build or connect | Depends on |
|---|---|---|---|---|
| Dashboard | Built | — | — | — |
| Concept & Audience: Brand Profile, Brand Book | Built | — | — | — |
| Concept & Audience: Audience & Market (with Audience segments), Moodboards | Placeholder | Later, on a validated need | Build | — |
| Design & Tech Packs | Built | Product delete before the next feature | — | — |
| Manufacturers & Quotes | Built | — | — | — |
| **Samples & Approvals** | Placeholder | **Now** | Build | Built work only |
| **Production**: Production Orders, Timeline, Milestones | Placeholder | **Next** | Build: Chosen Quote → quantities per colorway × size, expected date | Samples & Approvals |
| Production: Quality Checks (moved from Quality & Inventory) | Placeholder | Later | Build: received units checked against the tech pack and the Manufacturer | Production Orders |
| Inventory, Stock Movements | Placeholder | Later | Connect: Shopify stock states | Store & Sales |
| Store & Sales: Product Listings | Placeholder | Later | Connect: push tech pack data and the chosen cost to Shopify; needs retail price, a SKU for each variant, weight | Hosting, for other brands |
| Shipping & Feedback: Customer Feedback | Placeholder | Later | Build: return reasons and reviews traced back to sizes, materials, Manufacturer | Store & Sales |
| Marketing: Campaigns, Content Calendar | Placeholder | Later | Connect: Klaviyo, Buffer | — |
| Quality & Inventory sidebar entry; Orders; Sales Analytics; Brand Website; Shipments; Returns; Marketing Assets; Marketing's Brand Profile page | Placeholder | **Cut** | Left to Shopify and its apps, or duplicates | — |

### Hosting milestone

- **Contents:** sign-in, authorization on every route, verified cross-workspace isolation, per-Quote-Request links.
- **Default timing:** after Samples & Approvals and Production Orders have been used in the Pilot.
- **Initial release would cover:** Concept & Audience, Design & Tech Packs, Manufacturers & Quotes, Samples & Approvals, Production.
- **Earlier if needed:** hosting can come during Samples & Approvals if BARCA needs to share reviews with a Manufacturer.
- **After hosting:** Store & Sales, Customer Feedback and the Marketing integrations (each brand connecting its own Shopify needs OAuth).

## Per-feature planning process

[Planning process per feature](https://github.com/Rdha904/techstyles/issues/8):

1. `/grill-with-docs` settles the decisions and updates the glossary and ADRs.
2. `/to-spec` writes the spec.
3. `/to-tickets` splits it into tickets. For a small feature, skip this step: the spec is one ticket.
4. Codex implements each ticket test-first.
5. Claude reviews with `/code-review`.
6. `/pr` writes the PR description.
7. The founder merges.

Rules:
- Specs and tickets live only in GitHub Issues. `docs/plans/` gets no new files and stays as history.
- Each feature gets one branch with a draft PR. Only the founder merges to `main`.
- After the merge, BARCA uses the feature in the Pilot. Problems become `needs-triage` issues. A feature is validated once used.

## Deferred items

[Deferred items](https://github.com/Rdha904/techstyles/issues/10).

| Item | Decision |
|---|---|
| Product delete action | Keep: done before Samples & Approvals, [#18](https://github.com/Rdha904/techstyles/issues/18) |
| Workspace activity beyond product updates | Keep: each new feature adds its events |
| Per-manufacturer share links | Keep: hosting milestone |
| Audience segments | Keep: Audience & Market |
| Mobile, dark theme; teams, several Workspaces per person, manufacturer accounts | Park until after the initial release |
| Quotes priced by quantity, size or colorway; automatic grading | Park; reconsider with Production Orders |
| Manufacturer certifications, payment terms, ratings; Suppliers as directory records; profile import improvements; canvas and tech pack gaps (vector engine, templates, proprietary size charts, spreadsheet import/export, section reordering, note undo); AI field assistant and provider interface | Park until a validated need |
| Separate Workspace name; Brand Website; original subscription/account system and multi-user editing | Drop |

## Next feature: Samples & Approvals

Rough scope from [Next feature and rough scope](https://github.com/Rdha904/techstyles/issues/11). The full spec follows through `/grill-with-docs` → `/to-spec`.

**Goal:** the founder asks a Manufacturer for a **Sample**, tracks it until it arrives, and reviews it against the tech pack. Then they approve it, or ask for corrections, which starts the next round. An approved Sample means the product is ready for production with that Manufacturer.

**In scope:**
- **Sample:** one round, linked to one Quote Request (Quoted or Chosen), numbered per Quote Request. States are roughly Requested → Received → Approved or Corrections requested. Samples are sourcing data and stay outside the tech pack.
- **Samplings section:** it stays in the tech pack as the description of what samples to make (size, color, quantity). Its free-text status field goes away.
- **Corrections:** reviews are seen by the founder only. Corrections reach the Manufacturer as a printed or PDF **Correction Sheet**, with no live link.
- **Product stage:** stays manual. The app offers "Move to Sampling?" when the first Sample is requested and "Move to Production?" when a Sample is approved.
- **Where it lives:**
  - On the product: its Sourcing panel, under each Quote Request.
  - In the module: one Samples page across products, filtered by status and Manufacturer.
  - On the Dashboard: sample events in recent activity.

**Out of scope:**
- production orders;
- courier tracking;
- live Manufacturer links and accounts;
- sample costs beyond the Quote's;
- AI review aids;
- side-by-side comparison of samples from different Manufacturers.

**Open for the spec:**
- the exact states;
- what happens to existing sample status text;
- what goes on the Correction Sheet;
- how a review records fit, colors, materials and construction.
