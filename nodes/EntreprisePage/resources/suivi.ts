import type { INodeProperties } from 'n8n-workflow';

const pourListe = { resource: ['liste'] };
const pourSuivi = { resource: ['suivi'] };

// Les routes de suppression et d'ajout répondent sans corps : on rend un
// élément pour que le workflow continue.
const succes = {
	postReceive: [{ type: 'set' as const, properties: { value: '={{ { "success": true } }}' } }],
};

/** Choix d'une liste de suivi de l'organisation, par son nom. */
export const champListe: INodeProperties = {
	displayName: 'List Name or ID',
	name: 'listeId',
	type: 'options',
	required: true,
	default: '',
	description:
		'Follow-up list of your organisation. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	typeOptions: {
		loadOptions: {
			routing: {
				request: { method: 'GET', url: '/suivi/liste' },
				output: {
					postReceive: [
						{ type: 'rootProperty', properties: { property: 'listes' } },
						{
							type: 'setKeyValue',
							properties: { name: '={{ $responseItem.nom }}', value: '={{ $responseItem.id }}' },
						},
						{ type: 'sort', properties: { key: 'name' } },
					],
				},
			},
		},
	},
};

export const listeDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: pourListe },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a follow up list',
				description: 'Create a follow-up list, within the limit of your plan',
				routing: {
					request: { method: 'POST', url: '/suivi/liste', body: { nom: '={{ $parameter.nom }}' } },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a follow up list',
				description: 'Delete a follow-up list and the companies it follows',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/suivi/liste/{{ toPathSegment($parameter.listeId) }}',
					},
					output: succes,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many follow up lists',
				description: 'Get the follow-up lists of your organisation',
				routing: {
					request: { method: 'GET', url: '/suivi/liste' },
					output: {
						postReceive: [{ type: 'rootProperty', properties: { property: 'listes' } }],
					},
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Name',
		name: 'nom',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'Partenaires',
		description: 'Name of the list, 50 characters at most',
		displayOptions: { show: { ...pourListe, operation: ['create'] } },
	},
	{ ...champListe, displayOptions: { show: { ...pourListe, operation: ['delete'] } } },
];

export const suiviDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: pourSuivi },
		options: [
			{
				name: 'Follow',
				value: 'follow',
				action: 'Follow a company in a list',
				description: 'Add a company to a follow-up list, within the limit of your plan',
				routing: {
					request: {
						method: 'POST',
						url: '=/suivi/liste/{{ toPathSegment($parameter.listeId) }}/entreprise',
						body: { siren: '={{ $parameter.siren }}' },
					},
					output: succes,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get the companies of a list',
				description: 'Get the companies followed in a list',
				routing: {
					request: { method: 'GET', url: '/suivi/entreprise' },
					output: {
						postReceive: [{ type: 'rootProperty', properties: { property: 'entreprises' } }],
					},
				},
			},
			{
				name: 'Remove From List',
				value: 'remove',
				action: 'Remove a company from a list',
				description: 'Stop following a company in one list',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/suivi/liste/{{ toPathSegment($parameter.listeId) }}/entreprise/{{ toPathSegment($parameter.siren) }}',
					},
					output: succes,
				},
			},
			{
				name: 'Unfollow',
				value: 'unfollow',
				action: 'Unfollow a company',
				description: 'Stop following a company in every list',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/suivi/entreprise/{{ toPathSegment($parameter.siren) }}',
					},
					output: succes,
				},
			},
		],
		default: 'follow',
	},
	{ ...champListe, displayOptions: { show: { ...pourSuivi, operation: ['follow', 'remove'] } } },
	{
		...champListe,
		displayOptions: { show: { ...pourSuivi, operation: ['getAll'] } },
		routing: { send: { type: 'query', property: 'liste' } },
	},
	{
		displayName: 'SIREN',
		name: 'siren',
		type: 'string',
		required: true,
		default: '',
		placeholder: '443061841',
		description: 'SIREN number of the company, 9 digits',
		displayOptions: { show: { ...pourSuivi, operation: ['follow', 'remove', 'unfollow'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 50 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { ...pourSuivi, operation: ['getAll'] } },
		routing: { send: { type: 'query', property: 'par_page' } },
	},
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 1,
		description: 'Page of companies to return',
		displayOptions: { show: { ...pourSuivi, operation: ['getAll'] } },
		routing: { send: { type: 'query', property: 'page' } },
	},
];
