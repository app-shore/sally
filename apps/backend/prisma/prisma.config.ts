import { defineConfig } from "prisma/config";

export default defineConfig({
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://rest_os_user:rest_os_password@localhost:5432/rest_os",
});
