"use client"

import { useState, useEffect, useRef } from "react"
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
  const [lastScannedId, setLastScannedId] = useState<string>("")
  const ndefReaderRef = useRef<NDEFReader | null>(null)
  const isProcessingRef = useRef(false)

  useEffect(() => {
    // Check NFC support and auto-start scanning
    if (typeof window !== "undefined" && "NDEFReader" in window) {
      setIsNfcSupported(true)
      // Auto-start NFC scanning so it's ready before user taps
      startNfcScanAuto()
    } else {
      setIsNfcSupported(false)
    }

    // Cleanup NFC reader on unmount
    return () => {
      if (ndefReaderRef.current) {
        ndefReaderRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-start version that runs on page load (doesn't change status to scanning initially)
  const startNfcScanAuto = async () => {
    if (!("NDEFReader" in window)) {
      setIsNfcSupported(false)
      return
    }

    try {
      // @ts-expect-error - NDEFReader is not in TypeScript types yet
      const ndef = new NDEFReader()
      ndefReaderRef.current = ndef
      
      await ndef.scan()
      // NFC is now listening in the background

      ndef.addEventListener("reading", async ({ serialNumber }: { serialNumber: string }) => {
        // Prevent multiple simultaneous processing
        if (isProcessingRef.current) return
        isProcessingRef.current = true

        // Convert serial number to format XX:XX:XX:XX:XX:XX:XX
        let formattedId: string
        if (serialNumber.includes(":")) {
          formattedId = serialNumber.toUpperCase()
        } else {
          formattedId = serialNumber
            .match(/.{1,2}/g)
            ?.join(":")
            .toUpperCase() || serialNumber.toUpperCase()
        }

        setLastScannedId(formattedId)
        setStatus("verifying")
        await verifyNfcAccess(formattedId)
      })

      ndef.addEventListener("readingerror", () => {
        console.error("Error reading NFC tag")
        setStatus("denied")
        isProcessingRef.current = false
        setTimeout(() => setStatus("idle"), 3000)
      })
    } catch (error) {
      console.error("Error auto-starting NFC scan:", error)
      // Don't show error on auto-start, user can manually trigger
    }
  }

  // Manual start version (button click) - sets status to scanning
  const startNfcScan = async () => {
    if (!("NDEFReader" in window)) {
      setIsNfcSupported(false)
      return
    }

    // If already scanning, don't restart
    if (ndefReaderRef.current) {
      setStatus("scanning")
      return
    }

    setStatus("scanning")
    isProcessingRef.current = false

    try {
      // @ts-expect-error - NDEFReader is not in TypeScript types yet
      const ndef = new NDEFReader()
      ndefReaderRef.current = ndef
      
      await ndef.scan()

      ndef.addEventListener("reading", async ({ serialNumber }: { serialNumber: string }) => {
        // Prevent multiple simultaneous processing
        if (isProcessingRef.current) return
        isProcessingRef.current = true

        // Convert serial number to format XX:XX:XX:XX:XX:XX:XX
        let formattedId: string
        if (serialNumber.includes(":")) {
          formattedId = serialNumber.toUpperCase()
        } else {
          formattedId = serialNumber
            .match(/.{1,2}/g)
            ?.join(":")
            .toUpperCase() || serialNumber.toUpperCase()
        }

        setLastScannedId(formattedId)
        await verifyNfcAccess(formattedId)
      })

      ndef.addEventListener("readingerror", () => {
        console.error("Error reading NFC tag")
        setStatus("denied")
        isProcessingRef.current = false
        setTimeout(() => setStatus("idle"), 3000)
      })
    } catch (error) {
      console.error("Error starting NFC scan:", error)
      setStatus("denied")
      setTimeout(() => setStatus("idle"), 3000)
    }
  }

  const verifyNfcAccess = async (nfcId: string) => {
    setStatus("verifying")

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        console.error("No user logged in")
        setStatus("denied")
        isProcessingRef.current = false
        setTimeout(() => setStatus("idle"), 3000)
        return
      }

      // Check if user has this nfc_id in user_locks (direct lookup)
      // Using ilike for case-insensitive comparison
      const { data: userLock, error: lockError } = await supabase
        .from("user_locks")
        .select("id, nfc_id")
        .eq("user_id", user.id)
        .ilike("nfc_id", nfcId)
        .single()

      const hasAccess = !!userLock && !lockError

      // Get locker name from locks table for display
      let lockerName = nfcId
      const { data: lockInfo } = await supabase
        .from("locks")
        .select("name")
        .ilike("nfc_id", nfcId)
        .single()
      
      if (lockInfo) {
        lockerName = lockInfo.name
      }

      const newEntry: AccessLogEntry = {
        id: Date.now().toString(),
        lockerId: nfcId,
        lockerName: lockerName,
        timestamp: new Date(),
        success: hasAccess,
        userId: user.id,
      }

      setAccessLog((prev) => [newEntry, ...prev.slice(0, 9)])

      if (hasAccess) {
        setStatus("granted")
        // TODO: Here you would send the command to ESP8266 to open the lock
        // await fetch('http://ESP8266_IP/open', { method: 'POST' })
      } else {
        setStatus("denied")
      }
    } catch (error) {
      console.error("Error verifying access:", error)
      setStatus("denied")
    }

    isProcessingRef.current = false
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
            onScan={startNfcScan}
            isNfcSupported={isNfcSupported}
            lastScannedId={lastScannedId}
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
