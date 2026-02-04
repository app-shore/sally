import { IntegrationType } from './dto/create-integration.dto';

export interface CredentialField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'number';
  required: boolean;
  helpText?: string;
  placeholder?: string;
}

export interface VendorMetadata {
  id: string;
  displayName: string;
  description: string;
  integrationType: IntegrationType;
  credentialFields: CredentialField[];
  helpUrl?: string;
  logoUrl?: string;
}

export const VENDOR_REGISTRY: Record<string, VendorMetadata> = {
  PROJECT44_TMS: {
    id: 'PROJECT44_TMS',
    displayName: 'project44',
    description: 'project44 TMS integration',
    integrationType: IntegrationType.TMS,
    credentialFields: [
      {
        name: 'clientId',
        label: 'Client ID',
        type: 'text',
        required: true,
        helpText: 'OAuth 2.0 Client ID from developers.project44.com',
      },
      {
        name: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        required: true,
        helpText: 'OAuth 2.0 Client Secret from developers.project44.com',
      },
    ],
    helpUrl: 'https://developers.project44.com/docs/authentication',
  },

  SAMSARA_ELD: {
    id: 'SAMSARA_ELD',
    displayName: 'Samsara',
    description: 'Samsara ELD integration for HOS data',
    integrationType: IntegrationType.HOS_ELD,
    credentialFields: [
      {
        name: 'apiToken',
        label: 'API Token',
        type: 'password',
        required: true,
        helpText:
          'Get your API token from Samsara Dashboard → Settings → API Tokens',
        placeholder: 'samsara_api_xxxxxxxxxxxxx',
      },
    ],
    helpUrl: 'https://developers.samsara.com/docs/authentication',
  },

  MCLEOD_TMS: {
    id: 'MCLEOD_TMS',
    displayName: 'McLeod',
    description: 'McLeod Software TMS integration',
    integrationType: IntegrationType.TMS,
    credentialFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        helpText: 'Contact your McLeod administrator for API credentials',
      },
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'url',
        required: true,
        helpText: 'Your McLeod API endpoint URL',
        placeholder: 'https://api.mcleodsoft.com',
      },
    ],
  },

  TMW_TMS: {
    id: 'TMW_TMS',
    displayName: 'TMW Systems',
    description: 'TMW Systems TMS integration',
    integrationType: IntegrationType.TMS,
    credentialFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        helpText: 'API key from TMW Systems',
      },
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'url',
        required: true,
        helpText: 'Your TMW API endpoint URL',
        placeholder: 'https://api.tmwsystems.com',
      },
    ],
  },

  KEEPTRUCKIN_ELD: {
    id: 'KEEPTRUCKIN_ELD',
    displayName: 'KeepTruckin',
    description: 'KeepTruckin ELD integration for HOS data',
    integrationType: IntegrationType.HOS_ELD,
    credentialFields: [
      {
        name: 'apiToken',
        label: 'API Token',
        type: 'password',
        required: true,
        helpText: 'Get your API token from KeepTruckin Dashboard',
      },
    ],
  },

  MOTIVE_ELD: {
    id: 'MOTIVE_ELD',
    displayName: 'Motive',
    description: 'Motive ELD integration for HOS data',
    integrationType: IntegrationType.HOS_ELD,
    credentialFields: [
      {
        name: 'apiToken',
        label: 'API Token',
        type: 'password',
        required: true,
        helpText: 'Get your API token from Motive Dashboard',
      },
    ],
  },

  GASBUDDY_FUEL: {
    id: 'GASBUDDY_FUEL',
    displayName: 'GasBuddy',
    description: 'GasBuddy fuel price integration',
    integrationType: IntegrationType.FUEL_PRICE,
    credentialFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        helpText: 'API key from GasBuddy',
      },
    ],
    helpUrl: 'https://www.gasbuddy.com/developer',
  },

  OPENWEATHER: {
    id: 'OPENWEATHER',
    displayName: 'OpenWeather',
    description: 'OpenWeather weather data integration',
    integrationType: IntegrationType.WEATHER,
    credentialFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        helpText: 'Get your API key from OpenWeatherMap',
        placeholder: 'abc123def456...',
      },
    ],
    helpUrl: 'https://openweathermap.org/api',
  },
};
