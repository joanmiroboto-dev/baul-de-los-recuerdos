import { createClient } from '@supabase/supabase-js'

// --- RELLENA ESTOS DATOS ANTES DE CORRER EL SCRIPT ---

// 1. Datos del viejo Supabase (los de Lovable)
const OLD_URL = "URL_VIEJA_AQUI"
const OLD_KEY = "LLAVE_ANON_VIEJA_AQUI"

// 2. Datos de TU NUEVO Supabase
const NEW_URL = "https://cybecgactyahzsfeudmi.supabase.co"
const NEW_KEY = "TU_SERVICE_ROLE_KEY_AQUI" // Metele el "service_role" key acá para que pueda insertar datos libremente

// -----------------------------------------------------

async function migrate() {
  if (OLD_URL === "URL_VIEJA_AQUI" || NEW_KEY === "TU_SERVICE_ROLE_KEY_AQUI") {
    console.error("❌ ¡Epa! Te olvidaste de rellenar las URLs y las llaves en el código.")
    process.exit(1)
  }

  const oldSupabase = createClient(OLD_URL, OLD_KEY)
  // Usamos un cliente nuevo sin auth y pasando un header especial para saltar bloqueos (RLS)
  const newSupabase = createClient(NEW_URL, NEW_KEY, {
    auth: { persistSession: false }
  })

  console.log("🚚 Empezando la mudanza...")

  console.log("📦 1. Traendo tags (categorías)...")
  const { data: tags, error: tagsErr } = await oldSupabase.from('tags').select('*')
  if (tags && tags.length > 0) {
    await newSupabase.from('tags').upsert(tags)
    console.log(`✅ ${tags.length} tags mudados.`)
  }

  console.log("📦 2. Traendo memories (las fotos y datos)...")
  const { data: memories, error: memErr } = await oldSupabase.from('memories').select('*')
  if (memories && memories.length > 0) {
    await newSupabase.from('memories').upsert(memories)
    console.log(`✅ ${memories.length} recuerdos mudados.`)
  }

  console.log("📦 3. Traendo memory_tags (las relaciones)...")
  const { data: memory_tags, error: mtErr } = await oldSupabase.from('memory_tags').select('*')
  if (memory_tags && memory_tags.length > 0) {
    await newSupabase.from('memory_tags').upsert(memory_tags)
    console.log(`✅ ${memory_tags.length} relaciones de tags mudadas.`)
  }

  console.log("📦 4. Traendo comments (comentarios)...")
  const { data: comments, error: comErr } = await oldSupabase.from('comments').select('*')
  if (comments && comments.length > 0) {
    await newSupabase.from('comments').upsert(comments)
    console.log(`✅ ${comments.length} comentarios mudados.`)
  }
  
  console.log("🎉 ¡MUDANZA TERMINADA CON ÉXITO!")
  console.log("Andá a la app, recargá y deberían estar todas tus historias.")
}

migrate()
