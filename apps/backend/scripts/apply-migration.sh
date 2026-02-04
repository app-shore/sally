#!/bin/sh
set -e

echo "Applying Prisma migrations using direct SQL execution..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

# Parse DATABASE_URL to extract connection details
# Format: postgresql://user:password@host:port/database
DB_URL=$DATABASE_URL

echo "Using database: $DB_URL"

# Find all migration.sql files in order
MIGRATIONS_DIR="./prisma/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "ERROR: Migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

# Check if _prisma_migrations table exists
echo "Checking if migrations have been applied..."
MIGRATIONS_TABLE_EXISTS=$(psql "$DB_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_prisma_migrations');" 2>/dev/null || echo "f")

if [ "$MIGRATIONS_TABLE_EXISTS" = " t" ]; then
  echo "Migrations table exists. Checking applied migrations..."

  # Get list of applied migrations
  APPLIED_MIGRATIONS=$(psql "$DB_URL" -t -c "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name;" 2>/dev/null || echo "")

  if [ -n "$APPLIED_MIGRATIONS" ]; then
    echo "Already applied migrations:"
    echo "$APPLIED_MIGRATIONS"
  fi
else
  echo "No migrations have been applied yet."
fi

# Apply each migration in order
for migration_dir in "$MIGRATIONS_DIR"/*/; do
  if [ -d "$migration_dir" ]; then
    migration_name=$(basename "$migration_dir")
    migration_file="$migration_dir/migration.sql"

    if [ -f "$migration_file" ]; then
      echo ""
      echo "Checking migration: $migration_name"

      # Check if migration already applied
      if [ "$MIGRATIONS_TABLE_EXISTS" = " t" ]; then
        IS_APPLIED=$(psql "$DB_URL" -t -c "SELECT EXISTS (SELECT 1 FROM _prisma_migrations WHERE migration_name = '$migration_name' AND finished_at IS NOT NULL);" 2>/dev/null || echo "f")

        if [ "$IS_APPLIED" = " t" ]; then
          echo "  ✓ Already applied, skipping..."
          continue
        fi
      fi

      echo "  → Applying migration: $migration_name"

      # Apply the migration
      if psql "$DB_URL" -f "$migration_file" 2>&1; then
        echo "  ✓ Successfully applied: $migration_name"

        # Record in _prisma_migrations table
        psql "$DB_URL" -c "INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, '', NOW(), '$migration_name', NULL, NULL, NOW(), 1) ON CONFLICT DO NOTHING;" 2>/dev/null || true
      else
        echo "  ✗ Failed to apply: $migration_name"
        exit 1
      fi
    fi
  fi
done

echo ""
echo "✓ All migrations applied successfully!"
