import type { INodeProperties } from 'n8n-workflow';

// Identifiers in URLs go through encodeURIComponent rather than toPathSegment,
// which the n8n starter recommends: that function only exists since n8n
// 2.46.1, and without it the identifier is dropped from the URL.
const pourEntreprise = { resource: ['entreprise'] };

export const entrepriseDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: pourEntreprise },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a company',
				description: 'Get a company by its SIREN number',
				routing: {
					request: {
						method: 'GET',
						url: '=/organisation/entreprise/{{ encodeURIComponent($parameter.siren) }}',
					},
				},
			},
			{
				name: 'Get Establishments',
				value: 'getEtablissements',
				action: 'Get the establishments of a company',
				description: 'Get the establishments (SIRET) of a company',
				routing: {
					request: {
						method: 'GET',
						url: '=/organisation/entreprise/{{ encodeURIComponent($parameter.siren) }}/etablissement',
					},
				},
			},
			{
				name: 'Get Legal Notices',
				value: 'getAnnonces',
				action: 'Get the legal notices of a company',
				description: 'Get the BODACC legal notices published for a company',
				routing: {
					request: {
						method: 'GET',
						url: '=/organisation/entreprise/{{ encodeURIComponent($parameter.siren) }}/annonce',
					},
				},
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search companies',
				description: 'Search companies by name, activity, legal category or area',
				routing: {
					request: {
						method: 'GET',
						url: '/organisation/recherche',
					},
					output: {
						postReceive: [{ type: 'rootProperty', properties: { property: 'resultats' } }],
					},
				},
			},
		],
		default: 'get',
	},
	{
		displayName: 'SIREN',
		name: 'siren',
		type: 'string',
		required: true,
		default: '',
		placeholder: '443061841',
		description: 'SIREN number of the company, 9 digits',
		displayOptions: {
			show: { ...pourEntreprise, operation: ['get', 'getEtablissements', 'getAnnonces'] },
		},
	},
	{
		displayName: 'Only Active Establishments',
		name: 'actifs',
		type: 'boolean',
		default: false,
		description: 'Whether to return only the establishments still in activity',
		displayOptions: { show: { ...pourEntreprise, operation: ['getEtablissements'] } },
		routing: {
			send: { type: 'query', property: 'actifs', value: '={{ $value ? "true" : undefined }}' },
		},
	},
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'boulangerie',
		description: 'Name, SIREN or keywords of the companies to find',
		displayOptions: { show: { ...pourEntreprise, operation: ['search'] } },
		routing: { send: { type: 'query', property: 'query' } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 250 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { ...pourEntreprise, operation: ['search'] } },
		routing: { send: { type: 'query', property: 'par_page' } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...pourEntreprise, operation: ['search'] } },
		options: [
			{
				displayName: 'Active',
				name: 'actif',
				type: 'boolean',
				default: true,
				description: 'Whether to return companies in activity (true) or closed (false)',
				routing: { send: { type: 'query', property: 'actif', value: '={{ String($value) }}' } },
			},
			{
				displayName: 'Activity Codes',
				name: 'activite',
				type: 'string',
				default: '',
				placeholder: '10.71C,47.24Z',
				description: 'NAF codes of the main activity, separated by commas',
				routing: { send: { type: 'query', property: 'activite' } },
			},
			{
				displayName: 'Latitude',
				name: 'latitude',
				type: 'number',
				typeOptions: { numberPrecision: 6 },
				default: 0,
				description: 'Latitude of the centre of the search area, used with longitude',
				routing: { send: { type: 'query', property: 'latitude' } },
			},
			{
				displayName: 'Legal Categories',
				name: 'categorieJuridique',
				type: 'string',
				default: '',
				placeholder: '5710,5499',
				description: 'Legal category codes, separated by commas',
				routing: { send: { type: 'query', property: 'categorie_juridique' } },
			},
			{
				displayName: 'Longitude',
				name: 'longitude',
				type: 'number',
				typeOptions: { numberPrecision: 6 },
				default: 0,
				description: 'Longitude of the centre of the search area, used with latitude',
				routing: { send: { type: 'query', property: 'longitude' } },
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				description: 'Page of results to return',
				routing: { send: { type: 'query', property: 'page' } },
			},
			{
				displayName: 'Radius (Km)',
				name: 'rayon',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 500 },
				default: 20,
				description: 'Radius of the search area around latitude and longitude',
				routing: { send: { type: 'query', property: 'rayon' } },
			},
		],
	},
];
