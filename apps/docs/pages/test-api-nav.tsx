import { ApiNav } from '@/components/ApiNav'
import { ApiDoc } from '@/components/ApiDoc'
import { parseOpenAPI } from '@/lib/openapi-parser'
import { useEffect, useState } from 'react'

export default function TestApiDoc() {
  const [endpoint, setEndpoint] = useState(null)

  useEffect(() => {
    parseOpenAPI('/openapi.json').then(result => {
      setEndpoint(result.endpoints[0]) // Test with first endpoint
    })
  }, [])

  if (!endpoint) return <div>Loading...</div>

  return (
    <div className="grid grid-cols-[280px_1fr] gap-8 p-8">
      <ApiNav />
      <ApiDoc endpoint={endpoint} />
    </div>
  )
}
