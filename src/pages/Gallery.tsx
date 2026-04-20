import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Clock, Plus, Loader2, Image, Video, Grid3X3 } from 'lucide-react';
import TagFilter from '@/components/TagFilter';
import { useMemories, MemoryWithTags } from '@/hooks/useMemories';
import { SearchBar } from '@/components/SearchBar';
import { useInView } from 'react-intersection-observer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const Gallery: React.FC = () => {
  const navigate = useNavigate();
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useMemories({ 
    searchQuery, 
    tagIds: filterTagIds,
    pageSize: 12 
  });

  const allMemories = data?.pages.flatMap(page => page) || [];

  const { ref, inView } = useInView();
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const getMemoryTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      default: return <Image className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d MMM yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Header con gradiente */}
      <header className="relative px-4 sm:px-6 py-6 bg-gradient-to-b from-card to-background border-b border-border/50 sticky top-0 z-20">
        {/* Decoración */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary/5 to-transparent pointer-events-none" />
        
        <div className="max-w-6xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="hover:bg-primary/10">
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center">
                  <Grid3X3 className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl md:text-3xl font-serif text-primary">Galería</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="gold" size="sm" className="gap-2" onClick={() => navigate('/upload')}>
                <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Agregar</span>
              </Button>
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/timeline')}>
                <Clock className="w-5 h-5" /> <span className="hidden sm:inline">Timeline</span>
              </Button>
            </div>
          </div>

          <div className="w-full max-w-md mx-auto sm:mx-0">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="px-4 sm:px-6 py-4 border-b border-border/30 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <TagFilter selectedTagIds={filterTagIds} onFilterChange={setFilterTagIds} />
        </div>
      </div>

      {/* Contenido */}
      <main className="px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 animate-pulse bg-muted rounded-xl" />
              ))}
            </div>
          ) : allMemories.length === 0 ? (
            <div className="text-center py-20">
              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/30 dark:to-amber-900/30 flex items-center justify-center">
                  <Image className="w-12 h-12 text-muted-foreground/50" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-card border-2 border-border flex items-center justify-center text-2xl">
                  📷
                </div>
              </div>
              <h2 className="text-xl font-serif text-foreground mb-2">
                {searchQuery || filterTagIds.length > 0 ? 'No se encontraron resultados' : 'Aún no hay recuerdos'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {searchQuery ? 'Prueba con otros términos.' : '¡Empieza a subir tus fotos y videos!'}
              </p>
              {!searchQuery && filterTagIds.length === 0 && (
                <Button variant="gold" onClick={() => navigate('/upload')} className="gap-2">
                  <Plus className="w-5 h-5" />
                  Subir primera foto
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Grid de recuerdos (Masonry Scrapbook) */}
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-6 space-y-4 sm:space-y-6">
                {allMemories.map((memory, index) => (
                  <Card
                    key={memory.id}
                    onClick={() => navigate(`/memory/${memory.id}`)}
                    className={cn(
                      "cursor-pointer break-inside-avoid overflow-hidden transition-all duration-500",
                      "bg-white dark:bg-card p-3 sm:p-4 pb-6 sm:pb-8 rounded-sm shadow-md border border-neutral-200 dark:border-neutral-800",
                      "hover:shadow-2xl hover:scale-[1.02] hover:-rotate-1 hover:z-10",
                      "group animate-fade-in relative"
                    )}
                    style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                  >
                    {/* Cinta adhesiva decorativa */}
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-6 bg-white/50 backdrop-blur-md border border-white/20 rotate-[-2deg] z-20 shadow-sm" />
                    <div className="aspect-square relative bg-muted overflow-hidden rounded-sm">
                      {memory.thumbnail_url ? (
                        <img 
                          src={memory.thumbnail_url} 
                          alt={memory.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          {getMemoryTypeIcon(memory.memory_type)}
                        </div>
                      )}
                      
                      {/* Overlay en hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Badge de tipo */}
                      <Badge 
                        variant="secondary" 
                        className="absolute top-3 right-3 text-xs bg-card/90 backdrop-blur shadow-sm"
                      >
                        {memory.memory_type === 'video' ? (
                          <Video className="w-3 h-3 mr-1" />
                        ) : memory.memory_type === 'pdf' ? (
                          <span className="mr-1">📄</span>
                        ) : (
                          <Image className="w-3 h-3 mr-1" />
                        )}
                        <span className="capitalize">{memory.memory_type}</span>
                      </Badge>
                    </div>
                    
                    <CardContent className="p-4">
                      <h3 className="font-serif text-lg text-primary line-clamp-1 mb-1 group-hover:text-amber-700 transition-colors">
                        {memory.title}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                        <Clock className="w-3 h-3" />
                        {formatDate(memory.memory_date)}
                      </p>
                      
                      {memory.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {memory.tags.slice(0, 3).map((tag) => (
                            <Badge 
                              key={tag.id} 
                              variant="outline" 
                              className="text-[10px] px-2 py-0 h-5"
                            >
                              {tag.name}
                            </Badge>
                          ))}
                          {memory.tags.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-2 py-0 h-5">
                              +{memory.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Loading more */}
              <div ref={ref} className="py-8 flex justify-center w-full">
                {isFetchingNextPage && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Cargando más...</span>
                  </div>
                )}
                {!hasNextPage && allMemories.length > 0 && (
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-100 to-rose-100 dark:from-amber-900/30 dark:to-rose-900/30 flex items-center justify-center">
                      ✨
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Has visto todas las fotos
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Gallery;
