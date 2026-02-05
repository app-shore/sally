# SALLY Developer Portal

Documentation site built with Nextra 3.0 and Next.js 15.

## Prerequisites

- Node.js 20+
- Backend API running (for OpenAPI spec sync)

## Environment Setup

Create `.env.local` file:

```bash
# Copy the example file
cp .env.example .env.local
```

### Configuration Options

**For Local Development:**
```bash
OPENAPI_URL=http://localhost:8000/api/openapi.json
```

**For Staging:**
```bash
OPENAPI_URL=https://sally-api.apps.appshore.in/api/openapi.json
```

**For Production:**
```bash
OPENAPI_URL=https://api.sally.com/api/openapi.json
```

## Development

### 1. Start the Backend (Required)

First, ensure the backend is running:

```bash
# From project root
cd apps/backend
npm run dev
```

The backend should be running at http://localhost:8000

Verify it's working:
```bash
curl http://localhost:8000/api/openapi.json
```

### 2. Sync OpenAPI Spec

Before starting the docs site, sync the OpenAPI spec from the backend:

```bash
# From apps/docs directory
npm run sync-openapi
```

This will:
- Fetch the OpenAPI spec from `OPENAPI_URL`
- Save it to `public/openapi.json`
- Validate the spec format

### 3. Start Development Server

```bash
npm run dev
```

The docs site will be available at http://localhost:3001

## Building for Production

```bash
# Sync OpenAPI spec first
npm run sync-openapi

# Build static export
npm run build

# The output will be in the `out/` directory
```

## Project Structure

```
apps/docs/
├── pages/              # Documentation pages (MDX)
│   ├── getting-started/
│   ├── guides/
│   ├── api-reference/
│   └── ...
├── components/         # React components
│   ├── ApiReference.tsx
│   ├── Callout.tsx
│   └── ApiKeyDisplay.tsx
├── styles/            # Global styles
│   └── globals.css
├── scripts/           # Build scripts
│   └── sync-openapi.js
├── public/            # Static assets
│   └── openapi.json   # Synced OpenAPI spec (generated)
├── theme.config.tsx   # Nextra theme config
└── next.config.js     # Next.js config
```

## Features

- 📖 **Interactive Documentation** - MDX-based pages with React components
- 🎨 **Dark Mode** - Full dark theme support
- 📱 **Responsive** - Mobile-first design
- 🔍 **Search** - Built-in search with FlexSearch
- 🎯 **API Playground** - Interactive API testing with Scalar
- 🔑 **API Key Docs** - Complete API key management guides

## Troubleshooting

### "Failed to fetch OpenAPI spec"

**Problem:** The sync script can't reach the backend.

**Solutions:**
1. Make sure the backend is running at the correct URL
2. Check your `OPENAPI_URL` in `.env.local`
3. Verify the backend exposes `/api/openapi.json` endpoint
4. Check for CORS issues if using a remote backend

Test the URL directly:
```bash
curl -I http://localhost:8000/api/openapi.json
```

### "Invalid OpenAPI spec"

**Problem:** The fetched spec is not valid OpenAPI format.

**Solutions:**
1. Check backend Swagger configuration in `main.ts`
2. Ensure the backend returns valid JSON
3. Verify the spec has `openapi` or `swagger` field

### Development server won't start

**Problem:** Port 3001 is already in use.

**Solution:** Either stop the other process or change the port:
```bash
npm run dev -- -p 3002
```

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variable: `OPENAPI_URL=https://sally-api.apps.appshore.in/api/openapi.json`
3. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `out`
4. Deploy

### Custom Hosting

1. Build the static export:
   ```bash
   npm run build
   ```

2. Upload the `out/` directory to your hosting provider

3. Configure your server to serve the static files

## Contributing

When adding new pages:

1. Create `.mdx` files in the appropriate directory
2. Update `_meta.json` for navigation
3. Test locally with `npm run dev`
4. Ensure dark mode compatibility
5. Run type check: `npm run type-check`

## Learn More

- [Nextra Documentation](https://nextra.site)
- [Next.js Documentation](https://nextjs.org/docs)
- [Scalar API Reference](https://github.com/scalar/scalar)
