import type { Schema } from '@/lib/types/openapi'

interface SchemaRendererProps {
  schema: Schema
  level?: number
}

export function SchemaRenderer({ schema, level = 0 }: SchemaRendererProps) {
  const indent = '  '.repeat(level)

  if (schema.type === 'object' && schema.properties) {
    return (
      <div className="font-mono text-xs">
        {Object.entries(schema.properties).map(([key, propSchema]) => (
          <div key={key} className="py-1">
            <span className="text-muted-foreground">{indent}</span>
            <span className="text-blue-600 dark:text-blue-400">{key}</span>
            <span className="text-muted-foreground">: </span>
            <span className="text-green-600 dark:text-green-400">{propSchema.type}</span>
            {schema.required?.includes(key) && (
              <span className="ml-2 text-xs text-red-600 dark:text-red-400">(required)</span>
            )}
            {propSchema.description && (
              <span className="ml-2 text-muted-foreground">// {propSchema.description}</span>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (schema.type === 'array' && schema.items) {
    return (
      <div className="font-mono text-xs text-muted-foreground">
        Array of {schema.items.type}
      </div>
    )
  }

  return (
    <div className="font-mono text-xs text-green-600 dark:text-green-400">
      {schema.type}
    </div>
  )
}
