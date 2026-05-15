"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Lock, CheckCircle2, XCircle, Clock, History, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface AccessLogEntry {
  id: string
  user_id: string
  nfc_id: string
  locker_name: string
  success: boolean
  created_at: string
}

export default function HistorialPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<AccessLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchLogs = async () => {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    // Buscar el locker asignado al usuario
    const { data: userLock, error: userLockError } = await supabase
      .from("user_locks")
      .select("nfc_id")
      .eq("user_id", user.id)
      .single()

    // Si no tiene locker asignado
    if (userLockError || !userLock) {
      setLogs([])
      setLoading(false)
      setRefreshing(false)
      return
    }

    const nfcId = userLock.nfc_id

    // Obtener TODOS los logs de ese locker (Se eliminó el .limit(50))
    const { data, error } = await supabase
      .from("access_logs")
      .select("*")
      .eq("nfc_id", nfcId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching logs:", error)
    } else {
      setLogs(data || [])
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchLogs()
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Ahora"
    if (minutes < 60) return `Hace ${minutes} min`
    if (hours < 24) return `Hace ${hours}h`
    if (days < 7) return `Hace ${days} dias`
    
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatFullDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
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
              <History className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold text-card-foreground">Historial de accesos</h1>
              <p className="text-xs text-muted-foreground">Registro de aperturas</p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
              <p className="mt-4 text-muted-foreground">Cargando historial...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Clock className="mx-auto h-12 w-12 text-blue-600" />
              <h3 className="mt-4 font-semibold text-card-foreground">Sin registros</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Aún no tienes registros de acceso. Los registros aparecerán aquí cuando uses tu locker.
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => router.push("/dashboard/abrir")}
              >
                <Lock className="h-4 w-4 mr-2" />
                Ir a abrir locker
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border bg-blue-50 px-4 py-3 flex items-center justify-between">
                <h3 className="font-semibold text-card-foreground">
                  Registros de acceso
                </h3>
                <span className="text-xs text-muted-foreground">
                  {logs.length} registros
                </span>
              </div>
              <div className="divide-y divide-border">
                {logs.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-muted/30"
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full shrink-0",
                        entry.success ? "bg-accent/10" : "bg-destructive/10"
                      )}
                    >
                      {entry.success ? (
                        <CheckCircle2 className="h-5 w-5 text-accent" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Persona que abrió */}
                      <p className="font-semibold text-card-foreground truncate">
                        {entry.user_id}
                      </p>

                      {/* NFC ID */}
                      <p className="text-xs text-muted-foreground">
                        NFC: {entry.nfc_id}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          entry.success ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {entry.success ? "Acceso concedido" : "Acceso denegado"}
                      </p>

                      <p
                        className="text-xs text-gray-500"
                        title={formatFullDate(entry.created_at)}
                      >
                        {formatDate(entry.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
