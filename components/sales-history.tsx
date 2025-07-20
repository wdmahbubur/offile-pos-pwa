"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { type Sale, dbManager } from "@/lib/indexeddb"
import { syncManager } from "@/lib/sync-manager"

export default function SalesHistory() {
  const [pendingSales, setPendingSales] = useState<Sale[]>([])
  const [syncedSales, setSyncedSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    loadSales()

    // Listen for sync updates
    const handleSyncUpdate = (event: CustomEvent) => {
      if (event.detail.type === "SALE_SYNCED") {
        loadSales()
      }
    }

    window.addEventListener("sync-update", handleSyncUpdate as EventListener)

    return () => {
      window.removeEventListener("sync-update", handleSyncUpdate as EventListener)
    }
  }, [])

  const loadSales = async () => {
    try {
      const [pending, synced] = await Promise.all([dbManager.getPendingSales(), dbManager.getSyncedSales()])

      setPendingSales(pending.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      setSyncedSales(synced.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    } catch (error) {
      console.error("Failed to load sales:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleManualSync = async () => {
    setSyncing(true)
    try {
      const success = await syncManager.forceSyncNow()
      if (success) {
        await loadSales()
        console.log("Manual sync completed successfully")
      } else {
        console.warn("Manual sync failed - may be offline")
      }
    } catch (error) {
      console.error("Manual sync failed:", error)
    } finally {
      setSyncing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const SaleCard = ({ sale, isPending }: { sale: Sale; isPending: boolean }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold">Sale #{sale.id.slice(-8)}</span>
              <Badge variant={isPending ? "destructive" : "default"}>
                {isPending ? (
                  <>
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Synced
                  </>
                )}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">{formatDate(sale.created_at)}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">${sale.total_amount.toFixed(2)}</p>
            <p className="text-sm text-gray-500 capitalize">{sale.payment_method}</p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Items:</h4>
          {sale.items.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span>
                {item.name} x{item.quantity}
              </span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {sale.customer_info && (sale.customer_info.name || sale.customer_info.email) && (
          <div className="mt-3 pt-3 border-t">
            <h4 className="font-medium text-sm">Customer:</h4>
            <div className="text-sm text-gray-600">
              {sale.customer_info.name && <p>{sale.customer_info.name}</p>}
              {sale.customer_info.email && <p>{sale.customer_info.email}</p>}
              {sale.customer_info.phone && <p>{sale.customer_info.phone}</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sales History</h2>
        <Button onClick={handleManualSync} disabled={syncing || !syncManager.getOnlineStatus()} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4" />
            <span>Pending ({pendingSales.length})</span>
          </TabsTrigger>
          <TabsTrigger value="synced" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Synced ({syncedSales.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingSales.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-gray-500">No pending sales to sync</p>
              </CardContent>
            </Card>
          ) : (
            <div>
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <p className="text-yellow-800">
                    {pendingSales.length} sale{pendingSales.length !== 1 ? "s" : ""} waiting to sync when online
                  </p>
                </div>
              </div>
              {pendingSales.map((sale) => (
                <SaleCard key={sale.id} sale={sale} isPending={true} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="synced" className="mt-6">
          {syncedSales.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No synced sales yet</p>
              </CardContent>
            </Card>
          ) : (
            syncedSales.map((sale) => <SaleCard key={sale.id} sale={sale} isPending={false} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
