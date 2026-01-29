import { defineConfig } from "prisma/config";

export default defineConfig({
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://sally_user:sally_password@localhost:5432/sally",
});
