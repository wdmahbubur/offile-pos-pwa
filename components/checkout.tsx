"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { type CartItem, type Sale, dbManager } from "@/lib/indexeddb"
import { apiManager } from "@/lib/api"
import { syncManager } from "@/lib/sync-manager"

interface CheckoutProps {
  items: CartItem[]
  onComplete: () => void
  onCancel: () => void
}

export default function Checkout({ items, onComplete, onCancel }: CheckoutProps) {
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
  })
  const [processing, setProcessing] = useState(false)
  const [cashReceived, setCashReceived] = useState("")

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cashReceivedAmount = Number.parseFloat(cashReceived) || 0
  const change = cashReceivedAmount - totalAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)

    try {
      const sale: Sale = {
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        total_amount: totalAmount,
        items,
        payment_method: paymentMethod,
        customer_info: customerInfo,
        created_at: new Date().toISOString(),
        synced: false,
      }

      const isOnline = syncManager.getOnlineStatus()

      if (isOnline) {
        try {
          // Try to sync immediately if online
          console.log("Attempting immediate sync...")
          await apiManager.createSale(sale)
          await dbManager.addSyncedSale({ ...sale, synced: true })
          console.log("Sale synced immediately")
        } catch (error) {
          console.warn("Immediate sync failed, storing as pending:", error)
          // If sync fails, store as pending
          await dbManager.addPendingSale(sale)

          // Try to register background sync (non-critical)
          try {
            await syncManager.requestBackgroundSync()
          } catch (syncError) {
            console.warn("Background sync registration failed:", syncError)
            // This is not critical - sync will happen when user comes back online
          }
        }
      } else {
        console.log("Offline mode, storing sale as pending")
        // Store as pending sale for later sync
        await dbManager.addPendingSale(sale)

        // Try to register background sync (non-critical)
        try {
          await syncManager.requestBackgroundSync()
        } catch (syncError) {
          console.warn("Background sync registration failed:", syncError)
          // This is not critical - sync will happen when user comes back online
        }
      }

      // Clear cart
      await dbManager.clearCart()

      // Show success message
      const message = isOnline ? "Sale completed successfully!" : "Sale saved offline. Will sync when online."

      alert(message)
      onComplete()
    } catch (error) {
      console.error("Checkout failed:", error)
      alert("Checkout failed. Please try again.")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Checkout</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Order Summary */}
            <div>
              <h3 className="font-semibold mb-3">Order Summary</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.name} x{item.quantity}
                    </span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <Label className="text-base font-semibold">Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash">Cash</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card">Card</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="digital" id="digital" />
                  <Label htmlFor="digital">Digital Wallet</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Cash Payment Details */}
            {paymentMethod === "cash" && (
              <div>
                <Label htmlFor="cashReceived">Cash Received</Label>
                <Input
                  id="cashReceived"
                  type="number"
                  step="0.01"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="0.00"
                  className="mt-1"
                />
                {cashReceivedAmount > 0 && (
                  <div className="mt-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span>${totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cash Received:</span>
                      <span>${cashReceivedAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Change:</span>
                      <span className={change < 0 ? "text-red-500" : "text-green-600"}>${change.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Customer Information */}
            <div>
              <Label className="text-base font-semibold">Customer Information (Optional)</Label>
              <div className="space-y-3 mt-2">
                <div>
                  <Label htmlFor="customerName">Name</Label>
                  <Input
                    id="customerName"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="customer@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1 bg-transparent"
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={processing || (paymentMethod === "cash" && change < 0)}
              >
                {processing ? "Processing..." : "Complete Sale"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
