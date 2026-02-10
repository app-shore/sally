'use client'

import dynamic from 'next/dynamic'
import '@scalar/api-reference-react/style.css'

const ScalarApiReferenceInner = dynamic(
  () =>
    import('@scalar/api-reference-react').then((mod) => {
      const { ApiReferenceReact } = mod
      return function ScalarInner() {
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
                theme: 'default',
                darkMode: false,
                forceDarkModeState: 'light',
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
    }),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 200px)',
          color: '#666'
        }}
      >
        Loading API Playground...
      </div>
    )
  }
)

export function ScalarApiReference() {
  return <ScalarApiReferenceInner />
}
