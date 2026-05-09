"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, Lock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { NfcScanner } from "@/components/nfc-scanner"
import { LockerAnimation } from "@/components/locker-animation"
import { StatusIndicator } from "@/components/status-indicator"
import { AccessLog, type AccessLogEntry } from "@/components/access-log"

type LockerStatus = "idle" | "scanning" | "verifying" | "granted" | "denied"

export default function DashboardPage() {
  const router = useRouter()
  const [status, setStatus] = useState<LockerStatus>("idle")
  const [isNfcSupported, setIsNfcSupported] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [accessLog, setAccessLog] = useState<AccessLogEntry[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? null)
      }
    })

    // Check NFC support
    if (typeof window !== "undefined" && "NDEFReader" in window) {
      setIsNfcSupported(true)
    } else {
      setIsNfcSupported(false)
    }
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const handleScan = async () => {
    setStatus("scanning")

    // Simulate NFC scan for demo (in real app, use NDEFReader)
    setTimeout(async () => {
      // Simulated NFC ID - in real implementation this comes from the NFC tag
      const simulatedNfcId = "NFC-LOCKER-001"
      
      setStatus("verifying")

      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setStatus("denied")
          return
        }

        // Check if user has permission for this lock
        const { data: permission } = await supabase
          .from("user_locks")
          .select(`
            id,
            locks (
              id,
              name,
              nfc_id
            )
          `)
          .eq("user_id", user.id)
          .eq("locks.nfc_id", simulatedNfcId)
          .single()

        const newEntry: AccessLogEntry = {
          id: Date.now().toString(),
          lockerId: simulatedNfcId,
          lockerName: permission?.locks?.name ?? "Locker Desconocido",
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold text-card-foreground">SmartLocker</h1>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Salir
          </Button>
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
