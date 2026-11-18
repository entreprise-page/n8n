// Tests of the trigger on the build (dist/), with a simulated n8n context:
// they check the API calls and the token check, not the UI.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { beforeEach, describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const {
	EntreprisePageTrigger,
} = require('../dist/nodes/EntreprisePageTrigger/EntreprisePageTrigger.node.js');

const URL_WEBHOOK = 'https://n8n.example.com/webhook/3f2a/webhook';

function contexte({ reponses = {}, parametres = {}, entetes = {}, corps = {} } = {}) {
	const staticData = {};
	const requetes = [];
	const reponse = { statut: 200 };

	const ctx = {
		staticData,
		requetes,
		reponse,
		getCredentials: async () => ({ apiKey: 'key', baseUrl: 'https://api.entreprise.page/v1/' }),
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

describe('trigger subscription', () => {
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

	it('subscribes to the list with the webhook URL and keeps the ID and token', async () => {
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

	it('checks that the subscription still exists for the same URL', async () => {
		assert.equal(await hooks.checkExists.call(ctx), false, 'Without a stored subscription');
		assert.equal(ctx.requetes.length, 0);

		Object.assign(ctx.staticData, { abonnementId: 12, token: 'secret' });
		const liste = 'GET https://api.entreprise.page/v1/suivi/abonnement';

		ctx.helpers.httpRequestWithAuthentication = async () => [{ id: 12, url: URL_WEBHOOK }];
		assert.equal(await hooks.checkExists.call(ctx), true);

		ctx.helpers.httpRequestWithAuthentication = async () => [{ id: 13, url: URL_WEBHOOK }];
		assert.equal(await hooks.checkExists.call(ctx), false, `${liste} no longer knows it`);
		assert.deepEqual(ctx.staticData, {});
	});

	it('unsubscribes, even if the subscription is already gone', async () => {
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

describe('receiving events', () => {
	const evenement = {
		evenement: 'fermeture_entreprise',
		siren: '443061841',
		liste: { id: 2, nom: 'Clients' },
	};

	it('triggers the workflow with the received event', async () => {
		const ctx = contexte({ entetes: { 'x-entreprise-page-auth': 'secret' }, corps: evenement });
		ctx.staticData.token = 'secret';

		assert.deepEqual(await trigger.webhook.call(ctx), { workflowData: [[{ json: evenement }]] });
	});

	for (const [cas, entetes] of [
		['without a token', {}],
		['with another token', { 'x-entreprise-page-auth': 'secrez' }],
		['with a longer token', { 'x-entreprise-page-auth': 'secret-' }],
	]) {
		it(`rejects a call ${cas}`, async () => {
			const ctx = contexte({ entetes, corps: evenement });
			ctx.staticData.token = 'secret';

			assert.deepEqual(await trigger.webhook.call(ctx), { noWebhookResponse: true });
			assert.equal(ctx.reponse.statut, 401);
			assert.deepEqual(ctx.reponse.corps, { error: 'Invalid token' });
		});
	}
});
