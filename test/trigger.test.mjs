// Tests du trigger sur le build (dist/), avec un contexte n8n simulé : on
// vérifie les appels à l'API et le contrôle du token, pas l'interface.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { beforeEach, describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const {
	EntreprisePageTrigger,
} = require('../dist/nodes/EntreprisePageTrigger/EntreprisePageTrigger.node.js');

const URL_WEBHOOK = 'https://n8n.exemple.fr/webhook/3f2a/webhook';

function contexte({ reponses = {}, parametres = {}, entetes = {}, corps = {} } = {}) {
	const staticData = {};
	const requetes = [];
	const reponse = { statut: 200 };

	const ctx = {
		staticData,
		requetes,
		reponse,
		getCredentials: async () => ({ apiKey: 'cle', baseUrl: 'https://api.entreprise.page/v1/' }),
		getNode: () => ({
			name: 'Entreprise.page Trigger',
			type: 'entreprisePageTrigger',
			typeVersion: 1,
		}),
		getNodeParameter: (nom) => parametres[nom],
		getNodeWebhookUrl: () => URL_WEBHOOK,
		getWorkflowStaticData: () => staticData,
		getHeaderData: () => entetes,
		getBodyData: () => corps,
		getResponseObject: () => ({
			status(code) {
				reponse.statut = code;
				return this;
			},
			json(contenu) {
				reponse.corps = contenu;
			},
		}),
		helpers: {
			returnJsonArray: (donnees) => [{ json: donnees }],
			async httpRequestWithAuthentication(credential, options) {
				requetes.push({ credential, ...options });
				const resultat = reponses[`${options.method} ${options.url}`];
				if (resultat instanceof Error) {
					throw resultat;
				}
				return resultat;
			},
		},
	};

	return ctx;
}

const trigger = new EntreprisePageTrigger();
const hooks = trigger.webhookMethods.default;

describe('abonnement du trigger', () => {
	let ctx;

	beforeEach(() => {
		ctx = contexte({
			parametres: { listeId: '2', evenements: ['fermeture_entreprise'] },
			reponses: {
				'POST https://api.entreprise.page/v1/suivi/abonnement': {
					id: 12,
					url: URL_WEBHOOK,
					token: 'secret',
				},
			},
		});
	});

	it("s'abonne à la liste avec l'url du webhook et garde l'id et le token", async () => {
		assert.equal(await hooks.create.call(ctx), true);

		assert.deepEqual(ctx.requetes, [
			{
				credential: 'entreprisePageApi',
				method: 'POST',
				url: 'https://api.entreprise.page/v1/suivi/abonnement',
				body: { liste_id: 2, url: URL_WEBHOOK, evenements: ['fermeture_entreprise'] },
				json: true,
			},
		]);
		assert.deepEqual(ctx.staticData, { abonnementId: 12, token: 'secret' });
	});

	it("vérifie que l'abonnement existe encore pour la même url", async () => {
		assert.equal(await hooks.checkExists.call(ctx), false, 'Sans abonnement enregistré');
		assert.equal(ctx.requetes.length, 0);

		Object.assign(ctx.staticData, { abonnementId: 12, token: 'secret' });
		const liste = 'GET https://api.entreprise.page/v1/suivi/abonnement';

		ctx.helpers.httpRequestWithAuthentication = async () => [{ id: 12, url: URL_WEBHOOK }];
		assert.equal(await hooks.checkExists.call(ctx), true);

		ctx.helpers.httpRequestWithAuthentication = async () => [{ id: 13, url: URL_WEBHOOK }];
		assert.equal(await hooks.checkExists.call(ctx), false, `${liste} ne le connaît plus`);
		assert.deepEqual(ctx.staticData, {});
	});

	it("se désabonne, même si l'abonnement a déjà disparu", async () => {
		Object.assign(ctx.staticData, { abonnementId: 12, token: 'secret' });
		ctx.helpers.httpRequestWithAuthentication = async (_, options) => {
			ctx.requetes.push(options);
			throw Object.assign(new Error('Not Found'), { httpCode: '404', response: { status: 404 } });
		};

		assert.equal(await hooks.delete.call(ctx), true);
		assert.equal(ctx.requetes[0].method, 'DELETE');
		assert.equal(ctx.requetes[0].url, 'https://api.entreprise.page/v1/suivi/abonnement/12');
		assert.deepEqual(ctx.staticData, {});
	});
});

describe('réception des événements', () => {
	const evenement = {
		evenement: 'fermeture_entreprise',
		siren: '443061841',
		liste: { id: 2, nom: 'Clients' },
	};

	it("déclenche le workflow avec l'événement reçu", async () => {
		const ctx = contexte({ entetes: { 'x-entreprise-page-auth': 'secret' }, corps: evenement });
		ctx.staticData.token = 'secret';

		assert.deepEqual(await trigger.webhook.call(ctx), { workflowData: [[{ json: evenement }]] });
	});

	for (const [cas, entetes] of [
		['sans token', {}],
		['avec un autre token', { 'x-entreprise-page-auth': 'secrez' }],
		['avec un token plus long', { 'x-entreprise-page-auth': 'secret-' }],
	]) {
		it(`refuse un appel ${cas}`, async () => {
			const ctx = contexte({ entetes, corps: evenement });
			ctx.staticData.token = 'secret';

			assert.deepEqual(await trigger.webhook.call(ctx), { noWebhookResponse: true });
			assert.equal(ctx.reponse.statut, 401);
		});
	}
});
