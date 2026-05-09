"use client"

import { Loader2, CheckCircle2, XCircle, Wifi } from "lucide-react"
import { cn } from "@/lib/utils"

type LockerStatus = "idle" | "scanning" | "verifying" | "granted" | "denied"

interface StatusIndicatorProps {
  status: LockerStatus
}

const statusConfig = {
  idle: {
    icon: Wifi,
    label: "Esperando escaneo",
    description: "Acerca tu telefono al sticker NFC del locker",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  scanning: {
    icon: Wifi,
    label: "Escaneando NFC",
    description: "Leyendo etiqueta...",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  verifying: {
    icon: Loader2,
    label: "Verificando",
    description: "Comprobando permisos de acceso...",
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
  },
  granted: {
    icon: CheckCircle2,
    label: "Acceso Concedido",
    description: "Locker abierto - se cerrara automaticamente",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  denied: {
    icon: XCircle,
    label: "Acceso Denegado",
    description: "No tenes permisos para este locker",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
}

export function StatusIndicator({ status }: StatusIndicatorProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl p-4 transition-all duration-300",
        config.bgColor
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300",
          config.bgColor,
          config.color
        )}
      >
        <Icon
          className={cn(
            "h-6 w-6",
            status === "verifying" && "animate-spin",
            status === "scanning" && "animate-pulse"
          )}
        />
      </div>
      <div className="flex-1">
        <p className={cn("font-semibold", config.color)}>{config.label}</p>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </div>
    </div>
  )
}
