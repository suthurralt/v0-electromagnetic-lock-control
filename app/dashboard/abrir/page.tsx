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

const normalizeNfcId = (id: string) => {
  return id.replace(/:/g, "").toLowerCase()
}

export default function AbrirLockerPage() {
  const router = useRouter()
  const [status, setStatus] = useState<LockerStatus>("idle")
  const [isNfcSupported, setIsNfcSupported] = useState(true)
  const [isNfcActive, setIsNfcActive] = useState(false)
  const [accessLog, setAccessLog] = useState<AccessLogEntry[]>([])
  const [lastScannedId, setLastScannedId] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const ndefReaderRef = useRef<NDEFReader | null>(null)
  const isProcessingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Check NFC support
    if (typeof window !== "undefined") {
      if ("NDEFReader" in window) {
        setIsNfcSupported(true)
      } else {
        setIsNfcSupported(false)
        setErrorMessage("Tu navegador no soporta NFC. Usa Chrome en Android.")
      }
    }

    // Cleanup NFC reader on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Start NFC scan - requires user interaction (button click)
  const startNfcScan = async () => {
    if (!("NDEFReader" in window)) {
      setIsNfcSupported(false)
      setErrorMessage("Tu navegador no soporta NFC. Usa Chrome en Android.")
      return
    }

    // If already active, just update status
    if (isNfcActive && ndefReaderRef.current) {
      setStatus("scanning")
      setErrorMessage("")
      return
    }

    setStatus("scanning")
    setErrorMessage("")
    isProcessingRef.current = false

    try {
      // Create abort controller for cleanup
      abortControllerRef.current = new AbortController()
      
      // @ts-expect-error - NDEFReader is not in TypeScript types yet
      const ndef = new NDEFReader()
      ndefReaderRef.current = ndef
      
      await ndef.scan({ signal: abortControllerRef.current.signal })
      setIsNfcActive(true)

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

        const normalizedId = normalizeNfcId(formattedId)

        setLastScannedId(normalizedId)
        setStatus("verifying")
        await verifyNfcAccess(normalizedId)

      })

      ndef.addEventListener("readingerror", () => {
        setErrorMessage("Error al leer el tag NFC. Intenta de nuevo.")
        setStatus("denied")
        isProcessingRef.current = false
        setTimeout(() => setStatus("idle"), 3000)
      })
    } catch (error) {
      const err = error as Error
      if (err.name === "NotAllowedError") {
        setErrorMessage("Permiso NFC denegado. Permite el acceso a NFC en tu navegador.")
      } else if (err.name === "NotSupportedError") {
        setErrorMessage("NFC no esta disponible en este dispositivo.")
        setIsNfcSupported(false)
      } else {
        setErrorMessage(`Error: ${err.message}`)
      }
      setStatus("denied")
      setIsNfcActive(false)
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

      // Save access log to database
      await supabase.from("access_logs").insert({
        user_id: user.id,
        nfc_id: nfcId,
        locker_name: lockerName,
        success: hasAccess,
      })
    if (hasAccess) {
      setStatus("granted")

      try {
        const response = await fetch(
          `http://10.226.23.113/open`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Api-Secret": process.env.NEXT_PUBLIC_ESP_SECRET!,
            },
          }
        )

        if (!response.ok) {
          console.error("Error abriendo cerradura")
        } else {
          console.log("Cerradura abierta exitosamente")
        }
      } catch (err) {
        console.error("Error de red al contactar la cerradura:", err)
      }
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">              
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold text-card-foreground">Abrir locker</h1>
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
            isNfcActive={isNfcActive}
            lastScannedId={lastScannedId}
            errorMessage={errorMessage}
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
