import type { ParsedOpenAPI, ParsedEndpoint } from './types/openapi'

export async function parseOpenAPI(jsonPath: string = '/openapi.json'): Promise<ParsedOpenAPI> {
  const response = await fetch(jsonPath)
  const spec: any = await response.json()

  const endpoints: ParsedEndpoint[] = []
  const categoriesSet = new Set<string>()

  // Parse each path
  for (const [path, pathItem] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(pathItem as any)) {
      if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue

      const op: any = operation
      const category = op.tags?.[0] || 'Other'
      categoriesSet.add(category)

      const endpoint: ParsedEndpoint = {
        id: `${method}-${path}`.replace(/[^a-z0-9]/gi, '-').toLowerCase(),
        name: op.summary || `${method.toUpperCase()} ${path}`,
        method: method.toUpperCase() as any,
        path,
        summary: op.summary || '',
        description: op.description || '',
        category,
        parameters: op.parameters || [],
        requestBody: op.requestBody,
        responses: op.responses || {},
        tags: op.tags || []
      }

      endpoints.push(endpoint)
    }
  }

  return {
    endpoints,
    categories: Array.from(categoriesSet).sort(),
    baseUrl: spec.servers?.[0]?.url || '',
    version: spec.info?.version || '',
    title: spec.info?.title || 'API Reference'
  }
}

export function groupEndpointsByCategory(endpoints: ParsedEndpoint[]): Record<string, ParsedEndpoint[]> {
  return endpoints.reduce((acc, endpoint) => {
    if (!acc[endpoint.category]) {
      acc[endpoint.category] = []
    }
    acc[endpoint.category].push(endpoint)
    return acc
  }, {} as Record<string, ParsedEndpoint[]>)
}
