# REST-OS Backend

FastAPI-based backend for the REST-OS (Rest Optimization System).

## Overview

The backend provides the core decision-intelligence engines for optimizing truck driver rest periods:

- **HOS Rule Engine**: FMCSA compliance validation
- **Rest Optimization Engine**: Optimal rest timing recommendations
- **Prediction Engine**: Post-load drive demand forecasting

## Tech Stack

- **Framework**: FastAPI
- **Package Manager**: UV
- **Database**: PostgreSQL (AsyncPG driver)
- **ORM**: SQLAlchemy 2.0 (async)
- **Migrations**: Alembic
- **Cache**: Redis
- **Validation**: Pydantic v2
- **Logging**: Structlog
- **Testing**: pytest with async support

## Project Structure

```
app/
├── core/               # Core utilities and constants
├── api/v1/            # API endpoints and schemas
├── services/          # Business logic
├── repositories/      # Data access layer
├── models/            # SQLAlchemy models
├── db/                # Database configuration
├── middleware/        # FastAPI middleware
└── utils/             # Utility functions

tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
└── fixtures/          # Test data and factories
```

## Setup

### Prerequisites

- Python 3.11+
- UV package manager
- PostgreSQL 16+
- Redis 7+

### Installation

```bash
# Install dependencies
uv sync

# Install with dev dependencies
uv sync --extra dev
```

### Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `SECRET_KEY`: Secret key for JWT (min 32 characters)
- `CORS_ORIGINS`: Allowed CORS origins

### Database Setup

```bash
# Run migrations
uv run alembic upgrade head

# Create a new migration
uv run alembic revision --autogenerate -m "description"

# Seed database (optional)
uv run python scripts/db_seed.py
```

## Development

### Run Development Server

```bash
# Start with hot reload
uv run fastapi dev app/main.py

# Or with uvicorn directly
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Server will be available at:
- API: http://localhost:8000
- Interactive docs (Swagger): http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Code Quality

```bash
# Format code with black
uv run black app/

# Sort imports
uv run isort app/

# Lint with ruff
uv run ruff check app/

# Type checking
uv run mypy app/

# Run all code quality checks
uv run black app/ && uv run isort app/ && uv run ruff check app/ && uv run mypy app/
```

### Testing

```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=app tests/

# Run specific test file
uv run pytest tests/unit/services/test_hos_engine.py

# Run with verbose output
uv run pytest -v

# Run only unit tests
uv run pytest tests/unit/

# Run only integration tests
uv run pytest tests/integration/
```

## API Endpoints

### Health Check
- `GET /health` - Health check endpoint

### HOS Rule Engine
- `POST /api/v1/hos-rules/check` - Validate HOS compliance

### Rest Optimization
- `POST /api/v1/optimization/recommend` - Get rest recommendation

### Prediction
- `POST /api/v1/prediction/estimate` - Estimate post-load drive demand

See interactive docs at `/docs` for complete API documentation.

## Core Services

### HOS Rule Engine

Validates FMCSA Hours of Service regulations:
- 11-hour driving limit
- 14-hour on-duty window
- 30-minute break after 8 hours
- Sleeper berth split provisions (7/3, 8/2)

### Rest Optimization Engine

Recommends optimal rest timing based on:
- Current HOS status
- Dock time duration
- Post-load drive demand
- Compliance requirements

Returns one of:
- `FULL_REST`: Take complete 10-hour sleeper berth rest
- `PARTIAL_REST`: Take split sleeper berth rest (7-8 hours)
- `NO_REST`: Continue without rest

### Prediction Engine

Estimates post-load driving demand considering:
- Remaining route distance
- Appointment schedules
- Average driving speeds
- Historical patterns (future enhancement)

## Database Models

- **Driver**: Driver information and current HOS status
- **Vehicle**: Vehicle/equipment data
- **Route**: Trip and route information
- **Event**: Event log for duty status changes
- **Recommendation**: Historical rest recommendations

## Error Handling

The API uses standard HTTP status codes:
- `200`: Success
- `400`: Bad request (validation error)
- `404`: Resource not found
- `422`: Unprocessable entity (Pydantic validation error)
- `500`: Internal server error

All errors return a JSON response with `detail` field.

## Logging

Structured logging with structlog:

```python
import structlog

logger = structlog.get_logger(__name__)
logger.info("event_name", key="value", another_key=123)
```

Logs include:
- Request/response logging (middleware)
- Service operation logs
- Error tracking
- Performance metrics

## Security

- JWT-based authentication (future)
- CORS configuration
- SQL injection prevention (SQLAlchemy)
- Input validation (Pydantic)
- Secure password hashing (bcrypt)

## Contributing

1. Create a new branch for your feature
2. Make changes
3. Run tests and code quality checks
4. Submit pull request

### Code Style

- Follow PEP 8
- Use type hints
- Write docstrings for public methods
- Keep functions focused and small
- Aim for 80%+ test coverage

## License

Proprietary - All rights reserved
