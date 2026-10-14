# Sourcing data stays outside the tech pack

A product's tech pack is what a manufacturer sees: it is shared by one link per product, printed to PDF, and saved in named versions. Sourcing data is what only the founder sees: the product's manufacturer, its Quote Requests and their Quotes. We keep sourcing data outside the tech pack entirely, so it is never in a snapshot, the share link, the PDF or the section-exclusion toggles, and restoring a version never changes the manufacturer. One link goes to every manufacturer being asked for a quote, so each would otherwise see competitors' names, prices or the chosen manufacturer. An exclusion toggle would make that leak one forgotten click away.

## Considered Options

- **A "Sourcing" tech pack section with an exclusion toggle.** Rejected: confidentiality would depend on a setting, and restoring a version would revert the chosen manufacturer and contradict its Chosen Quote Request.

## Consequences

- The free-text `supplier` field leaves the tech pack snapshot. Old versions that contain it ignore it when restored.
- Sourcing changes don't count as tech pack changes, so they don't trigger the "Tech pack changed since sent" warning.
- Once the app is hosted, a link per Quote Request may replace the single product link. This decision still applies: those links show the tech pack only.
