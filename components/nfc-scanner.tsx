"use client"

import { Smartphone, Nfc } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type LockerStatus = "idle" | "scanning" | "verifying" | "granted" | "denied"

interface NfcScannerProps {
  status: LockerStatus
  onScan: () => void
  isNfcSupported: boolean
  lastScannedId?: string
}

export function NfcScanner({ status, onScan, isNfcSupported, lastScannedId }: NfcScannerProps) {
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

      {/* Last scanned ID */}
      {lastScannedId && (
        <div className="text-center p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">NFC ID escaneado:</p>
          <p className="font-mono text-sm text-foreground">{lastScannedId}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="text-center space-y-2">
        {isNfcSupported && status === "idle" && (
          <div className="flex items-center justify-center gap-2 text-green-600">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-sm font-medium">NFC listo - Acerca tu celular al sticker</p>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          {isScanning
            ? "Mantene el telefono cerca del sticker NFC..."
            : isProcessing
            ? "Verificando acceso..."
            : "El lector NFC esta activo automaticamente"}
        </p>
      </div>

      {/* Scan Button - now secondary, since NFC auto-starts */}
      <Button
        size="lg"
        variant={status === "idle" ? "outline" : "default"}
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
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Verificando...
          </>
        ) : (
          <>
            <Nfc className="h-5 w-5" />
            Reactivar Escaneo
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
