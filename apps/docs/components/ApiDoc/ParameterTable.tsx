import type { Parameter } from '@/lib/types/openapi'

interface ParameterTableProps {
  parameters: Parameter[]
}

export function ParameterTable({ parameters }: ParameterTableProps) {
  if (!parameters || parameters.length === 0) {
    return <p className="text-sm text-muted-foreground">No parameters</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-2 text-left font-medium text-foreground">Name</th>
            <th className="pb-2 text-left font-medium text-foreground">Type</th>
            <th className="pb-2 text-left font-medium text-foreground">In</th>
            <th className="pb-2 text-left font-medium text-foreground">Required</th>
            <th className="pb-2 text-left font-medium text-foreground">Description</th>
          </tr>
        </thead>
        <tbody>
          {parameters.map((param, idx) => (
            <tr key={idx} className="border-b border-border/50">
              <td className="py-2 font-mono text-xs text-foreground">{param.name}</td>
              <td className="py-2 font-mono text-xs text-muted-foreground">
                {param.schema?.type || 'any'}
              </td>
              <td className="py-2 text-xs text-muted-foreground">{param.in}</td>
              <td className="py-2 text-xs">
                {param.required ? (
                  <span className="text-red-600 dark:text-red-400">Yes</span>
                ) : (
                  <span className="text-muted-foreground">No</span>
                )}
              </td>
              <td className="py-2 text-xs text-muted-foreground">{param.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
