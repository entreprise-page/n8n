# @entreprise-page/n8n-nodes-entreprise-page

Nœuds [n8n](https://n8n.io) pour l'[API entreprise.page](https://api.entreprise.page/v1) : fiches d'entreprises et d'établissements, recherche, listes de suivi, et déclenchement d'un workflow quand une entreprise suivie change.

## Installation

Dans n8n : **Settings → Community Nodes → Install**, puis saisir `@entreprise-page/n8n-nodes-entreprise-page`.

En auto-hébergé, on peut aussi l'installer dans le dossier des nœuds personnalisés :

```bash
cd ~/.n8n/nodes
npm install @entreprise-page/n8n-nodes-entreprise-page
```

## Credentials

Créer un credential **Entreprise.page API** avec la clé d'API de l'organisation, visible dans le compte entreprise.page. Le bouton de test appelle `GET /quota`, qui ne consomme pas de quota.

Le champ **Base URL** ne sert qu'à viser un autre environnement de l'API.

## Nœud Entreprise.page

| Ressource      | Opérations                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| Company        | Get (par SIREN), Get Establishments, Get Legal Notices (annonces BODACC), Search                                    |
| Establishment  | Get (par SIRET)                                                                                                     |
| Follow-Up List | Get Many, Create, Delete                                                                                            |
| Follow-Up      | Follow (ajouter à une liste), Remove From List, Unfollow (de toutes les listes), Get Many (entreprises d'une liste) |

La fiche, la recherche et les établissements d'une entreprise consomment le quota de l'organisation, comme les mêmes appels à l'API. Le nœud est utilisable comme outil par un agent IA.

## Nœud Entreprise.page Trigger

Déclenche le workflow quand une entreprise d'une liste de suivi change : fermeture, nouvel établissement, changement de dénomination, de siège, d'activité, de forme juridique, de diffusion, ou nouveau dirigeant.

- À l'activation du workflow, le nœud abonne son url de webhook à la liste choisie. À la désactivation, il la désabonne. L'alerte de la liste (email, webhook) n'est pas modifiée.
- Chaque appel reçu porte le token de l'abonnement dans l'en-tête `X-Entreprise-Page-Auth`. Le nœud refuse (401) un appel sans ce token.
- Une liste accepte au plus 10 abonnements. « Listen for test event » en crée un temporaire, supprimé à la fin de l'écoute.

L'élément produit est l'événement envoyé par l'API :

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

`etablissement` (avec `siret`) s'ajoute pour les événements sur un établissement.

### Instance n8n auto-hébergée

L'API n'appelle que des url **https** joignables depuis Internet : une instance en `http://`, ou sur un réseau privé, est refusée à l'abonnement. Derrière un reverse proxy HTTPS, il faut indiquer à n8n son url publique pour que l'url du webhook soit correcte :

```bash
WEBHOOK_URL=https://n8n.mondomaine.fr/
N8N_PROXY_HOPS=1
```

Pour un essai, un tunnel (`cloudflared tunnel`, ngrok, ou `n8n start --tunnel`) donne une url https publique à mettre dans `WEBHOOK_URL`.

## Licence

MIT
