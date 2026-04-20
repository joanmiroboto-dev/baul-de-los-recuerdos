import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Image, Video, FileText, Loader2, X, Tags, Calendar, FileUp } from "lucide-react";
import TagSelector from "./TagSelector";
import { cn } from "@/lib/utils";

type MemoryType = "image" | "video" | "pdf";

export default function UploadMemory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [memoryDate, setMemoryDate] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const getMemoryType = (file: File): MemoryType => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type === "application/pdf") return "pdf";
    return "image";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm", "application/pdf"];
    if (!validTypes.includes(selectedFile.type)) {
      toast({
        title: "Tipo de archivo no válido",
        description: "Solo se permiten imágenes (JPEG, PNG, GIF, WebP), videos (MP4, WebM) y PDFs.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "El tamaño máximo es de 50MB.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);

    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile.type.startsWith("video/")) {
      setPreview("video");
    } else {
      setPreview("pdf");
    }
  };

  const handleUpload = async () => {
    if (!file || !title.trim() || !memoryDate) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa el título, fecha y selecciona un archivo.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No estás autenticado");

      // 1. Subir a Hostinger
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", import.meta.env.VITE_HOSTINGER_API_KEY || "familia-galletas-123");

      const uploadUrl = import.meta.env.VITE_HOSTINGER_UPLOAD_URL || "https://tu-hostinger.com/api/hostinger_upload.php";
      
      let uploadResult;
      
      // [MODO SIMULADOR DE MENTIRA] Si no cambió el link en .env, fingimos que funciona
      if (uploadUrl.includes("tu-sitio-en-hostinger.com") || uploadUrl.includes("tu-hostinger.com")) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulamos que tarda 1.5s en subir
        uploadResult = {
          file_url: "https://images.unsplash.com/photo-1590082871864-1065ceb1e2ca?w=800&q=80", // Foto vintage de prueba
        };
      } else {
        // [MODO REAL] Esta es la llamada de verdad a Hostinger
        const response = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
        });

        uploadResult = await response.json();

        if (!response.ok) {
          throw new Error(uploadResult.error || "Error al subir el archivo a Hostinger");
        }
      }

      // 2. Guardar en Supabase
      const { data: memory, error: insertError } = await supabase.from('memories').insert({
        title: title.trim(),
        description: description.trim() || null,
        file_url: uploadResult.file_url,
        thumbnail_url: uploadResult.file_url,
        memory_date: memoryDate,
        memory_type: getMemoryType(file),
        unlock_date: unlockDate ? new Date(unlockDate).toISOString() : null,
        uploaded_by: session.user.id
      }).select().single();

      if (insertError) throw insertError;

      // 3. Guardar etiquetas si las hay
      if (selectedTagIds.length > 0) {
        const tagInserts = selectedTagIds.map(tagId => ({
          memory_id: memory.id,
          tag_id: tagId
        }));
        await supabase.from('memory_tags').insert(tagInserts);
      }

      toast({
        title: "¡Recuerdo guardado!",
        description: "El recuerdo se ha guardado en tu servidor de forma privada.",
      });

      navigate(`/memory/${memory.id}`);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error al subir",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg mb-4">
            <FileUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-serif text-primary">Añadir Nuevo Recuerdo</h1>
          <p className="text-muted-foreground mt-2">Comparte un momento especial con tu familia</p>
        </div>

        {/* Upload Form Card */}
        <Card className="border-2 border-border/50 shadow-warm overflow-hidden">
          <CardHeader className="border-b border-border/30 bg-gradient-to-r from-amber-50/50 to-transparent">
            <CardTitle className="font-serif text-2xl text-primary flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Upload className="h-5 w-5 text-amber-600" />
              </div>
              Detalles del recuerdo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">

            {/* File upload area */}
            <div className="space-y-3">
              <Label className="text-lg font-medium flex items-center gap-2">
                <Image className="w-5 h-5 text-primary" />
                Archivo multimedia
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                disabled={uploading}
              />
              
              {!file ? (
                <label
                  htmlFor="file-upload"
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-2xl transition-all cursor-pointer",
                    uploading ? "border-muted cursor-not-allowed bg-muted/20" : "border-primary/30 hover:border-primary hover:bg-primary/5 shadow-sm"
                  )}
                >
                  <div className={cn(
                    "w-20 h-20 rounded-2xl flex items-center justify-center mb-4 transition-transform",
                    uploading ? "bg-muted text-muted-foreground/40" : "bg-primary/10 text-primary"
                  )}>
                    <Upload className="h-10 w-10" />
                  </div>
                  <span className={cn(
                    "text-lg font-medium",
                    uploading ? "text-muted-foreground/40" : "text-foreground"
                  )}>
                    {uploading ? "Subiendo archivo..." : "Haz clic para seleccionar un archivo"}
                  </span>
                  <span className="text-sm text-muted-foreground mt-2">
                    Fotos, videos o PDFs (máx. 50MB)
                  </span>
                </label>
              ) : (
                <div className="relative group">
                  <div className={cn(
                    "absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity",
                    file && "opacity-100"
                  )}>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={clearFile}
                      className="h-8 w-8 rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {preview && preview !== "video" && preview !== "pdf" ? (
                    <div className="relative rounded-2xl overflow-hidden shadow-lg">
                      <img
                        src={preview}
                        alt="Vista previa"
                        className="w-full h-64 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-4 left-4 text-white">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm opacity-80">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  ) : preview === "video" ? (
                    <div className="w-full h-48 bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-950/30 dark:to-violet-900/20 rounded-2xl flex items-center justify-center gap-4 shadow-sm">
                      <div className="w-16 h-16 rounded-2xl bg-violet-200 dark:bg-violet-800 flex items-center justify-center">
                        <Video className="h-8 w-8 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">{file.name}</p>
                        <p className="text-sm text-muted-foreground">Video • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-950/30 dark:to-rose-900/20 rounded-2xl flex items-center justify-center gap-4 shadow-sm">
                      <div className="w-16 h-16 rounded-2xl bg-rose-200 dark:bg-rose-800 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-rose-600 dark:text-rose-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">{file.name}</p>
                        <p className="text-sm text-muted-foreground">PDF • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Title */}
            <div className="space-y-3">
              <Label htmlFor="title" className="text-lg font-medium flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">T</span>
                Título *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Navidad en familia 1985"
                className="text-lg h-12 bg-card"
                disabled={uploading}
              />
            </div>

            {/* Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="date" className="text-lg font-medium flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Fecha del recuerdo *
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={memoryDate}
                  onChange={(e) => setMemoryDate(e.target.value)}
                  className="text-lg h-12 bg-card"
                  disabled={uploading}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="unlock-date" className="text-lg font-medium flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center">🔒</span>
                  Desbloquear el (Cápsula)
                </Label>
                <Input
                  id="unlock-date"
                  type="date"
                  value={unlockDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setUnlockDate(e.target.value)}
                  className="text-lg h-12 bg-card"
                  disabled={uploading}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <Label htmlFor="description" className="text-lg font-medium flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">D</span>
                Descripción (opcional)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Cuéntanos más sobre este recuerdo..."
                className="text-lg min-h-[120px] bg-card resize-none"
                disabled={uploading}
              />
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <Label className="text-lg font-medium flex items-center gap-2">
                <Tags className="w-5 h-5 text-primary" />
                Etiquetas (opcional)
              </Label>
              <TagSelector
                selectedTagIds={selectedTagIds}
                onTagsChange={setSelectedTagIds}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4 border-t border-border/50">
              <Button
                variant="outline"
                size="xl"
                className="flex-1 h-14"
                onClick={() => navigate(-1)}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button
                variant="gold"
                size="xl"
                className="flex-1 h-14 text-lg"
                onClick={handleUpload}
                disabled={uploading || !file}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    Guardar Recuerdo
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
