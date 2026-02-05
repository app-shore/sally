'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { parseOpenAPI, groupEndpointsByCategory } from '@/lib/openapi-parser'
import { ApiSearch } from './ApiSearch'
import type { ParsedEndpoint } from '@/lib/types/openapi'

interface ApiNavProps {
  activeEndpointId?: string
}

export function ApiNav({ activeEndpointId }: ApiNavProps) {
  const [grouped, setGrouped] = useState<Record<string, ParsedEndpoint[]>>({})
  const [filtered, setFiltered] = useState<Record<string, ParsedEndpoint[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    parseOpenAPI('/openapi.json')
      .then(result => {
        const g = groupEndpointsByCategory(result.endpoints)
        setGrouped(g)
        setFiltered(g)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to parse OpenAPI:', err)
        setLoading(false)
      })
  }, [])

  const handleSearch = (query: string) => {
    if (!query) {
      setFiltered(grouped)
      return
    }

    const newFiltered: Record<string, ParsedEndpoint[]> = {}

    Object.entries(grouped).forEach(([category, endpoints]) => {
      const matches = endpoints.filter(endpoint =>
        endpoint.name.toLowerCase().includes(query) ||
        endpoint.path.toLowerCase().includes(query) ||
        endpoint.method.toLowerCase().includes(query)
      )
      if (matches.length > 0) {
        newFiltered[category] = matches
      }
    })

    setFiltered(newFiltered)
  }

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading endpoints...</div>
  }

  return (
    <nav className="space-y-4">
      <ApiSearch onSearch={handleSearch} />
      {Object.entries(filtered).map(([category, endpoints]) => (
        <div key={category}>
          <h3 className="mb-2 px-2 text-sm font-semibold text-foreground">
            {category}
          </h3>
          <ul className="space-y-1">
            {endpoints.map(endpoint => (
              <li key={endpoint.id}>
                <Link
                  href={`/api-reference/endpoint/${endpoint.id}`}
                  className={`
                    block rounded-md px-2 py-1.5 text-sm transition-colors
                    ${activeEndpointId === endpoint.id
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }
                  `}
                >
                  <span className={`
                    mr-2 inline-block w-12 text-xs font-mono
                    ${endpoint.method === 'GET' && 'text-blue-600 dark:text-blue-400'}
                    ${endpoint.method === 'POST' && 'text-green-600 dark:text-green-400'}
                    ${endpoint.method === 'PUT' && 'text-yellow-600 dark:text-yellow-400'}
                    ${endpoint.method === 'DELETE' && 'text-red-600 dark:text-red-400'}
                  `}>
                    {endpoint.method}
                  </span>
                  {endpoint.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
