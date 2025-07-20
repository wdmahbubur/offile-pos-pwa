import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET() {
  try {
    console.log("API: Fetching products from database...")
    const result = await pool.query("SELECT * FROM products ORDER BY name")
    console.log("API: Successfully fetched", result.rows.length, "products")
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("API Error fetching products:", error)

    // Return sample data if database fails
    const sampleProducts = [
      { id: 1, name: "Coffee", price: 3.5, stock: 100, category: "Beverages", barcode: "1234567890123" },
      { id: 2, name: "Sandwich", price: 8.99, stock: 50, category: "Food", barcode: "1234567890124" },
      { id: 3, name: "Water Bottle", price: 1.99, stock: 200, category: "Beverages", barcode: "1234567890125" },
      { id: 4, name: "Chips", price: 2.49, stock: 75, category: "Snacks", barcode: "1234567890126" },
      { id: 5, name: "Energy Bar", price: 4.99, stock: 30, category: "Snacks", barcode: "1234567890127" },
    ]

    console.log("API: Returning sample data due to database error")
    return NextResponse.json(sampleProducts)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, price, stock, category, barcode, image_url } = await request.json()

    const result = await pool.query(
      "INSERT INTO products (name, price, stock, category, barcode, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [name, price, stock, category, barcode, image_url],
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error("API Error creating product:", error)
    return NextResponse.json({ error: "Failed to create product", details: error.message }, { status: 500 })
  }
}
