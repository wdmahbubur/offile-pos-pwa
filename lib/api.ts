import type { Product, Sale } from "./indexeddb"

class APIManager {
  private baseUrl = "/api"

  async fetchProducts(): Promise<Product[]> {
    try {
      console.log("Fetching products from API...")
      const response = await fetch(`${this.baseUrl}/products`)

      if (!response.ok) {
        console.error("API response not ok:", response.status, response.statusText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Successfully fetched products:", data.length)
      return data
    } catch (error) {
      console.error("API fetch failed:", error)
      throw new Error("Failed to fetch products")
    }
  }

  async createSale(sale: Omit<Sale, "id" | "created_at" | "synced">): Promise<Sale> {
    try {
      const response = await fetch(`${this.baseUrl}/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sale),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return response.json()
    } catch (error) {
      console.error("Failed to create sale:", error)
      throw new Error("Failed to create sale")
    }
  }

  async fetchSales(): Promise<Sale[]> {
    try {
      const response = await fetch(`${this.baseUrl}/sales`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    } catch (error) {
      console.error("Failed to fetch sales:", error)
      throw new Error("Failed to fetch sales")
    }
  }

  async syncPendingSale(sale: Sale): Promise<boolean> {
    try {
      await this.createSale({
        total_amount: sale.total_amount,
        items: sale.items,
        payment_method: sale.payment_method,
        customer_info: sale.customer_info,
        offline_id: sale.id,
      })
      return true
    } catch (error) {
      console.error("Failed to sync sale:", error)
      return false
    }
  }
}

export const apiManager = new APIManager()
