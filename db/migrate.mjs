import { config } from "dotenv"
import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import postgres from "postgres"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

config({ path: ".env.local" })

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL is not set in .env.local")
    process.exit(1)
  }

  console.log("Connecting to database...")
  console.log("Using connection string:", process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'))
  
  const sql = postgres(process.env.DATABASE_URL, { 
    max: 1,
    ssl: 'require',
    connect_timeout: 10,
    connection: {
      application_name: 'questionsmith_migration'
    }
  })

  try {
    console.log("Testing connection...")
    await sql`SELECT 1`
    console.log("✓ Connection successful")
    
    console.log("Running migration...")
    const migrationSQL = readFileSync(
      join(__dirname, "migrations", "0000_nostalgic_mauler.sql"),
      "utf-8"
    )

    await sql.unsafe(migrationSQL)
    
    console.log("✓ Migration completed successfully!")
    console.log("✓ Tables created: profiles, todos")
  } catch (error) {
    console.error("Migration failed:", error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

migrate()
