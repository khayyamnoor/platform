import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { wallets } from "../schema/wallets.js";

export type TestDb = {
  db: ReturnType<typeof drizzle<{ wallets: typeof wallets }>>;
  close: () => Promise<void>;
};

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(HERE, "..", "..", "drizzle");

export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  await client.waitReady;

  const sqlFiles = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of sqlFiles) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const statement of statements) {
      await client.exec(statement);
    }
  }

  const db = drizzle(client, { schema: { wallets } });

  return {
    db,
    close: async () => {
      await client.close();
    },
  };
}
