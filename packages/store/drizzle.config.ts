import type { Config } from "drizzle-kit";

export default {
  schema: "./src/drizzle/schema.ts",
  out: "./drizzle/migrations/sqlite",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/vnt.db",
  },
} satisfies Config;
