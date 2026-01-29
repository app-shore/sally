# Quick Start - Database Setup

## 🚀 Run These Commands

### 1. Start Docker
```bash
npm run docker:up
```

### 2. Generate Prisma Client
```bash
npm run backend:prisma:generate
```

### 3. Push Schema (Create Tables)
```bash
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" npm run backend:db:push
```

### 4. Seed Database (Add Sample Data)
```bash
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" npm run backend:seed
```

### 5. Restart Backend (if in Docker)
```bash
docker restart sally-backend
```

## ✅ Verify It Works

```bash
# Check health
curl http://localhost:8000/health

# Get drivers
curl http://localhost:8000/drivers

# Get vehicles
curl http://localhost:8000/vehicles

# Get scenarios
curl http://localhost:8000/scenarios
```

## 🔑 Database Credentials

```
postgresql://sally_user:sally_password@localhost:5432/sally
```

## 📊 Prisma Studio (Database GUI)

```bash
npm run backend:prisma:studio
```

Opens at: `http://localhost:5555`

## 🔄 Reset Database

```bash
cd apps/backend
DATABASE_URL="postgresql://sally_user:sally_password@localhost:5432/sally" npm run db:reset
```

⚠️ **Warning**: Deletes all data!

---

**Full Documentation**: See `DB_SETUP.md`
