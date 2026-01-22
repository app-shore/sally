# REST-OS Web Dashboard

Next.js-based operations dashboard for the REST-OS (Rest Optimization System).

## Overview

The web dashboard provides real-time engine control and visualization for rest optimization recommendations.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **State Management**: Zustand + React Query
- **Styling**: Tailwind CSS + Shadcn/ui
- **Visualization**: Tremor + Recharts
- **Forms**: React Hook Form + Zod validation

## Features

- Side-by-side control panel and visualization layout
- Real-time engine execution with loading states
- Form validation with Zod
- State management with Zustand
- API client auto-configured for FastAPI backend
- Execution history tracking
- Responsive design

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Backend API running (default: http://localhost:8000)

### Installation

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

Application will be available at http://localhost:3000

## Development

### Project Structure

```
src/
├── app/                    # Next.js app router
├── components/
│   ├── ui/                # Shadcn/ui components
│   ├── dashboard/         # Dashboard components
│   └── forms/             # Form components
├── lib/
│   ├── api/              # API client
│   ├── hooks/            # React hooks
│   ├── store/            # Zustand stores
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   └── validation/       # Zod schemas
└── styles/               # Global styles
```

### Available Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run type-check      # TypeScript type checking
npm run format          # Format with Prettier

# Testing
npm run test            # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:e2e        # Run E2E tests with Playwright

# Maintenance
npm run clean           # Clean build artifacts
```

## Components

### Dashboard Layout

The dashboard uses a side-by-side layout:

**Control Panel (Left 30%)**
- Driver information form
- Dock information form
- Route information form
- Action buttons (Run Engine, Clear)

**Visualization Area (Right 70%)**
- Recommendation card with color-coding
- Compliance status display
- Metrics visualization
- Execution history table

### Key Components

#### ControlPanel
Form inputs for driver, dock, and route information with validation.

#### VisualizationArea
Displays optimization results, compliance status, and execution history.

#### API Client
Type-safe API client for communication with FastAPI backend.

#### Zustand Store
Global state management for engine inputs, results, and history.

## API Integration

The dashboard communicates with the FastAPI backend via:

- `/api/v1/hos-rules/check` - HOS compliance validation
- `/api/v1/optimization/recommend` - Rest optimization
- `/api/v1/prediction/estimate` - Drive demand prediction

API requests are proxied through Next.js rewrites in development.

## Environment Variables

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Feature flags
NEXT_PUBLIC_ENABLE_PREDICTIONS=true
```

## State Management

### Zustand Store

Manages:
- Current form inputs
- Latest recommendation result
- Loading/error states
- Execution history (last 10 runs)

### React Query

Handles:
- API request lifecycle
- Caching and invalidation
- Loading states
- Error handling

## Styling

### Tailwind CSS

Utility-first CSS framework with custom configuration.

### Shadcn/ui

Copy-paste component library for:
- Cards
- Buttons
- Inputs
- Labels
- Forms

### Color System

Recommendations are color-coded:
- 🟢 Green: Full Rest
- 🟡 Yellow: Partial Rest
- 🔵 Blue: No Rest

## Testing

### Unit Tests (Jest)

Test components and utilities in isolation.

### E2E Tests (Playwright)

Test complete user workflows:
- Form submission
- Engine execution
- Results display
- Error handling

## Performance

- Optimized bundle with Next.js
- Server-side rendering for initial load
- Client-side state management
- Memoized components
- Lazy loading where appropriate

## Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus management
- Screen reader support

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Create feature branch
2. Make changes with proper TypeScript types
3. Run linting and type checking
4. Test thoroughly
5. Submit pull request

## License

Proprietary - All rights reserved
