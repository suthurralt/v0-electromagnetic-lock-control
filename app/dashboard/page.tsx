"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, Lock, Unlock, Plus, History } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function DashboardPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? null)
        // Extraer username del email ficticio
        const email = user.email ?? ""
        if (email.endsWith("@lock.app")) {
          setUsername(email.replace("@lock.app", ""))
        } else {
          setUsername(user.user_metadata?.username ?? email)
        }
      }
    })
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
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
              <p className="text-xs text-muted-foreground">{username}</p>
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
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground">Bienvenido</h2>
            <p className="text-muted-foreground mt-2">Que deseas hacer?</p>
          </div>

          {/* Menu Options */}
          <div className="space-y-4">
            <Button
              variant="default"
              size="lg"
              className="w-full h-20 text-lg flex items-center justify-center gap-3"
              onClick={() => router.push("/dashboard/abrir")}
            >
              <Unlock className="h-6 w-6" />
              Abrir Locker
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full h-20 text-lg flex items-center justify-center gap-3"
              onClick={() => router.push("/dashboard/pedir")}
            >
              <Plus className="h-6 w-6" />
              Pedir Locker
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full h-20 text-lg flex items-center justify-center gap-3"
              onClick={() => router.push("/dashboard/historial")}
            >
              <History className="h-6 w-6" />
              Historial de Accesos
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
