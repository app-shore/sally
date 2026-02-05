export interface ParsedEndpoint {
  id: string // Unique ID for routing
  name: string // Display name (e.g., "Plan Route")
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string // API path (e.g., "/api/v1/routes/plan")
  summary: string
  description: string
  category: string // Group name (e.g., "Routes", "Alerts")
  parameters: Parameter[]
  requestBody?: RequestBody
  responses: Record<string, Response>
  tags: string[]
}

export interface Parameter {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  description: string
  required: boolean
  schema: Schema
}

export interface RequestBody {
  description: string
  required: boolean
  content: Record<string, { schema: Schema }>
}

export interface Response {
  description: string
  content?: Record<string, { schema: Schema }>
}

export interface Schema {
  type: string
  properties?: Record<string, Schema>
  items?: Schema
  required?: string[]
  example?: any
  description?: string
}

export interface ParsedOpenAPI {
  endpoints: ParsedEndpoint[]
  categories: string[]
  baseUrl: string
  version: string
  title: string
}
