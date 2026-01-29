# Database Migration Guide

## Current Status

✅ Database is already set up and working using `db:push`

## Development Workflow (Current)

For rapid development, we're using **Prisma DB Push**:

```bash
# From project root
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" npm run backend:db:push

# From apps/backend
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" npm run db:push
```

### Why `db:push` for Development?

- ✅ **Faster** - No migration files to manage
- ✅ **Simpler** - Direct schema sync
- ✅ **Perfect for prototyping** - Rapid iteration
- ❌ **No migration history** - Not ideal for production

## Production Workflow (Future)

When ready for production deployment, switch to **Prisma Migrate**:

### Step 1: Create Initial Migration

This creates migration files that can be version controlled:

```bash
cd apps/backend

# Create migration file (doesn't change DB)
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" \
  npx prisma migrate dev --name initial_schema --create-only

# Mark as applied (since DB already has the schema)
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" \
  npx prisma migrate resolve --applied initial_schema
```

### Step 2: Future Schema Changes

When you modify `schema.prisma`:

```bash
# Create and apply migration
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" \
  npx prisma migrate dev --name describe_your_change
```

### Step 3: Production Deployment

On production servers:

```bash
# Apply all pending migrations
npx prisma migrate deploy
```

## Resolving the Drift Error

If you see the "drift detected" error when running `prisma migrate dev`:

### Understanding the Error

Prisma Migrate detected that your database schema exists but has no migration history. This happens because we used `db:push` instead of `migrate`.

### Solution 1: Continue with `db:push` (Recommended for now)

```bash
# Just use db:push - it's already working
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" npm run db:push
```

### Solution 2: Initialize Migration History

If you want to start using proper migrations:

```bash
cd apps/backend

# Option A: Reset and start fresh (⚠️ DELETES ALL DATA)
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" \
  npx prisma migrate reset

# Then create initial migration
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" \
  npx prisma migrate dev --name initial_schema

# Re-seed
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" \
  npm run db:seed
```

```bash
# Option B: Keep data, just create migration history
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" \
  npx prisma migrate dev --name initial_schema --create-only

DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" \
  npx prisma migrate resolve --applied initial_schema
```

## Quick Command Reference

### Development (Current Setup)

```bash
# Generate Prisma Client
npm run backend:prisma:generate

# Push schema changes (no migration files)
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" \
  npm run backend:db:push

# Seed database
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" \
  npm run backend:seed

# Open Prisma Studio
npm run backend:prisma:studio
```

### Production (Future Setup)

```bash
# Create migration
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" \
  npx prisma migrate dev --name your_change_description

# Deploy to production
npx prisma migrate deploy
```

## Comparison: `db:push` vs `migrate`

| Feature | `db:push` | `migrate` |
|---------|-----------|-----------|
| Speed | ⚡ Fast | 🐢 Slower |
| Migration Files | ❌ None | ✅ Version controlled |
| Production Ready | ❌ No | ✅ Yes |
| Rollback Support | ❌ No | ✅ Yes |
| Team Collaboration | ⚠️ Limited | ✅ Excellent |
| Best For | Development | Production |

## Current Recommendation

**For now, continue using `db:push`**:

1. ✅ Database is already working
2. ✅ Faster development iteration
3. ✅ No migration files to manage
4. ✅ Perfect for prototyping

**Switch to `migrate` when**:

1. 🚀 Ready for production deployment
2. 👥 Working in a team (need migration history)
3. 🔄 Need rollback capability
4. 📝 Want audit trail of schema changes

## Troubleshooting

### "Drift detected" Error

**Cause**: Database schema exists but has no migration history.

**Solution**: Use `db:push` instead of `migrate` for now:
```bash
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" npm run db:push
```

### Need to Start Fresh?

Reset everything and start over:
```bash
cd apps/backend

# Reset database (⚠️ DELETES ALL DATA)
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" \
  npm run db:reset

# Seed database
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" \
  npm run db:seed
```

## Resources

- [Prisma Migrate vs DB Push](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/mental-model#comparing-db-push-and-prisma-migrate)
- [Prisma Migrate in Development](https://www.prisma.io/docs/orm/prisma-migrate/workflows/prototyping-your-schema)
- [Production Deployment](https://www.prisma.io/docs/orm/prisma-migrate/workflows/deploy-and-seed)

---

**Current Status**: Using `db:push` for rapid development ✅
