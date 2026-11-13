# Changelog

## Unreleased

- Fix: identifiers (SIREN, SIRET, list ID) were missing from request URLs on n8n versions before 2.46.1, which lack `toPathSegment`. Tested on n8n 1.104.0.
- `Entreprise.page API` credential (API key, tested on `GET /quota`).
- `Entreprise.page` node: companies, establishments, follow-up lists and follow-ups.
- `Entreprise.page Trigger` node: events of the companies of a follow-up list, through a webhook subscription.
