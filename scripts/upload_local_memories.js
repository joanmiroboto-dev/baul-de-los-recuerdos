import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import crypto from 'crypto'

// Configuración de rutas
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const LOCAL_FOLDER = "C:\\Users\\Joanmi Roboto\\Downloads\\CAJA DE GALLETAS\\CAJA DE GALLETAS"

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Falta la URL o la Service Role Key en el .env")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

// Mapeo de meses para parsear nombres de ChatGPT
const MESES = {
  'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
  'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
}

function parseMetadata(filename) {
  let date = new Date().toISOString().split('T')[0] // Default hoy
  let title = filename.replace(/\.[^/.]+$/, "") // Quitar extensión

  // Caso 1: ChatGPT Image 21 dic 2025...
  const chatGPTMatch = filename.match(/(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\s+(\d{4})/i)
  if (chatGPTMatch) {
    const day = chatGPTMatch[1].padStart(2, '0')
    const month = MESES[chatGPTMatch[2].toLowerCase()]
    const year = chatGPTMatch[3]
    date = `${year}-${month}-${day}`
  }
  // Caso 2: 20251214_1222...
  else if (filename.match(/^\d{8}_\d{4}/)) {
    const year = filename.substring(0, 4)
    const month = filename.substring(4, 6)
    const day = filename.substring(6, 8)
    date = `${year}-${month}-${day}`
  }

  return { title, date }
}

function getMemoryType(ext) {
  const e = ext.toLowerCase()
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(e)) return 'image'
  if (['.mp4', '.mov', '.avi', '.webm'].includes(e)) return 'video'
  if (['.pdf'].includes(e)) return 'pdf'
  return 'document'
}

function getContentType(ext, type) {
  const e = ext.toLowerCase().slice(1)
  if (type === 'image') return `image/${e === 'jpg' ? 'jpeg' : e}`
  if (type === 'video') return `video/${e === 'mov' ? 'quicktime' : e}`
  if (type === 'pdf') return 'application/pdf'
  return undefined
}

async function uploadFiles() {
  console.log("🚚 Iniciando trasvase de recuerdos...")

  try {
    const files = fs.readdirSync(LOCAL_FOLDER)
    console.log(`📂 Encontrados ${files.length} archivos en la carpeta.`)

    for (const file of files) {
      const filePath = path.join(LOCAL_FOLDER, file)
      const stats = fs.statSync(filePath)
      
      if (stats.isDirectory()) continue

      const ext = path.extname(file)
      const { title, date } = parseMetadata(file)
      const type = getMemoryType(ext)

      console.log(`\n📄 Procesando: "${file}"`)

      // 0. Verificar si ya existe por título original (evitar duplicados)
      const { data: existing } = await supabase
        .from('memories')
        .select('id')
        .ilike('description', `%(${file})%`)
        .maybeSingle()

      if (existing) {
        console.log(`⏭️ Saltando "${file}": Ya fue importado anteriormente.`)
        continue
      }
      
      // 1. Subir al Storage
      const fileBuffer = fs.readFileSync(filePath)
      const storagePath = `${crypto.randomUUID()}${ext}`
      
      const { data: storageData, error: storageError } = await supabase.storage
        .from('memories')
        .upload(storagePath, fileBuffer, {
          contentType: getContentType(ext, type),
          upsert: true
        })

      if (storageError) {
        console.error(`❌ Error subiendo "${file}":`, storageError.message)
        continue
      }

      const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/memories/${storagePath}`
      console.log(`✅ Subido a Storage: ${storagePath}`)

      // 2. Crear registro en la tabla memories
      const { error: dbError } = await supabase
        .from('memories')
        .insert({
          title: title,
          description: `Recuerdo importado de Drive (${file})`,
          file_url: fileUrl,
          memory_type: type,
          memory_date: date,
          // user_id lo dejamos nulo o podrías asignar uno si tenés el ID del admin
        })

      if (dbError) {
        console.error(`❌ Error en DB para "${file}":`, dbError.message)
      } else {
        console.log(`🎉 ¡Recuerdo registrado con éxito!`)
      }
    }

    console.log("\n✨ ¡TRASVASE COMPLETADO! Ya podés ver todo en tu baúl.")

  } catch (err) {
    console.error("💥 Error fatal:", err.message)
  }
}

uploadFiles()
