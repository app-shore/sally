import { GetStaticPaths, GetStaticProps } from 'next'
import { parseOpenAPI } from '@/lib/openapi-parser'
import { ApiNav } from '@/components/ApiNav'
import { ApiDoc } from '@/components/ApiDoc'
import { ApiCodePanel } from '@/components/ApiCodePanel'
import type { ParsedEndpoint } from '@/lib/types/openapi'

interface EndpointPageProps {
  endpoint: ParsedEndpoint
  baseUrl: string
}

export default function EndpointPage({ endpoint, baseUrl }: EndpointPageProps) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr_400px]">
      {/* Left: Endpoint Navigation */}
      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <ApiNav activeEndpointId={endpoint.id} />
        </div>
      </aside>

      {/* Center: Documentation */}
      <main className="min-w-0">
        <ApiDoc endpoint={endpoint} />
      </main>

      {/* Right: Code Examples */}
      <aside className="hidden xl:block">
        <ApiCodePanel endpoint={endpoint} baseUrl={baseUrl} />
      </aside>
    </div>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const result = await parseOpenAPI('public/openapi.json')

  const paths = result.endpoints.map(endpoint => ({
    params: { id: endpoint.id }
  }))

  return { paths, fallback: false }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const result = await parseOpenAPI('public/openapi.json')
  const endpoint = result.endpoints.find(e => e.id === params?.id)

  if (!endpoint) {
    return { notFound: true }
  }

  return {
    props: {
      endpoint,
      baseUrl: result.baseUrl
    }
  }
}
