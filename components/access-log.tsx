"use client"

import { CheckCircle2, XCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AccessLogEntry {
  id: string
  lockerId: string
  lockerName: string
  timestamp: Date
  success: boolean
  userId: string
}

interface AccessLogProps {
  entries: AccessLogEntry[]
}

export function AccessLog({ entries }: AccessLogProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          No hay registros de acceso
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border bg-muted/50 px-4 py-3">
        <h3 className="font-semibold text-card-foreground">
          Últimos intentos de acceso
        </h3>
      </div>
      <div className="divide-y divide-border">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full",
                entry.success ? "bg-accent/10" : "bg-destructive/10"
              )}
            >
              {entry.success ? (
                <CheckCircle2 className="h-4 w-4 text-accent" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-card-foreground truncate">
                {entry.lockerName}
              </p>
              <p className="text-xs text-muted-foreground">
                ID: {entry.lockerId}
              </p>
            </div>
            <div className="text-right">
              <p
                className={cn(
                  "text-sm font-medium",
                  entry.success ? "text-accent" : "text-destructive"
                )}
              >
                {entry.success ? "Concedido" : "Denegado"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatTime(entry.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)

  if (minutes < 1) return "Ahora"
  if (minutes < 60) return `Hace ${minutes} min`
  if (hours < 24) return `Hace ${hours}h`
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}
