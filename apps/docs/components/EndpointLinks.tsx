'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { parseOpenAPI, groupEndpointsByCategory } from '@/lib/openapi-parser'
import type { ParsedEndpoint } from '@/lib/types/openapi'

export function EndpointLinks() {
  const [grouped, setGrouped] = useState<Record<string, ParsedEndpoint[]>>({})

  useEffect(() => {
    parseOpenAPI('/openapi.json').then(result => {
      setGrouped(groupEndpointsByCategory(result.endpoints))
    })
  }, [])

  return (
    <div className="not-prose grid gap-6 md:grid-cols-2">
      {Object.entries(grouped).map(([category, endpoints]) => (
        <div key={category} className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-lg font-semibold text-foreground">{category}</h3>
          <ul className="space-y-2">
            {endpoints.map(endpoint => (
              <li key={endpoint.id}>
                <Link
                  href={`/api-reference/endpoint/${endpoint.id}`}
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  {endpoint.method} {endpoint.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
