const isPublic = process.env.DOCS_MODE === 'public'

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
  ...(!isPublic ? {
    "developer-guide": {
      "title": "Developer Guide",
      "type": "page"
    },
    "contributing": {
      "title": "Contributing",
      "type": "page"
    },
  } : {}),
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
