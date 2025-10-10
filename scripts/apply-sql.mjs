/*
<ai_context>
Applies the initial SQL migration without relying on drizzle-kit. Uses DATABASE_URL.
</ai_context>
*/

import fs from "fs/promises"
import postgres from "postgres"
import { config as dotenvConfig } from "dotenv"

// Load env vars from .env.local for local CLI usage
dotenvConfig({ path: ".env.local" })

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("DATABASE_URL is not set")
    process.exit(1)
  }

  const sql = postgres(url)
  try {
    const file = new URL("../db/migrations/0001_init.sql", import.meta.url)
    const text = await fs.readFile(file, "utf8")
    await sql.unsafe(text)
    console.log("Applied SQL migration successfully")
  } finally {
    await sql.end({ timeout: 1 })
  }
}

main().catch(err => {
  console.error("Failed to apply SQL migration", err)
  process.exit(1)
})
