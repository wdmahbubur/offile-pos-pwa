export interface Product {
  id: number
  name: string
  price: number
  stock: number
  category: string
  barcode?: string
  image_url?: string
}

export interface CartItem extends Product {
  quantity: number
}

export interface Sale {
  id: string
  total_amount: number
  items: CartItem[]
  payment_method: string
  customer_info?: any
  created_at: string
  synced: boolean
  offline_id?: string
}

class IndexedDBManager {
  private dbName = "POSDatabase"
  private version = 1
  private db: IDBDatabase | null = null

  async openDB(): Promise<IDBDatabase> {
    // Check if we're in browser environment
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      throw new Error("IndexedDB not available")
    }

    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Products store
        if (!db.objectStoreNames.contains("products")) {
          const productsStore = db.createObjectStore("products", { keyPath: "id" })
          productsStore.createIndex("category", "category", { unique: false })
          productsStore.createIndex("barcode", "barcode", { unique: true })
        }

        // Cart store
        if (!db.objectStoreNames.contains("cart")) {
          db.createObjectStore("cart", { keyPath: "id" })
        }

        // Pending sales store
        if (!db.objectStoreNames.contains("pendingSales")) {
          const pendingSalesStore = db.createObjectStore("pendingSales", { keyPath: "id" })
          pendingSalesStore.createIndex("created_at", "created_at", { unique: false })
        }

        // Synced sales store
        if (!db.objectStoreNames.contains("syncedSales")) {
          const syncedSalesStore = db.createObjectStore("syncedSales", { keyPath: "id" })
          syncedSalesStore.createIndex("created_at", "created_at", { unique: false })
        }

        // App settings store
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" })
        }
      }
    })
  }

  async addProducts(products: Product[]): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction(["products"], "readwrite")
      const store = transaction.objectStore("products")

      for (const product of products) {
        store.put(product)
      }

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
    } catch (error) {
      console.error("Failed to add products:", error)
      throw error
    }
  }

  async getProducts(): Promise<Product[]> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction(["products"], "readonly")
      const store = transaction.objectStore("products")

      return new Promise((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => {
          console.log("Retrieved products from IndexedDB:", request.result.length)
          resolve(request.result)
        }
        request.onerror = () => {
          console.error("Failed to get products from IndexedDB:", request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error("Error in getProducts:", error)
      return []
    }
  }

  async addToCart(item: CartItem): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction(["cart"], "readwrite")
      const store = transaction.objectStore("cart")

      return new Promise((resolve, reject) => {
        const request = store.put(item)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error("Failed to add to cart:", error)
      throw error
    }
  }

  async getCart(): Promise<CartItem[]> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction(["cart"], "readonly")
      const store = transaction.objectStore("cart")

      return new Promise((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error("Failed to get cart:", error)
      return []
    }
  }

  async clearCart(): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction(["cart"], "readwrite")
      const store = transaction.objectStore("cart")

      return new Promise((resolve, reject) => {
        const request = store.clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error("Failed to clear cart:", error)
      throw error
    }
  }

  async addPendingSale(sale: Sale): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction(["pendingSales"], "readwrite")
      const store = transaction.objectStore("pendingSales")

      return new Promise((resolve, reject) => {
        const request = store.put(sale)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error("Failed to add pending sale:", error)
      throw error
    }
  }

  async getPendingSales(): Promise<Sale[]> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction(["pendingSales"], "readonly")
      const store = transaction.objectStore("pendingSales")

      return new Promise((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error("Failed to get pending sales:", error)
      return []
    }
  }

  async removePendingSale(id: string): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction(["pendingSales"], "readwrite")
      const store = transaction.objectStore("pendingSales")

      return new Promise((resolve, reject) => {
        const request = store.delete(id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error("Failed to remove pending sale:", error)
      throw error
    }
  }

  async addSyncedSale(sale: Sale): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction(["syncedSales"], "readwrite")
      const store = transaction.objectStore("syncedSales")

      return new Promise((resolve, reject) => {
        const request = store.put({ ...sale, synced: true })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error("Failed to add synced sale:", error)
      throw error
    }
  }

  async getSyncedSales(): Promise<Sale[]> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction(["syncedSales"], "readonly")
      const store = transaction.objectStore("syncedSales")

      return new Promise((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error("Failed to get synced sales:", error)
      return []
    }
  }

  async initializeSampleData(): Promise<void> {
    // Only run in browser environment
    if (typeof window === "undefined") {
      return
    }

    try {
      const existingProducts = await this.getProducts()

      // Only add sample data if no products exist
      if (existingProducts.length === 0) {
        console.log("Initializing sample products...")
        const sampleProducts: Product[] = [
          {
            id: 1,
            name: "Coffee",
            price: 3.5,
            stock: 100,
            category: "Beverages",
            barcode: "1234567890123",
            image_url: "/placeholder.svg?height=200&width=200",
          },
          {
            id: 2,
            name: "Sandwich",
            price: 8.99,
            stock: 50,
            category: "Food",
            barcode: "1234567890124",
            image_url: "/placeholder.svg?height=200&width=200",
          },
          {
            id: 3,
            name: "Water Bottle",
            price: 1.99,
            stock: 200,
            category: "Beverages",
            barcode: "1234567890125",
            image_url: "/placeholder.svg?height=200&width=200",
          },
          {
            id: 4,
            name: "Chips",
            price: 2.49,
            stock: 75,
            category: "Snacks",
            barcode: "1234567890126",
            image_url: "/placeholder.svg?height=200&width=200",
          },
          {
            id: 5,
            name: "Energy Bar",
            price: 4.99,
            stock: 30,
            category: "Snacks",
            barcode: "1234567890127",
            image_url: "/placeholder.svg?height=200&width=200",
          },
        ]

        await this.addProducts(sampleProducts)
        console.log("Sample products initialized successfully")
      }
    } catch (error) {
      console.error("Failed to initialize sample data:", error)
    }
  }
}

// Create singleton instance with browser check
let dbManagerInstance: IndexedDBManager | null = null

export const dbManager = (() => {
  if (typeof window === "undefined") {
    // Return a mock object for server-side rendering
    return {
      openDB: async () => {
        throw new Error("IndexedDB not available on server")
      },
      addProducts: async () => {},
      getProducts: async () => [],
      addToCart: async () => {},
      getCart: async () => [],
      clearCart: async () => {},
      addPendingSale: async () => {},
      getPendingSales: async () => [],
      removePendingSale: async () => {},
      addSyncedSale: async () => {},
      getSyncedSales: async () => [],
      initializeSampleData: async () => {},
    }
  }

  if (!dbManagerInstance) {
    dbManagerInstance = new IndexedDBManager()
  }

  return dbManagerInstance
})()
