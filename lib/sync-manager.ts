import { dbManager } from "./indexeddb"
import { apiManager } from "./api"

class SyncManager {
  private isOnline = false
  private syncInProgress = false
  private initialized = false

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== "undefined") {
      this.initialize()
    }
  }

  private initialize() {
    if (this.initialized) return

    // Set initial online status
    this.isOnline = navigator.onLine

    // Listen for online/offline events
    window.addEventListener("online", () => {
      this.isOnline = true
      this.syncPendingSales()
    })

    window.addEventListener("offline", () => {
      this.isOnline = false
    })

    // Listen for service worker messages
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.type === "SYNC_SALES") {
          this.syncPendingSales()
        }
      })
    }

    this.initialized = true
    console.log("SyncManager initialized")
  }

  async syncPendingSales(): Promise<void> {
    // Ensure we're in browser environment
    if (typeof window === "undefined") return

    // Ensure initialized
    if (!this.initialized) {
      this.initialize()
    }

    if (!this.isOnline || this.syncInProgress) return

    this.syncInProgress = true

    try {
      const pendingSales = await dbManager.getPendingSales()
      console.log(`Syncing ${pendingSales.length} pending sales...`)

      for (const sale of pendingSales) {
        try {
          const success = await apiManager.syncPendingSale(sale)

          if (success) {
            // Move from pending to synced
            await dbManager.addSyncedSale(sale)
            await dbManager.removePendingSale(sale.id)

            // Notify UI
            this.notifyUI("SALE_SYNCED", { saleId: sale.id })
            console.log(`Successfully synced sale: ${sale.id}`)
          }
        } catch (saleError) {
          console.error(`Failed to sync individual sale ${sale.id}:`, saleError)
          // Continue with other sales
        }
      }
    } catch (error) {
      console.error("Sync failed:", error)
    } finally {
      this.syncInProgress = false
    }
  }

  async requestBackgroundSync(): Promise<void> {
    // Ensure we're in browser environment
    if (typeof window === "undefined") {
      console.log("Not in browser environment, skipping background sync")
      return
    }

    // Ensure initialized
    if (!this.initialized) {
      this.initialize()
    }

    try {
      // Check if service worker and background sync are supported
      if (!("serviceWorker" in navigator)) {
        console.log("Service Worker not supported, skipping background sync")
        return
      }

      if (!("sync" in window.ServiceWorkerRegistration.prototype)) {
        console.log("Background Sync not supported, will sync when online")
        return
      }

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready

      if (!registration) {
        console.log("Service Worker not ready, skipping background sync")
        return
      }

      // Register background sync with a short tag
      await registration.sync.register("sync")
      console.log("Background sync registered successfully")
    } catch (error) {
      console.warn("Background sync registration failed:", error)
      // This is not critical - sync will happen when user comes back online
    }
  }

  private notifyUI(type: string, data: any): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sync-update", { detail: { type, data } }))
    }
  }

  getOnlineStatus(): boolean {
    // Ensure we're in browser environment
    if (typeof window === "undefined") {
      return false // Assume offline on server
    }

    // Ensure initialized
    if (!this.initialized) {
      this.initialize()
    }

    return this.isOnline
  }

  // Manual sync method for immediate sync attempts
  async forceSyncNow(): Promise<boolean> {
    // Ensure we're in browser environment
    if (typeof window === "undefined") {
      return false
    }

    // Ensure initialized
    if (!this.initialized) {
      this.initialize()
    }

    if (!this.isOnline) {
      console.log("Cannot sync while offline")
      return false
    }

    try {
      await this.syncPendingSales()
      return true
    } catch (error) {
      console.error("Force sync failed:", error)
      return false
    }
  }
}

// Create singleton instance
let syncManagerInstance: SyncManager | null = null

export const syncManager = (() => {
  if (typeof window === "undefined") {
    // Return a mock object for server-side rendering
    return {
      syncPendingSales: async () => {},
      requestBackgroundSync: async () => {},
      getOnlineStatus: () => false,
      forceSyncNow: async () => false,
    }
  }

  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager()
  }

  return syncManagerInstance
})()
