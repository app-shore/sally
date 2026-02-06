'use client'

import { ApiReferenceReact } from '@scalar/api-reference-react'
import '@scalar/api-reference-react/style.css'
import { useEffect, useState } from 'react'

export function ScalarApiReference() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const htmlElement = document.documentElement
    setIsDark(htmlElement.classList.contains('dark'))

    const observer = new MutationObserver(() => {
      setIsDark(htmlElement.classList.contains('dark'))
    })

    observer.observe(htmlElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="not-prose -mx-6 my-8">
      <ApiReferenceReact
        configuration={{
          spec: {
            url: '/openapi.json'
          },
          theme: isDark ? 'saturn' : 'default',
          darkMode: true,
          layout: 'modern',
          defaultHttpClient: {
            targetKey: 'node',
            clientKey: 'fetch'
          },
          authentication: {
            preferredSecurityScheme: 'bearer',
            apiKey: {
              token: 'sk_staging_YOUR_API_KEY'
            }
          },
          hideDownloadButton: false,
          showSidebar: true,
          searchHotKey: 'k'
        }}
      />
    </div>
  )
}
