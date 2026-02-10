# SALLY - Your Fleet Operations Assistant

SALLY is an intelligent fleet operations platform that optimizes route planning, ensures HOS compliance, and keeps dispatchers informed with proactive alerts.

## What SALLY Does

- **Route Planning** - Optimized stop sequencing with TSP/VRP algorithms
- **HOS Compliance** - Automatic rest stop insertion where regulations require
- **Fuel Optimization** - Smart fuel stop placement based on range and pricing
- **Continuous Monitoring** - 14 trigger types monitored 24/7 with dynamic re-planning
- **Dispatcher Alerts** - Proactive notifications for HOS violations, delays, and driver events

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | NestJS 11, TypeScript 5.9, PostgreSQL 16, Redis 7, Prisma 7.3 |
| **Frontend** | Next.js 15 (App Router), TypeScript, Zustand, React Query, Tailwind CSS, Shadcn/ui |
| **Infrastructure** | Docker, Turborepo, pnpm |

## Getting Started

```bash
# Clone and install
git clone <repository-url>
cd sally
pnpm install

# Run with Docker (recommended)
pnpm run docker:up

# Or run with Turborepo
pnpm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |

## Documentation

Full developer documentation, architecture guides, API reference, and product specs are available at:

**[https://build.sally.appshore.in](https://build.sally.appshore.in)**

## Project Structure

```
sally/
├── apps/
│   ├── backend/       # NestJS API server
│   ├── web/           # Next.js dashboard
│   └── docs/          # Developer portal (Nextra)
├── packages/          # Shared packages
├── docker-compose.yml
├── turbo.json
└── package.json
```

## License

Proprietary - All rights reserved
