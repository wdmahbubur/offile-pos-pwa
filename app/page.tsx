"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Store, History, Settings } from "lucide-react"
import ProductList from "@/components/product-list"
import Cart from "@/components/cart"
import Checkout from "@/components/checkout"
import SalesHistory from "@/components/sales-history"
import StatusIndicator from "@/components/status-indicator"
import NotificationSettings from "@/components/notification-settings"
import { type CartItem, dbManager } from "@/lib/indexeddb"
import { syncManager } from "@/lib/sync-manager"
import { notificationManager } from "@/lib/notification-manager"

export default function POSSystem() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [showCheckout, setShowCheckout] = useState(false)
  const [activeTab, setActiveTab] = useState("pos")

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("Initializing POS app...")

        // Register service worker with better error handling
        if ("serviceWorker" in navigator) {
          try {
            const registration = await navigator.serviceWorker.register("/sw.js")
            console.log("Service Worker registered successfully:", registration.scope)

            // Wait for service worker to be ready
            await navigator.serviceWorker.ready
            console.log("Service Worker is ready")

            // Listen for service worker messages
            navigator.serviceWorker.addEventListener("message", (event) => {
              handleServiceWorkerMessage(event.data)
            })
          } catch (swError) {
            console.warn("Service Worker registration failed:", swError)
            // App can still work without service worker
          }
        }

        // Initialize notification manager
        await notificationManager.requestPermission()


        // Initialize IndexedDB and load cart
        // await dbManager.initializeSampleData()
        await loadCart()


        // Check for low stock periodically
        setInterval(() => {
          syncManager.checkLowStock()
        }, 300000) // Check every 5 minutes
        console.log("App initialization complete")
      } catch (error) {
        console.error("App initialization failed:", error)
        // Continue anyway - the app should still work with basic functionality
      }
    }

    initializeApp()
  }, [])

  const handleServiceWorkerMessage = (data: any) => {
    switch (data.type) {
      case "NAVIGATE_TO_SALES_HISTORY":
        setActiveTab("history")
        break
      case "RETRY_SYNC":
        syncManager.forceSyncNow()
        break
      default:
        console.log("Unknown service worker message:", data)
    }
  }

  const loadCart = async () => {
    try {
      const savedCart = await dbManager.getCart()
      setCartItems(savedCart)
    } catch (error) {
      console.error("Failed to load cart:", error)
    }
  }

  const handleAddToCart = async (newItem: CartItem) => {
    try {
      const existingItemIndex = cartItems.findIndex((item) => item.id === newItem.id)
      let updatedCart: CartItem[]

      if (existingItemIndex >= 0) {
        updatedCart = [...cartItems]
        updatedCart[existingItemIndex].quantity += newItem.quantity
      } else {
        updatedCart = [...cartItems, newItem]
      }

      setCartItems(updatedCart)

      // Save to IndexedDB
      for (const item of updatedCart) {
        await dbManager.addToCart(item)
      }
    } catch (error) {
      console.error("Failed to add to cart:", error)
    }
  }

  const handleUpdateQuantity = async (id: number, quantity: number) => {
    try {
      const updatedCart = cartItems.map((item) => (item.id === id ? { ...item, quantity } : item))
      setCartItems(updatedCart)

      // Update in IndexedDB
      const item = updatedCart.find((i) => i.id === id)
      if (item) {
        await dbManager.addToCart(item)
      }
    } catch (error) {
      console.error("Failed to update quantity:", error)
    }
  }

  const handleRemoveItem = async (id: number) => {
    try {
      const updatedCart = cartItems.filter((item) => item.id !== id)
      setCartItems(updatedCart)

      // Remove from IndexedDB
      const db = await dbManager.openDB()
      const transaction = db.transaction(["cart"], "readwrite")
      const store = transaction.objectStore("cart")
      store.delete(id)
    } catch (error) {
      console.error("Failed to remove item:", error)
    }
  }

  const handleCheckout = () => {
    if (cartItems.length > 0) {
      setShowCheckout(true)
    }
  }

  const handleCheckoutComplete = async () => {
    setCartItems([])
    setShowCheckout(false)
    setActiveTab("history")
  }

  const handleCheckoutCancel = () => {
    setShowCheckout(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Store className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">POS System</h1>
            </div>
            <StatusIndicator />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="pos" className="flex items-center space-x-2">
              <Store className="h-4 w-4" />
              <span>Point of Sale</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <History className="h-4 w-4" />
              <span>Sales History</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pos">
            <ProductList onAddToCart={handleAddToCart} />
          </TabsContent>

          <TabsContent value="history">
            <SalesHistory />
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <NotificationSettings />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Cart
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
      />

      {showCheckout && (
        <Checkout items={cartItems} onComplete={handleCheckoutComplete} onCancel={handleCheckoutCancel} />
      )}
    </div>
  )
}
