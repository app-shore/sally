import type { ParsedOpenAPI, ParsedEndpoint } from './types/openapi'
import fs from 'fs'
import path from 'path'

// Server-side parser for build time (Next.js getStaticProps)
export async function parseOpenAPIServer(): Promise<ParsedOpenAPI> {
  const filePath = path.join(process.cwd(), 'public', 'openapi.json')
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const spec: any = JSON.parse(fileContent)

  const endpoints: ParsedEndpoint[] = []
  const categoriesSet = new Set<string>()

  // Parse each path
  for (const [pathStr, pathItem] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(pathItem as any)) {
      if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue

      const op: any = operation
      const category = op.tags?.[0] || 'Other'
      categoriesSet.add(category)

      const endpoint: ParsedEndpoint = {
        id: `${method}-${pathStr}`.replace(/[^a-z0-9]/gi, '-').toLowerCase(),
        name: op.summary || `${method.toUpperCase()} ${pathStr}`,
        method: method.toUpperCase() as any,
        path: pathStr,
        summary: op.summary || '',
        description: op.description || '',
        category,
        parameters: op.parameters || [],
        requestBody: op.requestBody || null,
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
