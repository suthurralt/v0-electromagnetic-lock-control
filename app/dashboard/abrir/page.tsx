"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Lock, Loader2 } from "lucide-react"
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
  const [loadingLogs, setLoadingLogs] = useState(true)

  // Load access logs from database on mount
  useEffect(() => {
    loadAccessLogs()
  }, [])

  useEffect(() => {
    // Check NFC support
    if (typeof window !== "undefined" && "NDEFReader" in window) {
      setIsNfcSupported(true)
    } else {
      setIsNfcSupported(false)
    }
  }, [])

  const loadAccessLogs = async () => {
    setLoadingLogs(true)
    const supabase = createClient()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get access logs for all lockers the user has access to
      // RLS policy ensures user only sees logs for their lockers
      const { data: logs } = await supabase
        .from("access_logs")
        .select("id, nfc_id, user_id, success, created_at")
        .order("created_at", { ascending: false })
        .limit(20)

      if (!logs || logs.length === 0) {
        setAccessLog([])
        return
      }

      // Get lock names for all unique nfc_ids
      const uniqueNfcIds = [...new Set(logs.map(l => l.nfc_id))]
      const { data: locks } = await supabase
        .from("locks")
        .select("nfc_id, name")
        .in("nfc_id", uniqueNfcIds)

      const lockNameMap: Record<string, string> = {}
      locks?.forEach(lock => {
        lockNameMap[lock.nfc_id] = lock.name
      })

      const entries: AccessLogEntry[] = logs.map(log => ({
        id: log.id,
        lockerId: log.nfc_id,
        lockerName: lockNameMap[log.nfc_id] || "Locker",
        timestamp: new Date(log.created_at),
        success: log.success,
        userId: log.user_id,
      }))
      setAccessLog(entries)
    } catch (error) {
      console.error("Error loading access logs:", error)
    } finally {
      setLoadingLogs(false)
    }
  }

  const handleScan = async () => {
    setStatus("scanning")

    // Check if Web NFC is supported
    if (!("NDEFReader" in window)) {
      console.log("[v0] Web NFC not supported")
      setStatus("denied")
      setTimeout(() => setStatus("idle"), 3000)
      return
    }

    try {
      // Use real NFC scanning
      const ndef = new (window as typeof window & { NDEFReader: new () => NDEFReader }).NDEFReader()
      
      // Create an AbortController for timeout
      const abortController = new AbortController()
      const timeoutId = setTimeout(() => {
        console.log("[v0] NFC scan timeout")
        abortController.abort()
        setStatus("denied")
        setTimeout(() => setStatus("idle"), 3000)
      }, 60000) // 60 second timeout to give user time to scan

      console.log("[v0] Starting NFC scan...")
      await ndef.scan({ signal: abortController.signal })
      console.log("[v0] NFC scan started, waiting for tag...")

      ndef.addEventListener("reading", async (event: Event) => {
        clearTimeout(timeoutId)
        console.log("[v0] NFC tag detected!")
        const ndefEvent = event as NDEFReadingEvent
        const serialNumber = ndefEvent.serialNumber || ""
        
        console.log("[v0] Serial number:", serialNumber)
        
        // Try to get NFC ID from records or use serial number
        let nfcId = serialNumber
        
        if (ndefEvent.message && ndefEvent.message.records) {
          console.log("[v0] Records found:", ndefEvent.message.records.length)
          for (const record of ndefEvent.message.records) {
            console.log("[v0] Record type:", record.recordType)
            if (record.recordType === "text") {
              const textDecoder = new TextDecoder()
              nfcId = textDecoder.decode(record.data)
              console.log("[v0] Text record value:", nfcId)
              break
            }
          }
        }

        if (nfcId) {
          console.log("[v0] Processing NFC ID:", nfcId)
          await processNfcId(nfcId)
        } else {
          console.log("[v0] No NFC ID found")
          setStatus("denied")
          setTimeout(() => setStatus("idle"), 3000)
        }
      }, { once: true })

      ndef.addEventListener("readingerror", (event) => {
        clearTimeout(timeoutId)
        console.log("[v0] NFC reading error:", event)
        setStatus("denied")
        setTimeout(() => setStatus("idle"), 3000)
      }, { once: true })

    } catch (error) {
      console.error("[v0] NFC scan error:", error)
      // Show error to user instead of using fallback
      setStatus("denied")
      setTimeout(() => setStatus("idle"), 3000)
    }
  }

  const processNfcId = async (scannedNfcId: string) => {
    setStatus("verifying")

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setStatus("denied")
        setTimeout(() => setStatus("idle"), 3000)
        return
      }

      // Get lock by NFC ID
      const { data: lock } = await supabase
        .from("locks")
        .select("id, name, nfc_id")
        .eq("nfc_id", scannedNfcId)
        .single()

      if (!lock) {
        console.log("[v0] Lock not found for NFC ID:", scannedNfcId)
        setStatus("denied")
        setTimeout(() => setStatus("idle"), 3000)
        return
      }

      // Check if user has permission for this lock (using nfc_id)
      const { data: permission } = await supabase
        .from("user_locks")
        .select("id")
        .eq("user_id", user.id)
        .eq("nfc_id", lock.nfc_id)
        .single()

      const accessSuccess = !!permission

      // Save access log to database
      const { data: savedLog, error: logError } = await supabase
        .from("access_logs")
        .insert({
          nfc_id: lock.nfc_id,
          user_id: user.id,
          success: accessSuccess,
        })
        .select("id")
        .single()

      if (logError) {
        console.error("Error saving access log:", logError)
      }

      const newEntry: AccessLogEntry = {
        id: savedLog?.id || Date.now().toString(),
        lockerId: lock.nfc_id,
        lockerName: lock.name,
        timestamp: new Date(),
        success: accessSuccess,
        userId: user.id,
      }

      setAccessLog((prev) => [newEntry, ...prev.slice(0, 19)])

      if (accessSuccess) {
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
            {loadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <AccessLog entries={accessLog} />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
