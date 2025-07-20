"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Bell, BellOff, Settings } from "lucide-react"
import { notificationManager } from "@/lib/notification-manager"

export default function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [settings, setSettings] = useState({
    syncNotifications: true,
    lowStockAlerts: true,
    offlineNotifications: true,
  })
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    checkNotificationStatus()
  }, [mounted])

  const checkNotificationStatus = async () => {
    if (!notificationManager.isSupported()) {
      return
    }

    // Check permission
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission)
    }

    // Check subscription status
    const subscription = notificationManager.getSubscription()
    setIsSubscribed(!!subscription)
  }

  const handleEnableNotifications = async () => {
    setLoading(true)
    try {
      const newPermission = await notificationManager.requestPermission()
      setPermission(newPermission)

      if (newPermission === "granted") {
        const subscription = await notificationManager.subscribeToPush()
        setIsSubscribed(!!subscription)

        // Show test notification
        await notificationManager.showLocalNotification("Notifications Enabled! 🔔", {
          body: "You'll now receive sync confirmations and important alerts.",
          tag: "setup-complete",
        })
      }
    } catch (error) {
      console.error("Failed to enable notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDisableNotifications = async () => {
    setLoading(true)
    try {
      const success = await notificationManager.unsubscribeFromPush()
      if (success) {
        setIsSubscribed(false)
      }
    } catch (error) {
      console.error("Failed to disable notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleTestNotification = async () => {
    await notificationManager.showLocalNotification("Test Notification 🧪", {
      body: "This is a test notification to verify everything is working correctly.",
      tag: "test-notification",
    })
  }

  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }))

    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "pos-notification-settings",
        JSON.stringify({
          ...settings,
          [key]: value,
        }),
      )
    }
  }

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return null
  }

  if (!notificationManager.isSupported()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BellOff className="h-5 w-5" />
            <span>Notifications Not Supported</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Your browser doesn't support push notifications. You can still use the POS system, but you won't receive
            sync confirmations.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bell className="h-5 w-5" />
          <span>Notification Settings</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-medium">Notification Permission</Label>
            <p className="text-sm text-gray-600">Allow notifications for sync confirmations</p>
          </div>
          <Badge variant={permission === "granted" ? "default" : permission === "denied" ? "destructive" : "secondary"}>
            {permission === "granted" ? "Granted" : permission === "denied" ? "Denied" : "Not Set"}
          </Badge>
        </div>

        {/* Enable/Disable Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-medium">Push Notifications</Label>
            <p className="text-sm text-gray-600">
              {isSubscribed ? "You're subscribed to push notifications" : "Subscribe to receive notifications"}
            </p>
          </div>
          <div className="flex space-x-2">
            {!isSubscribed ? (
              <Button onClick={handleEnableNotifications} disabled={loading || permission === "denied"} size="sm">
                {loading ? "Enabling..." : "Enable"}
              </Button>
            ) : (
              <>
                <Button onClick={handleTestNotification} variant="outline" size="sm">
                  Test
                </Button>
                <Button onClick={handleDisableNotifications} disabled={loading} variant="destructive" size="sm">
                  {loading ? "Disabling..." : "Disable"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Notification Types */}
        {isSubscribed && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Notification Types</span>
            </h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sync-notifications">Sync Confirmations</Label>
                  <p className="text-sm text-gray-600">Get notified when sales are synced</p>
                </div>
                <Switch
                  id="sync-notifications"
                  checked={settings.syncNotifications}
                  onCheckedChange={(checked) => handleSettingChange("syncNotifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="low-stock-alerts">Low Stock Alerts</Label>
                  <p className="text-sm text-gray-600">Get alerted when products are running low</p>
                </div>
                <Switch
                  id="low-stock-alerts"
                  checked={settings.lowStockAlerts}
                  onCheckedChange={(checked) => handleSettingChange("lowStockAlerts", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="offline-notifications">Offline Mode Alerts</Label>
                  <p className="text-sm text-gray-600">Get notified about offline/online status</p>
                </div>
                <Switch
                  id="offline-notifications"
                  checked={settings.offlineNotifications}
                  onCheckedChange={(checked) => handleSettingChange("offlineNotifications", checked)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        {permission === "denied" && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Notifications are blocked.</strong> To enable them, click the lock icon in your browser's address
              bar and allow notifications, then refresh the page.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
