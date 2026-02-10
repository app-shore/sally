'use client'

import { ApiReferenceReact } from '@scalar/api-reference-react'
import '@scalar/api-reference-react/style.css'
import { useEffect, useState } from 'react'

export function ScalarApiReference() {
  const [isDark, setIsDark] = useState(true)

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
    <div
      className="not-prose"
      style={{
        marginLeft: 'calc(-50vw + 50%)',
        marginRight: 'calc(-50vw + 50%)',
        width: '100vw',
        position: 'relative',
        left: '50%',
        right: '50%',
        marginTop: '0',
        marginBottom: '0'
      }}
    >
      <ApiReferenceReact
        configuration={{
          spec: {
            url: '/openapi.json'
          },
          theme: isDark ? 'saturn' : 'default',
          darkMode: isDark,
          forceDarkModeState: isDark ? 'dark' : 'light',
          hideDarkModeToggle: true,
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
          searchHotKey: 'k',
          customCss: `
            .scalar-app { min-height: calc(100vh - 64px); }
            .scalar-api-reference { max-width: 100% !important; }
          `
        }}
      />
    </div>
  )
}
