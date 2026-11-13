import type { INodeProperties } from 'n8n-workflow';

const pourEtablissement = { resource: ['etablissement'] };

export const etablissementDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: pourEtablissement },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get an establishment',
				description: 'Get an establishment by its SIRET number',
				routing: {
					request: {
						method: 'GET',
						url: '=/organisation/etablissement/{{ toPathSegment($parameter.siret) }}',
					},
				},
			},
		],
		default: 'get',
	},
	{
		displayName: 'SIRET',
		name: 'siret',
		type: 'string',
		required: true,
		default: '',
		placeholder: '44306184100047',
		description: 'SIRET number of the establishment, 14 digits',
		displayOptions: { show: { ...pourEtablissement, operation: ['get'] } },
	},
];
