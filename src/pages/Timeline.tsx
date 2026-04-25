import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Grid, Plus, Loader2, Clock, Image, Video } from 'lucide-react';
import TagFilter from '@/components/TagFilter';
import { SearchBar } from '@/components/SearchBar';
import { useMemories, MemoryWithTags } from '@/hooks/useMemories';
import { useInView } from 'react-intersection-observer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const Timeline: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [filterTagIds, setFilterTagIds] = useState<string[]>(
    searchParams.get('tag') ? [searchParams.get('tag')!] : []
  );

  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useMemories({ 
    searchQuery, 
    tagIds: filterTagIds,
    pageSize: 10,
    sortAscending: true 
  });

  const allMemories = data?.pages.flatMap(page => page) || [];

  const { ref, inView } = useInView();
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const groupedMemories = allMemories.reduce((acc, memory) => {
    const year = new Date(memory.memory_date).getFullYear();
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(memory);
    return acc;
  }, {} as Record<number, MemoryWithTags[]>);

  const years = Object.keys(groupedMemories).map(Number).sort((a, b) => a - b);

  const getMemoryTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      default: return <Image className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d 'de' MMMM", { locale: es });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Header con gradiente sutil */}
      <header className="px-6 py-6 bg-gradient-to-b from-card to-background border-b border-border sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-2xl md:text-3xl font-serif text-primary">
                  Línea del Tiempo
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="gold" size="sm" className="gap-2" onClick={() => navigate('/upload')}>
                <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Agregar</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/gallery')}>
                <Grid className="w-5 h-5" /> <span className="hidden sm:inline">Galería</span>
              </Button>
            </div>
          </div>

          <div className="w-full">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
        </div>
      </header>

      {/* Filtros con estilo más suave */}
      <div className="px-6 py-4 bg-card/30 border-b border-border/50">
        <div className="max-w-4xl mx-auto">
          <TagFilter selectedTagIds={filterTagIds} onFilterChange={setFilterTagIds} />
        </div>
      </div>

      {/* Contenido */}
      <main className="px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <div className="space-y-12">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-24 bg-muted rounded-lg" />
                    <div className="h-px flex-1 bg-muted" />
                  </div>
                  <div className="space-y-4 pl-0 sm:pl-8">
                    <div className="h-32 bg-muted rounded-xl" />
                    <div className="h-32 bg-muted rounded-xl ml-8" />
                  </div>
                </div>
              ))}
            </div>
          ) : allMemories.length === 0 ? (
            <div className="text-center py-20">
              <div className="relative inline-block mb-6">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                  <Clock className="w-14 h-14 text-primary/40" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-card border-2 border-border flex items-center justify-center text-2xl">
                  📷
                </div>
              </div>
              <h2 className="text-2xl font-serif text-foreground mb-3">
                {searchQuery || filterTagIds.length > 0 
                  ? 'No se encontraron recuerdos' 
                  : 'Tu historia espera ser contada'}
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                {searchQuery 
                  ? 'Prueba con otros términos de búsqueda.'
                  : 'Añade tu primera foto o video para comenzar tu línea del tiempo familiar.'}
              </p>
              <Button variant="gold" onClick={() => navigate('/upload')} className="gap-2">
                <Plus className="w-5 h-5" />
                Añadir primer recuerdo
              </Button>
            </div>
          ) : (
            <div className="relative">
              {/* Línea vertical principal */}
              <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-primary/30 via-border to-primary/30 hidden sm:block" />

              {/* Puntos decorativos en la línea */}
              <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-4 -translate-x-1/2 hidden sm:block">
                {years.map((year, index) => (
                  <div 
                    key={year}
                    className="absolute w-3 h-3 rounded-full bg-card border-2 border-primary/40 transform -translate-x-1/2 transition-all duration-300"
                    style={{ 
                      top: `${(index * 100) / years.length}%`,
                    }}
                  />
                ))}
              </div>

              <div className="space-y-12 sm:pl-4">
                {years.map((year, yearIndex) => (
                  <div key={year} className="relative">
                    {/* Encabezado del Año */}
                    <div className="flex items-center gap-4 mb-8">
                      {/* Año en badge */}
                      <div className="sticky top-28 z-10">
                        <div className="flex items-center gap-2 bg-card border-2 border-primary/20 px-4 py-2 rounded-full shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          <span className="text-xl font-serif font-bold text-primary">
                            {year}
                          </span>
                        </div>
                      </div>
                      
                      {/* Línea decorativa */}
                      <div className="flex-1 h-px bg-gradient-to-r from-primary/20 via-border to-transparent" />
                      
                      {/* Contador de recuerdos */}
                      <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{groupedMemories[year].length} {groupedMemories[year].length === 1 ? 'recuerdo' : 'recuerdos'}</span>
                      </div>
                    </div>

                    {/* Grid de Recuerdos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      {groupedMemories[year].map((memory, memoryIndex) => (
                        <div 
                          key={memory.id}
                          className="animate-fade-in"
                          style={{ animationDelay: `${(yearIndex * 50) + (memoryIndex * 30)}ms` }}
                        >
                          <Card 
                            onClick={() => navigate(`/memory/${memory.id}`)}
                            className={cn(
                              "cursor-pointer overflow-hidden transition-all duration-300",
                              "hover:shadow-lg hover:border-primary/30 hover:-translate-y-1",
                              "border-2 border-border/60 bg-card/80 backdrop-blur"
                            )}
                          >
                            <div className="flex">
                              {/* Thumbnail */}
                              <div className="w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 bg-muted relative overflow-hidden">
                                {memory.thumbnail_url ? (
                                  <>
                                    <img 
                                      src={memory.thumbnail_url} 
                                      alt={memory.title}
                                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-110 relative z-10"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                                      }}
                                    />
                                    <div className="fallback-icon hidden absolute inset-0 w-full h-full flex items-center justify-center text-muted-foreground">
                                      {getMemoryTypeIcon(memory.memory_type)}
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    {getMemoryTypeIcon(memory.memory_type)}
                                  </div>
                                )}
                                {/* Badge de tipo */}
                                <Badge 
                                  variant="secondary" 
                                  className="absolute top-2 right-2 text-xs bg-card/90 backdrop-blur"
                                >
                                  {memory.memory_type === 'video' ? (
                                    <Video className="w-3 h-3 mr-1" />
                                  ) : memory.memory_type === 'pdf' ? (
                                    <span className="mr-1">📄</span>
                                  ) : (
                                    <Image className="w-3 h-3 mr-1" />
                                  )}
                                </Badge>
                              </div>

                              {/* Contenido */}
                              <CardContent className="flex-1 p-3 sm:p-4 flex flex-col justify-between">
                                <div>
                                  <h3 className="font-serif text-base text-primary line-clamp-2 leading-tight">
                                    {memory.title}
                                  </h3>
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(memory.memory_date)}
                                  </p>
                                </div>
                                
                                {memory.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {memory.tags.slice(0, 2).map((tag) => (
                                      <Badge 
                                        key={tag.id} 
                                        variant="outline" 
                                        className="text-[10px] px-1.5 py-0 h-5"
                                      >
                                        {tag.name}
                                      </Badge>
                                    ))}
                                    {memory.tags.length > 2 && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                                        +{memory.tags.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </div>
                          </Card>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Footer de la timeline */}
                <div className="relative pt-8">
                  <div className="absolute left-6 sm:left-8 top-0 w-px h-8 bg-gradient-to-b from-primary/30 to-transparent hidden sm:block" />
                  <div ref={ref} className="flex justify-center w-full">
                    {isFetchingNextPage && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Cargando más recuerdos...</span>
                      </div>
                    )}
                    {!hasNextPage && allMemories.length > 0 && (
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                          ✨
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Has llegado al final de la historia
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Timeline;
