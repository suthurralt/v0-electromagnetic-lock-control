import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ESP_IP         = Deno.env.get("ESP8266_IP")!       // ej: "192.168.1.42"
const ESP_SECRET     = Deno.env.get("ESP8266_SECRET")!   // mismo token que en el Arduino
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!
const SUPABASE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 })
  }

  // Verificar que el usuario está autenticado
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const token = authHeader.replace("Bearer ", "")
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401 })
  }

  // Verificar que el nfc_id pertenece al usuario (doble check de seguridad)
  const { nfc_id } = await req.json()
  const { data: userLock } = await supabase
    .from("user_locks")
    .select("id")
    .eq("user_id", user.id)
    .ilike("nfc_id", nfc_id)
    .single()

  if (!userLock) {
    return new Response(JSON.stringify({ error: "Acceso no autorizado" }), { status: 403 })
  }

  // Llamar a la ESP8266
  try {
    const espResponse = await fetch(`http://${ESP_IP}/open`, {
      method: "POST",
      headers: { "X-Api-Secret": ESP_SECRET },
      signal: AbortSignal.timeout(4000), // 4s timeout
    })

    if (!espResponse.ok) {
      throw new Error(`ESP respondió ${espResponse.status}`)
    }

    const espData = await espResponse.json()
    return new Response(JSON.stringify({ success: true, esp: espData }), { status: 200 })

  } catch (err) {
    console.error("Error contactando ESP8266:", err)
    return new Response(
      JSON.stringify({ error: "No se pudo contactar la cerradura", detail: String(err) }),
      { status: 502 }
    )
  }
})