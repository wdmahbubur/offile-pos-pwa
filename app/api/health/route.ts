import {NextResponse } from "next/server"

export async function GET() {
  try {
    return NextResponse.json({ status: "OK", timestamp: new Date().toISOString() })
  } catch (error) {
    console.error("Error fetching sales:", error)
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 })
  }
}
