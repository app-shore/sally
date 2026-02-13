const isPublic = process.env.NEXT_PUBLIC_DOCS_MODE === 'public'

const meta: Record<string, any> = {
  "index": {
    "title": "Home",
    "type": "page",
    "display": "hidden"
  },
  "product": {
    "title": "Product",
    "type": "page"
  },
  "getting-started": {
    "title": "Getting Started",
    "type": "page"
  },
  "api-guides": {
    "title": "API Guides",
    "type": "page"
  },
  "api-reference": {
    "title": "API Reference",
    "type": "page"
  },
  "api-playground": {
    "title": "API Playground",
    "type": "page"
  },
  "developer-guide": {
    "title": "Developer Guide",
    "type": "page",
    ...(isPublic ? { "display": "hidden" } : {})
  },
  "contributing": {
    "title": "Contributing",
    "type": "page",
    ...(isPublic ? { "display": "hidden" } : {})
  },
  "resources": {
    "title": "Resources",
    "type": "page"
  },
  "blog": {
    "title": "Blog",
    "type": "page"
  }
}

export default meta
