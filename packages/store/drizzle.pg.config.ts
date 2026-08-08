import type { Config } from "drizzle-kit";

export default {
  schema: "./src/drizzle/pg-schema.ts",
  out: "./drizzle/migrations/postgres",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/vnt",
  },
} satisfies Config;
