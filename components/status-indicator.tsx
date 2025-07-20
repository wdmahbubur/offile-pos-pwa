"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, Clock } from "lucide-react"
import { syncManager } from "@/lib/sync-manager"
import { dbManager } from "@/lib/indexeddb"

export default function StatusIndicator() {
  const [isOnline, setIsOnline] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const updateStatus = () => {
      setIsOnline(syncManager.getOnlineStatus())
      loadPendingCount()
    }

    const loadPendingCount = async () => {
      try {
        const pendingSales = await dbManager.getPendingSales()
        setPendingCount(pendingSales.length)
      } catch (error) {
        console.error("Failed to load pending count:", error)
      }
    }

    // Initial load
    updateStatus()

    // Listen for online/offline events
    const handleOnline = () => updateStatus()
    const handleOffline = () => updateStatus()


    // Listen for sync updates
    const handleSyncUpdate = () => {
      // console.log(`Current online status: ${syncManager.getOnlineStatus()}`)
      setIsOnline(syncManager.getOnlineStatus())
      loadPendingCount()
    }

    window.addEventListener("sync-update", handleSyncUpdate)

    // Periodic check
    const interval = setInterval(loadPendingCount, 30000) // Check every 30 seconds

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("sync-update", handleSyncUpdate)
      clearInterval(interval)
    }
  }, [mounted])

  // Don't render anything until mounted (avoid hydration mismatch)
  if (!mounted) {
    return (
      <div className="flex items-center space-x-2">
        <Badge variant="outline" className="flex items-center space-x-1">
          <span>Loading...</span>
        </Badge>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      <Badge variant={isOnline ? "default" : "destructive"} className="flex items-center space-x-1">
        {isOnline ? (
          <>
            <Wifi className="h-3 w-3" />
            <span>Online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            <span>Offline</span>
          </>
        )}
      </Badge>

      {pendingCount > 0 && (
        <Badge variant="outline" className="flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>{pendingCount} pending</span>
        </Badge>
      )}
    </div>
  )
}
