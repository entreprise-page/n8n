# @entreprise-page/n8n-nodes-entreprise

[n8n](https://n8n.io) nodes for the [entreprise.page API](https://api.entreprise.page/v1): French companies (SIREN) and establishments (SIRET), company search, follow-up lists, and a trigger that starts a workflow when a followed company changes.

## Installation

In n8n: **Settings → Community Nodes → Install**, then enter `@entreprise-page/n8n-nodes-entreprise`.

On a self-hosted instance, it can also be installed in the custom nodes folder:

```bash
cd ~/.n8n/nodes
npm install @entreprise-page/n8n-nodes-entreprise
```

## Credentials

Create an **Entreprise.page API** credential with the API key of your organisation, shown in your entreprise.page account. The credential test calls `GET /quota`, which does not use your quota.

Change **Base URL** only to target another environment of the API.

## Entreprise.page node

| Resource       | Operations                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| Company        | Get (by SIREN), Get Establishments, Get Legal Notices (BODACC), Search                               |
| Establishment  | Get (by SIRET)                                                                                       |
| Follow-Up List | Get Many, Create, Delete                                                                             |
| Follow-Up      | Follow (add to a list), Remove From List, Unfollow (from every list), Get Many (companies of a list) |

Getting a company, its establishments and searching use your organisation's quota, like the same API calls. The node can be used as a tool by an AI agent.

## Entreprise.page Trigger node

Starts the workflow when a company of a follow-up list changes: company or establishment closed, new establishment, name, head office, main activity, legal form or diffusion changed, or new executive.

- When the workflow is activated, the node subscribes its webhook URL to the chosen list. When it is deactivated, it unsubscribes. The list's own alert (email, webhook) is left unchanged.
- Each call carries the subscription token in the `X-Entreprise-Page-Auth` header. The node rejects (401) any call without it.
- A list accepts at most 10 subscriptions. "Listen for test event" creates a temporary one, removed when listening stops.

Each item is the event sent by the API:

```json
{
	"evenement": "fermeture_entreprise",
	"date": "2026-11-04T10:00:00Z",
	"siren": "443061841",
	"liste": { "id": 1, "nom": "Prospects" },
	"changement": { "ancienne_valeur": "A", "nouvelle_valeur": "C" },
	"entreprise": { "siren": "443061841", "denomination": "GOOGLE FRANCE" }
}
```

Events on an establishment also include `siret` and `etablissement`.

### Self-hosted n8n

The API only calls **https** URLs reachable from the Internet: an instance served over `http://`, or on a private network, is refused when subscribing. Behind an HTTPS reverse proxy, tell n8n its public URL so that the webhook URL is correct:

```bash
WEBHOOK_URL=https://n8n.example.com/
N8N_PROXY_HOPS=1
```

To try it out, a tunnel (`cloudflared tunnel`, ngrok, or `n8n start --tunnel`) gives a public https URL to set in `WEBHOOK_URL`.

## Development

This repository is a read-only mirror: the package is developed in the entreprise.page repository and synchronised here on every change.

## License

MIT
