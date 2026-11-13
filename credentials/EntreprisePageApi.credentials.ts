import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class EntreprisePageApi implements ICredentialType {
	name = 'entreprisePageApi';

	displayName = 'Entreprise.page API';

	icon: Icon = {
		light: 'file:../icons/entreprise-page.svg',
		dark: 'file:../icons/entreprise-page.dark.svg',
	};

	documentationUrl = 'https://github.com/entreprise-page/n8n-nodes-entreprise-page#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'API key of your organisation, shown in your entreprise.page account',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.entreprise.page/v1',
			description: 'Change only to target another environment of the API',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	// GET /quota ne consomme pas de quota : il vérifie seulement la clé.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}',
			url: '/quota',
		},
	};
}
