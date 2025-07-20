import { Pool } from "pg"

// Create pool with better error handling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/pos_system",
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test connection on startup
pool.on("connect", () => {
  console.log("Database connected successfully")
})

pool.on("error", (err) => {
  console.error("Database connection error:", err)
})

// Test the connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection test failed:", err)
  } else {
    console.log("Database connection test successful:", res.rows[0])
  }
})

export default pool
