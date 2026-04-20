import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { uploadAudioToDrive } from '@/lib/uploadAudioToDrive';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import VoiceRecorderButton from '@/components/VoiceRecorderButton';
import TagBadge from '@/components/TagBadge';
import EditMemoryDialog from '@/components/EditMemoryDialog';
import EditCommentDialog from '@/components/EditCommentDialog';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Image, 
  Video, 
  FileText, 
  Send,
  Calendar,
  User,
  Pencil,
  Heart,
  MessageCircle,
  Clock
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Memory = Database['public']['Tables']['memories']['Row'];
type Comment = Database['public']['Tables']['comments']['Row'];
type Tag = Database['public']['Tables']['tags']['Row'];

interface CommentWithProfile extends Comment {
  profiles?: {
    display_name: string;
  } | null;
}

const MemoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [memory, setMemory] = useState<Memory | null>(null);
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [editMemoryOpen, setEditMemoryOpen] = useState(false);
  const [editCommentOpen, setEditCommentOpen] = useState(false);
  const [commentToEdit, setCommentToEdit] = useState<CommentWithProfile | null>(null);

  const { 
    isRecording, 
    isSupported, 
    audioBlob,
    error: audioError,
    duration,
    analyserData,
    startRecording,
    stopRecording,
    clearRecording 
  } = useAudioRecorder();

  const getAudioUrl = (audioUrl: string | null): string | null => {
    if (!audioUrl) return null;
    if (!audioUrl.startsWith('http')) {
      return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audio-proxy?fileId=${audioUrl}`;
    }
    const match = audioUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (match) {
      return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audio-proxy?fileId=${match[1]}`;
    }
    return audioUrl;
  };

  useEffect(() => {
    if (audioError) {
      toast({
        title: 'Error de grabación',
        description: audioError,
        variant: 'destructive',
      });
    }
  }, [audioError, toast]);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setUserRole(data.role);
      }
    };
    fetchUserRole();
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      setLoading(true);

      const { data: memoryData, error: memoryError } = await supabase
        .from('memories')
        .select('*')
        .eq('id', id)
        .single();

      if (memoryError) {
        console.error('Error fetching memory:', memoryError);
        toast({
          title: 'Error',
          description: 'No se pudo cargar el recuerdo.',
          variant: 'destructive',
        });
        navigate('/gallery');
        return;
      }

      setMemory(memoryData);

      const { data: memoryTagsData } = await supabase
        .from('memory_tags')
        .select('tag_id')
        .eq('memory_id', id);

      if (memoryTagsData && memoryTagsData.length > 0) {
        const tagIds = memoryTagsData.map(mt => mt.tag_id);
        const { data: tagsData } = await supabase
          .from('tags')
          .select('*')
          .in('id', tagIds);
        
        if (tagsData) {
          setTags(tagsData);
        }
      }

      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('memory_id', id)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('Error fetching comments:', commentsError);
      } else if (commentsData) {
        const authorIds = [...new Set(commentsData.map(c => c.author_id).filter(Boolean))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', authorIds);
        
        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
        
        const commentsWithProfiles: CommentWithProfile[] = commentsData.map(comment => ({
          ...comment,
          profiles: comment.author_id ? profilesMap.get(comment.author_id) || null : null,
        }));
        
        setComments(commentsWithProfiles);
      }

      setLoading(false);
    };

    fetchData();
  }, [id, navigate, toast]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasText = newComment.trim().length > 0;
    const hasAudio = audioBlob !== null;
    
    if (!hasText && !hasAudio) {
      toast({
        title: 'Comentario vacío',
        description: 'Escribe algo o graba un audio para compartir tu historia.',
        variant: 'destructive',
      });
      return;
    }

    if (!user || !id) return;

    setIsSubmitting(true);
    let audioUrl: string | null = null;

    if (hasAudio && audioBlob) {
      setIsUploading(true);
      const uploadResult = await uploadAudioToDrive(audioBlob, user.id);
      setIsUploading(false);
      
      if (!uploadResult.success) {
        toast({
          title: 'Error al subir audio',
          description: uploadResult.error || 'No se pudo subir el audio a Google Drive',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      audioUrl = uploadResult.audioUrl || null;
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        memory_id: id,
        author_id: user.id,
        content: hasText ? newComment.trim() : null,
        audio_url: audioUrl,
        is_audio: hasAudio,
        is_audio_transcription: false,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar tu historia.',
        variant: 'destructive',
      });
    } else if (data) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const newCommentWithProfile: CommentWithProfile = {
        ...data,
        profiles: profileData || null,
      };
      
      setComments((prev) => [...prev, newCommentWithProfile]);
      setNewComment('');
      clearRecording();
      toast({
        title: '¡Historia guardada!',
        description: 'Tu recuerdo ha quedado registrado.',
      });
    }

    setIsSubmitting(false);
  };

  const canEditMemory = () => {
    if (!user || !memory) return false;
    return userRole === 'admin' || userRole === 'editor' || memory.uploaded_by === user.id;
  };

  const canEditComment = (comment: CommentWithProfile) => {
    if (!user) return false;
    return userRole === 'admin' || comment.author_id === user.id;
  };

  const handleMemorySaved = (updatedMemory: Memory, newTagIds: string[]) => {
    setMemory(updatedMemory);
    supabase
      .from('tags')
      .select('*')
      .in('id', newTagIds)
      .then(({ data }) => {
        setTags(data || []);
      });
  };

  const handleMemoryDeleted = () => {
    navigate('/gallery');
  };

  const handleCommentSaved = (updatedComment: Comment) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === updatedComment.id
          ? { ...c, content: updatedComment.content }
          : c
      )
    );
    setCommentToEdit(null);
  };

  const openEditComment = (comment: CommentWithProfile) => {
    setCommentToEdit(comment);
    setEditCommentOpen(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'pdf':
        return <FileText className="w-5 h-5" />;
      default:
        return <Image className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d 'de' MMMM 'de' yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  const formatCommentDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d MMM yyyy, HH:mm", { locale: es });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!memory) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
          <Image className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-serif text-foreground mb-4">
          Recuerdo no encontrado
        </h2>
        <Button onClick={() => navigate('/gallery')}>
          Volver a la galería
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header mejorado */}
      <header className="relative px-4 sm:px-6 py-4 bg-gradient-to-b from-card to-background border-b border-border/50 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-serif text-primary truncate">
              {memory.title}
            </h1>
          </div>
          {canEditMemory() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMemoryOpen(true)}
              className="gap-2"
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
          )}
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Media Display - Mejorado */}
          <section className="relative rounded-2xl overflow-hidden border-2 border-border shadow-warm">
            {/* Decoración de esquinas */}
            <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-primary/10 to-transparent z-10" />
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/10 to-transparent z-10" />
            
            {memory.memory_type === 'image' && (
              <img
                src={memory.file_url}
                alt={memory.title}
                className="w-full max-h-[70vh] object-contain bg-muted"
              />
            )}
            {memory.memory_type === 'video' && (
              <video
                src={memory.file_url}
                controls
                className="w-full max-h-[70vh]"
                poster={memory.thumbnail_url || undefined}
              >
                Tu navegador no soporta la reproducción de video.
              </video>
            )}
            {memory.memory_type === 'pdf' && (
              <div className="aspect-video bg-gradient-to-br from-secondary to-secondary/50 flex flex-col items-center justify-center gap-4 p-8">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-primary" />
                </div>
                <Button onClick={() => window.open(memory.file_url, '_blank')}>
                  Abrir documento
                </Button>
              </div>
            )}
          </section>

          {/* Memory Info - Mejorado */}
          <section className="relative">
            <Card className="border-2 border-border shadow-warm overflow-hidden">
              {/* Gradiente decorativo */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-400/10 to-transparent" />
              
              <CardContent className="p-6 sm:p-8">
                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
                    {getTypeIcon(memory.memory_type)}
                    <span className="capitalize">{memory.memory_type}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent-foreground text-sm">
                    <Calendar className="w-4 h-4" />
                    {formatDate(memory.memory_date)}
                  </div>
                </div>
                
                <h2 className="text-3xl sm:text-4xl font-serif text-foreground mb-4">
                  {memory.title}
                </h2>
                
                {memory.description && (
                  <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                    {memory.description}
                  </p>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-border/50">
                    {tags.map((tag) => (
                      <TagBadge
                        key={tag.id}
                        name={tag.name}
                        category={tag.category}
                        onClick={() => navigate(`/gallery?tag=${tag.id}`)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Comments Section - Mejorado */}
          <section className="relative">
            <Card className="border-2 border-border shadow-warm overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-rose-400/10 to-transparent" />
              
              <CardContent className="p-6 sm:p-8">
                {/* Header con icono */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif text-foreground">
                      Historias y recuerdos
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      {comments.length} {comments.length === 1 ? 'comentario' : 'comentarios'}
                    </p>
                  </div>
                </div>

                {/* Existing Comments */}
                {comments.length > 0 && (
                  <div className="space-y-4 mb-8">
                    {comments.map((comment, index) => (
                      <div
                        key={comment.id}
                        className="relative bg-secondary/30 rounded-xl p-5 border border-border/50 hover:border-border transition-colors group animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <span className="font-medium text-foreground">
                                {comment.profiles?.display_name || 'Familiar'}
                              </span>
                              <span className="text-xs text-muted-foreground ml-2 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatCommentDate(comment.created_at)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {comment.is_audio && (
                              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                                <Video className="w-3 h-3" /> Audio
                              </span>
                            )}
                            {canEditComment(comment) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditComment(comment)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                                aria-label="Editar comentario"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {comment.content && (
                          <p className="text-base leading-relaxed ml-10">{comment.content}</p>
                        )}
                        
                        {comment.audio_url && (
                          <div className="mt-3 ml-10">
                            <audio 
                              controls 
                              src={getAudioUrl(comment.audio_url) || undefined}
                              className="w-full max-w-md h-10"
                              preload="metadata"
                            >
                              Tu navegador no soporta la reproducción de audio.
                            </audio>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment Form - Mejorado */}
                <form onSubmit={handleSubmitComment} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      <VoiceRecorderButton
                        isRecording={isRecording}
                        isSupported={isSupported}
                        isUploading={isUploading}
                        duration={duration}
                        hasRecording={audioBlob !== null}
                        audioBlob={audioBlob}
                        analyserData={analyserData}
                        onStartRecording={startRecording}
                        onStopRecording={stopRecording}
                        onClearRecording={clearRecording}
                      />
                    </div>

                    <div className="flex-1 w-full space-y-3">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="¿Qué recuerdas de este momento? (opcional si grabas audio)"
                        className="min-h-[120px] text-base resize-none"
                        aria-label="Tu historia o comentario"
                      />
                      
                      <Button
                        type="submit"
                        disabled={(!newComment.trim() && !audioBlob) || isSubmitting || isRecording}
                        className={cn(
                          "w-full sm:w-auto gap-2 py-6",
                          "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600",
                          "text-white font-medium"
                        )}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {isUploading ? 'Subiendo audio...' : 'Guardando...'}
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            Guardar historia
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      {memory && (
        <EditMemoryDialog
          memory={memory}
          currentTagIds={tags.map((t) => t.id)}
          open={editMemoryOpen}
          onOpenChange={setEditMemoryOpen}
          onSave={handleMemorySaved}
          isAdmin={userRole === 'admin'}
          onDelete={handleMemoryDeleted}
        />
      )}

      {commentToEdit && (
        <EditCommentDialog
          comment={commentToEdit}
          open={editCommentOpen}
          onOpenChange={setEditCommentOpen}
          onSave={handleCommentSaved}
        />
      )}
    </div>
  );
};

export default MemoryDetail;
