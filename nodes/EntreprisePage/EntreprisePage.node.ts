import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { entrepriseDescription } from './resources/entreprise';
import { etablissementDescription } from './resources/etablissement';
import { listeDescription, suiviDescription } from './resources/suivi';

export class EntreprisePage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Entreprise.page',
		name: 'entreprisePage',
		icon: {
			light: 'file:../../icons/entreprise-page.svg',
			dark: 'file:../../icons/entreprise-page.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Get French companies and establishments, and manage your follow-up lists',
		defaults: {
			name: 'Entreprise.page',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'entreprisePageApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Company', value: 'entreprise' },
					{ name: 'Establishment', value: 'etablissement' },
					{ name: 'Follow-Up', value: 'suivi' },
					{ name: 'Follow-Up List', value: 'liste' },
				],
				default: 'entreprise',
			},
			...entrepriseDescription,
			...etablissementDescription,
			...listeDescription,
			...suiviDescription,
		],
	};
}
