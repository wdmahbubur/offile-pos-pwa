import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET() {
  try {
    const result = await pool.query("SELECT * FROM sales ORDER BY created_at DESC")
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Error fetching sales:", error)
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { total_amount, items, payment_method, customer_info, offline_id } = await request.json()

    // Check if this offline sale already exists
    if (offline_id) {
      const existing = await pool.query("SELECT id FROM sales WHERE offline_id = $1", [offline_id])
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: "Sale already synced" }, { status: 409 })
      }
    }

    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Insert sale
      const saleResult = await client.query(
        "INSERT INTO sales (total_amount, items, payment_method, customer_info, offline_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [total_amount, JSON.stringify(items), payment_method, JSON.stringify(customer_info), offline_id],
      )

      // Update product stock
      for (const item of items) {
        await client.query("UPDATE products SET stock = stock - $1 WHERE id = $2", [item.quantity, item.id])
      }

      await client.query("COMMIT")
      return NextResponse.json(saleResult.rows[0], { status: 201 })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Error creating sale:", error)
    return NextResponse.json({ error: "Failed to create sale" }, { status: 500 })
  }
}
