"use client"

import { Smartphone, Nfc } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type LockerStatus = "idle" | "scanning" | "verifying" | "granted" | "denied"

interface NfcScannerProps {
  status: LockerStatus
  onScan: () => void
  isNfcSupported: boolean
}

export function NfcScanner({ status, onScan, isNfcSupported }: NfcScannerProps) {
  const isScanning = status === "scanning"
  const isProcessing = status === "verifying"
  const isDisabled = isScanning || isProcessing

  return (
    <div className="flex flex-col items-center gap-6">
      {/* NFC Illustration */}
      <div className="relative">
        <div
          className={cn(
            "relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 transition-all duration-300",
            isScanning && "animate-pulse bg-primary/20"
          )}
        >
          <Smartphone className="h-10 w-10 text-primary" />
          
          {/* NFC waves */}
          {isScanning && (
            <>
              <div className="absolute inset-0 animate-ping rounded-full border-2 border-primary opacity-30" />
              <div
                className="absolute inset-0 animate-ping rounded-full border-2 border-primary opacity-20"
                style={{ animationDelay: "0.2s" }}
              />
              <div
                className="absolute inset-0 animate-ping rounded-full border-2 border-primary opacity-10"
                style={{ animationDelay: "0.4s" }}
              />
            </>
          )}
        </div>

        {/* NFC icon badge */}
        <div
          className={cn(
            "absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-lg border border-border",
            isScanning && "bg-primary text-primary-foreground"
          )}
        >
          <Nfc className="h-4 w-4" />
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {isScanning
            ? "Mantene el telefono cerca del sticker NFC..."
            : "Presiona el boton y acerca tu telefono al locker"}
        </p>
      </div>

      {/* Scan Button */}
      <Button
        size="lg"
        className={cn(
          "h-14 w-full max-w-xs gap-2 text-lg font-semibold transition-all duration-300",
          isScanning && "animate-pulse"
        )}
        onClick={onScan}
        disabled={isDisabled || !isNfcSupported}
      >
        {isScanning ? (
          <>
            <Nfc className="h-5 w-5 animate-pulse" />
            Escaneando...
          </>
        ) : isProcessing ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            Verificando...
          </>
        ) : (
          <>
            <Nfc className="h-5 w-5" />
            Escanear Locker
          </>
        )}
      </Button>

      {/* NFC Support Warning */}
      {!isNfcSupported && (
        <p className="text-center text-sm text-destructive">
          Tu dispositivo no soporta NFC o no esta habilitado
        </p>
      )}
    </div>
  )
}
