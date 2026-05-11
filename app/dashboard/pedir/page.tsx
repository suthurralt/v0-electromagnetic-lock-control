"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Lock, Check, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface LockWithStatus {
  id: string
  name: string
  nfc_id: string
  isAssignedToMe: boolean
  userCount: number
  maxUsers: number
}

export default function PedirLockerPage() {
  const router = useRouter()
  const [locks, setLocks] = useState<LockWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    loadLocks()
  }, [])

  const loadLocks = async () => {
    setLoading(true)
    const supabase = createClient()
    const MAX_USERS_PER_LOCKER = 6
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get all locks
      const { data: allLocks } = await supabase
        .from("locks")
        .select("id, name, nfc_id")
        .order("name")

      if (!allLocks) return

      // Get my assigned locks (using nfc_id)
      const { data: myLocks } = await supabase
        .from("user_locks")
        .select("nfc_id")
        .eq("user_id", user.id)

      const myNfcIds = new Set(myLocks?.map(l => l.nfc_id) ?? [])

      // Get count of users per locker (nfc_id)
      const { data: allAssignments } = await supabase
        .from("user_locks")
        .select("nfc_id")

      // Count users per nfc_id
      const userCountByNfc: Record<string, number> = {}
      allAssignments?.forEach(a => {
        userCountByNfc[a.nfc_id] = (userCountByNfc[a.nfc_id] || 0) + 1
      })

      const locksWithStatus: LockWithStatus[] = allLocks.map(lock => ({
        ...lock,
        isAssignedToMe: myNfcIds.has(lock.nfc_id),
        userCount: userCountByNfc[lock.nfc_id] || 0,
        maxUsers: MAX_USERS_PER_LOCKER,
      }))

      setLocks(locksWithStatus)
    } catch (error) {
      console.error("Error loading locks:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReturn = async (lock: LockWithStatus) => {
    setAssigning(lock.id)
    setMessage(null)

    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No hay sesion")

      const { error } = await supabase
        .from("user_locks")
        .delete()
        .eq("user_id", user.id)
        .eq("nfc_id", lock.nfc_id)

      if (error) throw error

      setMessage({ type: "success", text: `${lock.name} devuelto correctamente` })
      await loadLocks()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al devolver locker"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setAssigning(null)
    }
  }

  const handleAssign = async (lock: LockWithStatus) => {
    setAssigning(lock.id)
    setMessage(null)

    const supabase = createClient()
    const MAX_USERS_PER_LOCKER = 6

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No hay sesion")

      // Check if locker is full
      if (lock.userCount >= MAX_USERS_PER_LOCKER) {
        throw new Error("Este locker ya tiene el maximo de usuarios (6/6)")
      }

      const { error } = await supabase
        .from("user_locks")
        .insert({
          user_id: user.id,
          nfc_id: lock.nfc_id,
        })

      if (error) throw error

      setMessage({ type: "success", text: `${lock.name} asignado correctamente` })
      await loadLocks()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al asignar locker"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setAssigning(null)
    }
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
              <h1 className="font-semibold text-card-foreground">Pedir Locker</h1>
              <p className="text-xs text-muted-foreground">Selecciona un locker disponible</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          {/* Message */}
          {message && (
            <div className={`p-4 rounded-lg ${
              message.type === "success" 
                ? "bg-primary/10 text-primary border border-primary/20" 
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}>
              {message.text}
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {locks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay lockers disponibles
                </p>
              ) : (
                locks.map((lock) => {
                  const isFull = lock.userCount >= lock.maxUsers
                  const hasSpace = lock.userCount < lock.maxUsers
                  
                  return (
                  <div
                    key={lock.id}
                    className={`p-4 rounded-xl border ${
                      lock.isAssignedToMe
                        ? "border-primary bg-primary/5"
                        : isFull
                        ? "border-destructive/50 bg-destructive/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                          lock.isAssignedToMe
                            ? "bg-primary text-primary-foreground"
                            : isFull
                            ? "bg-destructive/20 text-destructive"
                            : "bg-secondary text-secondary-foreground"
                        }`}>
                          <Lock className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{lock.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${
                              isFull 
                                ? "text-destructive" 
                                : lock.userCount > 0 
                                ? "text-amber-600" 
                                : "text-muted-foreground"
                            }`}>
                              {lock.userCount}/{lock.maxUsers} usuarios
                            </span>
                            {lock.isAssignedToMe && (
                              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                Tu registro
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {lock.isAssignedToMe ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReturn(lock)}
                          disabled={assigning === lock.id}
                          className="text-destructive border-destructive hover:bg-destructive/10"
                        >
                          {assigning === lock.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Devolver"
                          )}
                        </Button>
                      ) : hasSpace ? (
                        <Button
                          size="sm"
                          onClick={() => handleAssign(lock)}
                          disabled={assigning === lock.id}
                        >
                          {assigning === lock.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Pedir"
                          )}
                        </Button>
                      ) : (
                        <span className="text-xs text-destructive font-medium">Lleno</span>
                      )}
                    </div>
                  </div>
                )})}
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
