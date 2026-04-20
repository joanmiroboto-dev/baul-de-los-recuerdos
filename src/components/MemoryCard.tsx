import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Image, Video, FileText } from 'lucide-react';
import type { MemoryWithTags } from '@/hooks/useMemories';
import { cn } from '@/lib/utils';

interface MemoryCardProps {
  memory: MemoryWithTags;
  variant: 'grid' | 'timeline';
  className?: string;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, variant, className }) => {
  const navigate = useNavigate();

  const getMemoryTypeIcon = () => {
    switch (memory.memory_type) {
      case 'video':
        return <Video className="w-6 h-6" />;
      case 'pdf':
        return <FileText className="w-6 h-6" />;
      default:
        return <Image className="w-6 h-6" />;
    }
  };

  const getMemoryTypeBadge = () => {
    switch (memory.memory_type) {
      case 'video':
        return <Badge variant="secondary" className="absolute top-2 right-2">Video</Badge>;
      case 'pdf':
        return <Badge variant="secondary" className="absolute top-2 right-2">PDF</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d 'de' MMMM 'de' yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  const isLocked = memory.unlock_date ? new Date(memory.unlock_date) > new Date() : false;

  const handleClick = () => {
    if (isLocked) return; // No permitimos navegar si está bloqueado
    navigate(`/memory/${memory.id}`);
  };

  if (variant === 'timeline') {
    return (
      <div 
        onClick={handleClick}
        className={cn(
          "flex gap-4 p-4 bg-card rounded-xl border-2 cursor-pointer transition-all hover:shadow-warm",
          isLocked ? "border-muted opacity-80" : "border-border hover:border-primary/30",
          className
        )}
      >
        <div className="flex-shrink-0 w-32 h-24 rounded-lg overflow-hidden bg-muted relative">
          {isLocked ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 border border-slate-700/50">
               <div className="absolute inset-0 bg-white/5 backdrop-blur-xl" />
               <span className="text-2xl z-10">🔒</span>
            </div>
          ) : memory.thumbnail_url ? (
            <img 
              src={memory.thumbnail_url} 
              alt={memory.title}
              className="w-full h-full object-cover sepia-[.40] contrast-[1.10] brightness-90 saturate-[.85]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              {getMemoryTypeIcon()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn("font-serif text-lg truncate", isLocked ? "text-primary/60 italic" : "text-primary")}>
            {isLocked ? "Recuerdo Protegido" : memory.title}
          </h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <Calendar className="w-4 h-4" />
            {formatDate(memory.memory_date)}
          </p>
          {memory.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {memory.description}
            </p>
          )}
          {memory.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {memory.tags.slice(0, 3).map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
              {memory.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{memory.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card 
      onClick={handleClick}
      className={cn(
        "cursor-pointer break-inside-avoid overflow-hidden transition-all duration-500",
        "bg-white dark:bg-card p-3 sm:p-4 pb-6 sm:pb-8 rounded-sm shadow-md border border-neutral-200 dark:border-neutral-800",
        "hover:shadow-2xl hover:scale-[1.02] hover:-rotate-1 hover:z-10",
        "group relative",
        className
      )}
    >
      {/* Cinta adhesiva decorativa */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-6 bg-white/50 backdrop-blur-md border border-white/20 rotate-[-2deg] z-20 shadow-sm" />
      <div className="aspect-square relative bg-muted overflow-hidden rounded-sm">
        {isLocked ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-slate-900 border border-slate-700/50 overflow-hidden relative">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl" />
            <div className="z-10 bg-black/60 p-4 w-[85%] rounded-xl backdrop-blur-md flex flex-col items-center shadow-2xl border border-white/10">
              <span className="text-4xl mb-2">🔒</span>
              <p className="font-serif text-base text-amber-50 font-bold text-center leading-tight">Cápsula<br/>del Tiempo</p>
              <p className="text-[10px] text-amber-400 mt-2 uppercase tracking-widest text-center">
                Abre el {memory.unlock_date && format(new Date(memory.unlock_date), "dd/MM/yy")}
              </p>
            </div>
          </div>
        ) : memory.thumbnail_url ? (
          <img 
            src={memory.thumbnail_url} 
            alt={memory.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 sepia-[.35] contrast-[1.15] brightness-[0.85] saturate-[.80]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            {getMemoryTypeIcon()}
          </div>
        )}
        {!isLocked && getMemoryTypeBadge()}
      </div>
      <CardContent className="p-4">
        <h3 className={cn("font-serif text-lg truncate", isLocked ? "text-primary/60 italic text-center" : "text-primary")}>
          {isLocked ? "Misterio a futuro..." : memory.title}
        </h3>
        {!isLocked && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <Calendar className="w-4 h-4" />
            {formatDate(memory.memory_date)}
          </p>
        )}
        {memory.tags.length > 0 && !isLocked && (
          <div className="flex flex-wrap gap-1 mt-3">
            {memory.tags.slice(0, 2).map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-xs">
                {tag.name}
              </Badge>
            ))}
            {memory.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{memory.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
        {isLocked && (
           <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-2">
            Faltan cerrar los ojos y esperar
          </p>
        )}
      </CardContent>
    </Card>
  );
};
