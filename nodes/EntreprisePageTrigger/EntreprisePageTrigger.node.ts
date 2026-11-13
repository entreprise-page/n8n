import {
	NodeConnectionTypes,
	NodeApiError,
	type IDataObject,
	type IHookFunctions,
	type IHttpRequestMethods,
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type JsonObject,
} from 'n8n-workflow';

/** En-tête qui porte le token de l'abonnement à chaque appel de l'API. */
const ENTETE_TOKEN = 'x-entreprise-page-auth';

interface Abonnement {
	id: number;
	url: string;
	token?: string;
}

interface DonneesAbonnement extends IDataObject {
	abonnementId?: number;
	token?: string;
}

async function appelerApi(
	this: IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	chemin: string,
	body?: IDataObject,
): Promise<unknown> {
	const credentials = await this.getCredentials('entreprisePageApi');
	const baseUrl = String(credentials.baseUrl).replace(/\/+$/, '');

	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'entreprisePageApi', {
			method,
			url: `${baseUrl}${chemin}`,
			body,
			json: true,
		});
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/** Compare en temps constant, pour ne pas laisser deviner le token. */
function memeToken(recu: string, attendu: string): boolean {
	if (recu.length !== attendu.length) {
		return false;
	}

	let difference = 0;
	for (let i = 0; i < attendu.length; i++) {
		difference |= recu.charCodeAt(i) ^ attendu.charCodeAt(i);
	}

	return difference === 0;
}

export class EntreprisePageTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Entreprise.page Trigger',
		name: 'entreprisePageTrigger',
		icon: {
			light: 'file:../../icons/entreprise-page.svg',
			dark: 'file:../../icons/entreprise-page.dark.svg',
		},
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["evenements"].join(", ")}}',
		description: 'Starts the workflow when a company followed in a list changes',
		defaults: {
			name: 'Entreprise.page Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'entreprisePageApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'List Name or ID',
				name: 'listeId',
				type: 'options',
				required: true,
				default: '',
				description:
					'Follow-up list whose companies trigger the workflow. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: { loadOptionsMethod: 'getListes' },
			},
			{
				displayName: 'Events',
				name: 'evenements',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'Changes of the followed companies that trigger the workflow',
				options: [
					{ name: 'Company Closed', value: 'fermeture_entreprise' },
					{ name: 'Diffusion Changed', value: 'changement_diffusion' },
					{ name: 'Establishment Closed', value: 'fermeture_etablissement' },
					{ name: 'Head Office Changed', value: 'changement_siege_social' },
					{ name: 'Legal Form Changed', value: 'changement_forme_juridique' },
					{ name: 'Main Activity Changed', value: 'changement_activite_principal' },
					{ name: 'Name Changed', value: 'changement_denomination' },
					{ name: 'New Establishment', value: 'nouvel_etablissement' },
					{ name: 'New Executive', value: 'nouveau_dirigeant' },
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getListes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const reponse = (await appelerApi.call(this, 'GET', '/suivi/liste')) as {
					listes: Array<{ id: number; nom: string }>;
				};

				return reponse.listes
					.map((liste) => ({ name: liste.nom, value: liste.id }))
					.sort((a, b) => a.name.localeCompare(b.name));
			},
		},
	};

	// L'abonnement est créé à l'activation du workflow (et à l'écoute d'un
	// événement de test), puis supprimé à sa désactivation. Son identifiant et
	// son token, renvoyé une seule fois par l'API, restent dans les données
	// statiques du nœud.
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const donnees = this.getWorkflowStaticData('node') as DonneesAbonnement;
				if (donnees.abonnementId === undefined) {
					return false;
				}

				const url = this.getNodeWebhookUrl('default');
				const abonnements = (await appelerApi.call(
					this,
					'GET',
					'/suivi/abonnement',
				)) as Abonnement[];
				if (
					abonnements.some(
						(abonnement) => abonnement.id === donnees.abonnementId && abonnement.url === url,
					)
				) {
					return true;
				}

				delete donnees.abonnementId;
				delete donnees.token;

				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const abonnement = (await appelerApi.call(this, 'POST', '/suivi/abonnement', {
					liste_id: Number(this.getNodeParameter('listeId')),
					url: this.getNodeWebhookUrl('default'),
					evenements: this.getNodeParameter('evenements') as string[],
				})) as Abonnement;

				const donnees = this.getWorkflowStaticData('node') as DonneesAbonnement;
				donnees.abonnementId = abonnement.id;
				donnees.token = abonnement.token;

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const donnees = this.getWorkflowStaticData('node') as DonneesAbonnement;
				if (donnees.abonnementId !== undefined) {
					try {
						await appelerApi.call(this, 'DELETE', `/suivi/abonnement/${donnees.abonnementId}`);
					} catch (error) {
						// Déjà supprimé, par exemple avec sa liste : rien à défaire.
						if ((error as NodeApiError).httpCode !== '404') {
							return false;
						}
					}
				}

				delete donnees.abonnementId;
				delete donnees.token;

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const { token } = this.getWorkflowStaticData('node') as DonneesAbonnement;
		const recu = this.getHeaderData()[ENTETE_TOKEN];

		if (!token || typeof recu !== 'string' || !memeToken(recu, token)) {
			this.getResponseObject().status(401).json({ erreur: 'Token invalide' });

			return { noWebhookResponse: true };
		}

		return {
			workflowData: [this.helpers.returnJsonArray(this.getBodyData())],
		};
	}
}
