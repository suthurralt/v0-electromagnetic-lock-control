"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Lock, Mail, Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<"login" | "register">("login")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const supabase = createClient()

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push("/dashboard")
        router.refresh()
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
              `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        setError("Revisa tu email para confirmar tu cuenta")
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-4">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">SmartLocker</h1>
          <p className="text-muted-foreground">
            {mode === "login" ? "Inicia sesion para continuar" : "Crea tu cuenta"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-card-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-card-foreground">Contrasena</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Tu contrasena"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className={`p-3 rounded-lg text-sm ${error.includes("Revisa") ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-lg"
            disabled={loading}
          >
            {loading ? "Cargando..." : mode === "login" ? "Iniciar Sesion" : "Registrarse"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login")
                setError("")
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {mode === "login" ? "No tenes cuenta? Registrate" : "Ya tenes cuenta? Inicia sesion"}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
