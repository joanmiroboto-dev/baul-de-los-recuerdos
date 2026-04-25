import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Falta la URL o la Service Role Key en el .env")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

async function fixThumbnails() {
  console.log("🛠️  Iniciando reparación de miniaturas...")

  try {
    // 1. Buscar memorias que no tengan thumbnail_url
    const { data: memories, error: fetchError } = await supabase
      .from('memories')
      .select('id, file_url, thumbnail_url, title')
      .is('thumbnail_url', null)

    if (fetchError) throw fetchError

    if (!memories || memories.length === 0) {
      console.log("✅ No se encontraron memorias con miniaturas faltantes.")
      return
    }

    console.log(`🔍 Encontradas ${memories.length} memorias para reparar.`)

    for (const memory of memories) {
      console.log(`🔧 Reparando: "${memory.title}"...`)
      
      const { error: updateError } = await supabase
        .from('memories')
        .update({ thumbnail_url: memory.file_url })
        .eq('id', memory.id)

      if (updateError) {
        console.error(`❌ Error actualizando "${memory.title}":`, updateError.message)
      } else {
        console.log(`✅ Miniatura vinculada para "${memory.title}"`)
      }
    }

    console.log("\n✨ ¡REPARACIÓN COMPLETADA!")
    
  } catch (err) {
    console.error("💥 Error fatal:", err.message)
  }
}

fixThumbnails()
