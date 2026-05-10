"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Lock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { NfcScanner } from "@/components/nfc-scanner"
import { LockerAnimation } from "@/components/locker-animation"
import { StatusIndicator } from "@/components/status-indicator"
import { AccessLog, type AccessLogEntry } from "@/components/access-log"

type LockerStatus = "idle" | "scanning" | "verifying" | "granted" | "denied"

export default function AbrirLockerPage() {
  const router = useRouter()
  const [status, setStatus] = useState<LockerStatus>("idle")
  const [isNfcSupported, setIsNfcSupported] = useState(true)
  const [accessLog, setAccessLog] = useState<AccessLogEntry[]>([])

  useEffect(() => {
    // Check NFC support
    if (typeof window !== "undefined" && "NDEFReader" in window) {
      setIsNfcSupported(true)
    } else {
      setIsNfcSupported(false)
    }
  }, [])

  const handleScan = async () => {
    setStatus("scanning")

    // Simulate NFC scan for demo - using the prototype NFC ID
    setTimeout(async () => {
      const simulatedNfcId = "NFC-PROTO-001-ABC123"
      
      setStatus("verifying")

      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setStatus("denied")
          return
        }

        // Get lock by NFC ID
        const { data: lock } = await supabase
          .from("locks")
          .select("id, name, nfc_id")
          .eq("nfc_id", simulatedNfcId)
          .single()

        if (!lock) {
          setStatus("denied")
          return
        }

        // Check if user has permission for this lock
        const { data: permission } = await supabase
          .from("user_locks")
          .select("id")
          .eq("user_id", user.id)
          .eq("lock_id", lock.id)
          .single()

        const newEntry: AccessLogEntry = {
          id: Date.now().toString(),
          lockerId: simulatedNfcId,
          lockerName: lock.name,
          timestamp: new Date(),
          success: !!permission,
          userId: user.id,
        }

        setAccessLog((prev) => [newEntry, ...prev.slice(0, 9)])

        if (permission) {
          setStatus("granted")
          // Here you would send the command to ESP8266
          // await fetch('http://ESP8266_IP/open', { method: 'POST' })
        } else {
          setStatus("denied")
        }
      } catch (error) {
        console.error("Error verifying access:", error)
        setStatus("denied")
      }

      // Reset after 3 seconds
      setTimeout(() => setStatus("idle"), 3000)
    }, 2000)
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold text-card-foreground">Abrir Locker</h1>
              <p className="text-xs text-muted-foreground">Escanea el NFC para abrir</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-8">
          {/* Locker Animation */}
          <div className="flex justify-center py-8">
            <LockerAnimation status={status} />
          </div>

          {/* Status Indicator */}
          <StatusIndicator status={status} />

          {/* NFC Scanner */}
          <NfcScanner
            status={status}
            onScan={handleScan}
            isNfcSupported={isNfcSupported}
          />

          {/* Access Log */}
          <div className="pt-4">
            <AccessLog entries={accessLog} />
          </div>
        </div>
      </div>
    </main>
  )
}
