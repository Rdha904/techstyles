# Techstyles is a hosted product for many brands, run locally for now

Techstyles runs today as a local app for one founder: no sign-in, one `default` Workspace, a JSON file store. That is the current stage, not the product's scope. The goal is a hosted product where any fashion brand Founder signs up and gets their own Workspace with isolated data, and BARCA is the first real-world test brand. We build locally first so the tech pack and sourcing workflow can be proven on real products before paying for hosting, sign-in and isolation. We keep the code ready for many brands, so the move to hosting does not mean a rewrite.

## Considered Options

- **A local tool for one founder only.** Rejected: Techstyles is meant for founders in general, not just BARCA.
- **Hosted, but for one founder.** Rejected as the end state: it would solve sharing links but not the product's purpose.

## Consequences

- **Pilot first:** BARCA uses the local app. The initial release is the first hosted one: one Founder per Workspace, desktop only (1440px), light theme.
- **Workspace scoping applies now:** every feature is scoped by Workspace and reads and writes only through `WorkspaceRepository` and `FileStorage`. Nothing may assume a single brand, and anything that only works with a hosted server is marked as such.
- **Access gate:** no external user, founder or manufacturer, gets access before sign-in, authorization on every route and verified cross-workspace data isolation are complete. Share tokens do not replace that protection (`docs/backend.md`).
- **When hosting starts:** hosting comes before any second brand uses the app, or earlier if BARCA needs live manufacturer links.
- **Manufacturers:** they get no accounts. They receive read-only, revocable tech pack links, one per Quote Request; ADR 0001 still applies to those links.
- **Deferred past the initial release:** teams within a Workspace, one person owning several Workspaces, manufacturer accounts, mobile layouts and dark theme.
- **Integrations:** those that need OAuth redirects or webhooks, such as each brand connecting its own Shopify, only work once hosted.
