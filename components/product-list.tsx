"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus } from "lucide-react"
import { type Product, type CartItem, dbManager } from "@/lib/indexeddb"
import { apiManager } from "@/lib/api"
import { syncManager } from "@/lib/sync-manager"

interface ProductListProps {
  onAddToCart: (item: CartItem) => void
}

export default function ProductList({ onAddToCart }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    loadProducts()

    const handleOnlineStatus = () => {
      setIsOnline(syncManager.getOnlineStatus())
      if (syncManager.getOnlineStatus()) {
        loadProducts()
      }
    }

    window.addEventListener("online", handleOnlineStatus)
    window.addEventListener("offline", handleOnlineStatus)

    return () => {
      window.removeEventListener("online", handleOnlineStatus)
      window.removeEventListener("offline", handleOnlineStatus)
    }
  }, [mounted])

  useEffect(() => {
    filterProducts()
  }, [products, searchTerm, selectedCategory])

  const loadProducts = async () => {
    if (!mounted) return

    try {
      console.log("Loading products...")

      // Always initialize sample data first (only adds if empty)
      // await dbManager.initializeSampleData()

      const currentIsOnline = syncManager.getOnlineStatus()
      setIsOnline(currentIsOnline)

      if (currentIsOnline) {
        try {
          console.log("Attempting to fetch from API...")
          // Try to fetch from API first
          const apiProducts = await apiManager.fetchProducts()
          console.log("API fetch successful, updating local storage...")
          await dbManager.addProducts(apiProducts)
          setProducts(apiProducts)
        } catch (apiError) {
          console.warn("API fetch failed, using cached products:", apiError)
          // Fallback to cached products when API fails
          const cachedProducts = await dbManager.getProducts()
          setProducts(cachedProducts)
        }
      } else {
        console.log("Offline mode, loading from IndexedDB...")
        // Load from IndexedDB when offline
        const cachedProducts = await dbManager.getProducts()
        setProducts(cachedProducts)
      }
    } catch (error) {
      console.error("Critical error loading products:", error)
      // Last resort: try to get any cached products
      try {
        const cachedProducts = await dbManager.getProducts()
        setProducts(cachedProducts)
        if (cachedProducts.length === 0) {
          // If still no products, show error message
          alert("Unable to load products. Please check your connection and try again.")
        }
      } catch (finalError) {
        console.error("Final fallback failed:", finalError)
        alert("Critical error: Unable to initialize product database.")
      }
    } finally {
      setLoading(false)
    }
  }

  const filterProducts = () => {
    let filtered = products

    if (searchTerm) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.barcode?.includes(searchTerm),
      )
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((product) => product.category === selectedCategory)
    }

    setFilteredProducts(filtered)
  }

  const handleAddToCart = (product: Product) => {
    const cartItem: CartItem = {
      ...product,
      quantity: 1,
    }
    onAddToCart(cartItem)
  }

  const categories = ["all", ...new Set(products.map((p) => p.category))]

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search products or scan barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category === "all" ? "All Categories" : category}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                {product.image_url ? (
                  <img
                    src={product.image_url || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-gray-400 text-4xl">📦</div>
                )}
              </div>

              <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
              <p className="text-2xl font-bold text-blue-600 mb-2">${product.price}</p>

              <div className="flex items-center justify-between mb-3">
                <Badge variant={product.stock > 10 ? "default" : "destructive"}>Stock: {product.stock}</Badge>
                <Badge variant="outline">{product.category}</Badge>
              </div>

              <Button
                onClick={() => handleAddToCart(product)}
                disabled={product.stock === 0}
                className="w-full"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add to Cart
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-8 text-gray-500">No products found matching your criteria.</div>
      )}
    </div>
  )
}
