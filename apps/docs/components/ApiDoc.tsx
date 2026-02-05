'use client'

import { Badge } from '@/components/ui/badge'
import { ParameterTable } from './ApiDoc/ParameterTable'
import { SchemaRenderer } from './ApiDoc/SchemaRenderer'
import type { ParsedEndpoint } from '@/lib/types/openapi'

interface ApiDocProps {
  endpoint: ParsedEndpoint
}

export function ApiDoc({ endpoint }: ApiDocProps) {
  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'POST': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'PUT': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'DELETE': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const requestBodySchema = endpoint.requestBody?.content?.['application/json']?.schema
  const successResponse = endpoint.responses['200'] || endpoint.responses['201']
  const responseSchema = successResponse?.content?.['application/json']?.schema

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge className={getMethodColor(endpoint.method)}>
            {endpoint.method}
          </Badge>
          <code className="text-sm font-mono text-foreground">{endpoint.path}</code>
        </div>
        <h1 className="mb-4 text-3xl font-bold text-foreground">{endpoint.name}</h1>
        <p className="text-base text-muted-foreground">{endpoint.description}</p>
      </div>

      {/* Parameters */}
      {endpoint.parameters && endpoint.parameters.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-foreground">Parameters</h2>
          <ParameterTable parameters={endpoint.parameters} />
        </div>
      )}

      {/* Request Body */}
      {requestBodySchema && (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-foreground">Request Body</h2>
          {endpoint.requestBody?.description && (
            <p className="mb-4 text-sm text-muted-foreground">
              {endpoint.requestBody.description}
            </p>
          )}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <SchemaRenderer schema={requestBodySchema} />
          </div>
        </div>
      )}

      {/* Response */}
      {responseSchema && (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-foreground">Response</h2>
          {successResponse?.description && (
            <p className="mb-4 text-sm text-muted-foreground">
              {successResponse.description}
            </p>
          )}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <SchemaRenderer schema={responseSchema} />
          </div>
        </div>
      )}

      {/* Error Responses */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-foreground">Error Codes</h2>
        <div className="space-y-2">
          {Object.entries(endpoint.responses)
            .filter(([code]) => code !== '200' && code !== '201')
            .map(([code, response]) => (
              <div key={code} className="flex gap-4 rounded-md border border-border p-3">
                <code className="font-mono text-sm font-semibold text-foreground">{code}</code>
                <span className="text-sm text-muted-foreground">{response.description}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
