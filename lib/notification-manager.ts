class NotificationManager {
  private registration: ServiceWorkerRegistration | null = null
  private subscription: PushSubscription | null = null
  private initialized = false

  constructor() {
    if (typeof window !== "undefined") {
      this.initialize()
    }
  }

  private async initialize() {
    if (this.initialized) return

    try {
      // Check if notifications are supported
      if (!("Notification" in window)) {
        console.log("This browser does not support notifications")
        return
      }

      // Check if service worker is supported
      if (!("serviceWorker" in navigator)) {
        console.log("Service Worker not supported")
        return
      }

      // Wait for service worker to be ready
      this.registration = await navigator.serviceWorker.ready
      console.log("NotificationManager initialized")
      this.initialized = true
    } catch (error) {
      console.error("Failed to initialize NotificationManager:", error)
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied"
    }

    // Ensure initialized
    if (!this.initialized) {
      await this.initialize()
    }

    let permission = Notification.permission

    if (permission === "default") {
      permission = await Notification.requestPermission()
    }

    console.log("Notification permission:", permission)
    return permission
  }

  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.registration) {
      console.log("Service Worker not ready for push subscription")
      return null
    }

    try {
      // Check if already subscribed
      this.subscription = await this.registration.pushManager.getSubscription()

      if (this.subscription) {
        console.log("Already subscribed to push notifications")
        return this.subscription
      }

      // Subscribe to push notifications
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || this.getDefaultVapidKey(),
        ),
      })

      console.log("Successfully subscribed to push notifications")
      return this.subscription
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error)
      return null
    }
  }

  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.subscription) {
      return true
    }

    try {
      await this.subscription.unsubscribe()
      this.subscription = null
      console.log("Successfully unsubscribed from push notifications")
      return true
    } catch (error) {
      console.error("Failed to unsubscribe from push notifications:", error)
      return false
    }
  }

  async showLocalNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      console.log("Notifications not supported")
      return
    }

    const permission = await this.requestPermission()

    if (permission !== "granted") {
      console.log("Notification permission not granted")
      return
    }

    // Ensure initialized
    if (!this.initialized) {
      await this.initialize()
    }

    const defaultOptions: NotificationOptions = {
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      tag: "pos-notification",
      requireInteraction: false,
      ...options,
    }

    if (this.registration) {
      // Use service worker to show notification
      await this.registration.showNotification(title, defaultOptions)
    } else {
      // Fallback to regular notification
      new Notification(title, defaultOptions)
    }
  }

  async notifySyncSuccess(saleId: string, amount: number): Promise<void> {
    await this.showLocalNotification("Sale Synced Successfully! ✅", {
      body: `Sale #${saleId.slice(-8)} ($${amount.toFixed(2)}) has been synced to the server.`,
      icon: "/icon-192x192.png",
      tag: "sync-success",
      data: { type: "sync-success", saleId, amount },
    })
  }

  async notifySyncError(saleId: string, error: string): Promise<void> {
    await this.showLocalNotification("Sync Failed ❌", {
      body: `Failed to sync sale #${saleId.slice(-8)}. Will retry when online.`,
      icon: "/icon-192x192.png",
      tag: "sync-error",
      data: { type: "sync-error", saleId, error },
      requireInteraction: true,
    })
  }

  async notifyBatchSyncComplete(count: number): Promise<void> {
    await this.showLocalNotification("All Sales Synced! 🎉", {
      body: `Successfully synced ${count} pending sale${count !== 1 ? "s" : ""} to the server.`,
      icon: "/icon-192x192.png",
      tag: "batch-sync-complete",
      data: { type: "batch-sync", count },
    })
  }

  async notifyLowStock(productName: string, stock: number): Promise<void> {
    await this.showLocalNotification("Low Stock Alert! ⚠️", {
      body: `${productName} is running low (${stock} remaining). Consider restocking.`,
      icon: "/icon-192x192.png",
      tag: "low-stock",
      data: { type: "low-stock", productName, stock },
      requireInteraction: true,
    })
  }

  async notifyOfflineMode(): Promise<void> {
    await this.showLocalNotification("Offline Mode Active 📱", {
      body: "You're now offline. Sales will be saved locally and synced when you're back online.",
      icon: "/icon-192x192.png",
      tag: "offline-mode",
      data: { type: "offline-mode" },
    })
  }

  async notifyBackOnline(pendingCount: number): Promise<void> {
    if (pendingCount > 0) {
      await this.showLocalNotification("Back Online! 🌐", {
        body: `You're back online. Syncing ${pendingCount} pending sale${pendingCount !== 1 ? "s" : ""}...`,
        icon: "/icon-192x192.png",
        tag: "back-online",
        data: { type: "back-online", pendingCount },
      })
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  private getDefaultVapidKey(): string {
    // Default VAPID key for development - replace with your own
    return "BEl62iUYgUivxIkv69yViEuiBIa40HI8YlOU2AwJ3_Q-1VdVeCOUHPQhPoQRdOQKU4OfP6V7JFSMSRhQBFNnm0k"
  }

  getSubscription(): PushSubscription | null {
    return this.subscription
  }

  isSupported(): boolean {
    return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator
  }
}

// Create singleton instance
let notificationManagerInstance: NotificationManager | null = null

export const notificationManager = (() => {
  if (typeof window === "undefined") {
    // Return a mock object for server-side rendering
    return {
      requestPermission: async () => "denied" as NotificationPermission,
      subscribeToPush: async () => null,
      unsubscribeFromPush: async () => false,
      showLocalNotification: async () => {},
      notifySyncSuccess: async () => {},
      notifySyncError: async () => {},
      notifyBatchSyncComplete: async () => {},
      notifyLowStock: async () => {},
      notifyOfflineMode: async () => {},
      notifyBackOnline: async () => {},
      getSubscription: () => null,
      isSupported: () => false,
    }
  }

  if (!notificationManagerInstance) {
    notificationManagerInstance = new NotificationManager()
  }

  return notificationManagerInstance
})()
