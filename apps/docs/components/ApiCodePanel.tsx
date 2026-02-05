'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { generateCurlExample, generateJavaScriptExample, generatePythonExample } from '@/lib/code-generator'
import type { ParsedEndpoint } from '@/lib/types/openapi'

interface ApiCodePanelProps {
  endpoint: ParsedEndpoint
  baseUrl: string
}

export function ApiCodePanel({ endpoint, baseUrl }: ApiCodePanelProps) {
  const [language, setLanguage] = useState<'curl' | 'javascript' | 'python'>('curl')
  const [copied, setCopied] = useState(false)

  const code = {
    curl: generateCurlExample(endpoint, baseUrl),
    javascript: generateJavaScriptExample(endpoint, baseUrl),
    python: generatePythonExample(endpoint, baseUrl)
  }[language]

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="sticky top-4 space-y-4">
      {/* Language Tabs */}
      <Tabs value={language} onValueChange={(v) => setLanguage(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="curl" className="flex-1">cURL</TabsTrigger>
          <TabsTrigger value="javascript" className="flex-1">JavaScript</TabsTrigger>
          <TabsTrigger value="python" className="flex-1">Python</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Code Block */}
      <div className="relative">
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-4 text-xs font-mono">
          <code className="text-foreground">{code}</code>
        </pre>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopy}
          className="absolute right-2 top-2"
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>

      {/* Response Preview */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Expected Response</h3>
        <div className="rounded-lg border border-border bg-muted p-4">
          <pre className="overflow-x-auto text-xs font-mono text-muted-foreground">
            <code>
              {JSON.stringify(
                endpoint.responses['200']?.content?.['application/json']?.schema?.example ||
                { status: 'success', message: 'Response data' },
                null,
                2
              )}
            </code>
          </pre>
        </div>
      </div>

      {/* Try It Button (Future Enhancement) */}
      <Button className="w-full" variant="default" disabled>
        Try it (Coming Soon)
      </Button>
    </div>
  )
}
