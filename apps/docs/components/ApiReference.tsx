'use client';

import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

interface ApiReferenceProps {
  specUrl?: string;
  tag?: string;
  operation?: string;
}

export function ApiReference({
  specUrl = '/openapi.json',
  tag,
  operation
}: ApiReferenceProps) {
  const configuration = {
    spec: {
      url: specUrl
    },
    theme: 'default',
    darkMode: true,
    layout: 'modern',
    defaultHttpClient: {
      targetKey: 'node',
      clientKey: 'fetch'
    },
    authentication: {
      preferredSecurityScheme: 'api-key',
      http: {
        bearer: {
          token: 'sk_staging_YOUR_KEY_HERE'
        }
      }
    },
    // Filter to specific tag or operation if provided
    ...(tag && { showTag: tag }),
    ...(operation && { showOperation: operation })
  };

  return (
    <div className="not-prose my-8 rounded-lg border border-border overflow-hidden">
      <ApiReferenceReact configuration={configuration} />
    </div>
  );
}
