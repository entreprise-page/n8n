# Changelog

## 0.0.5

- The trigger's 401 response body is now `{ "error": "Invalid token" }`.
- Code comments and tests are in English.
- The version in `package.json` is now the published version.

## 0.0.4

- Fix: identifiers (SIREN, SIRET, list ID) were missing from request URLs on n8n versions before 2.46.1, which lack `toPathSegment`. Tested on n8n 1.104.0.

## 0.0.1

- `Entreprise.page API` credential (API key, tested on `GET /quota`).
- `Entreprise.page` node: companies, establishments, follow-up lists and follow-ups.
- `Entreprise.page Trigger` node: events of the companies of a follow-up list, through a webhook subscription.
