import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type Memory = Database['public']['Tables']['memories']['Row'];
export type Tag = Database['public']['Tables']['tags']['Row'];

export interface MemoryWithTags extends Memory {
  tags: Tag[];
}

interface MemoryTagsRelation {
  tag_id: string;
  tags: Tag;
}

interface MemoryRow {
  id: string;
  created_at: string;
  title: string;
  description: string | null;
  file_url: string;
  memory_date: string;
  memory_type: Database['public']['Enums']['memory_type'];
  thumbnail_url: string | null;
  unlock_date: string | null;
  updated_at: string;
  uploaded_by: string | null;
  memory_tags: MemoryTagsRelation[] | null;
}

interface UseMemoriesOptions {
  searchQuery?: string;
  tagIds?: string[];
  pageSize?: number;
  sortAscending?: boolean;
}

export const useMemories = ({ 
  searchQuery = '', 
  tagIds = [], 
  pageSize = 12,
  sortAscending = false 
}: UseMemoriesOptions = {}) => {
  return useInfiniteQuery({
    queryKey: ['memories', searchQuery, tagIds, sortAscending],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      // Construimos el string de selección dependiendo de si hay filtro
      const selectQuery = tagIds.length > 0 
        ? `*, memory_tags!inner(tag_id, tags(*))`
        : `*, memory_tags!left(tag_id, tags(*))`;

      // Construimos la consulta base
      let query = supabase
        .from('memories')
        .select(selectQuery)
        .order('memory_date', { ascending: sortAscending })
        .range(pageParam * pageSize, (pageParam + 1) * pageSize - 1);

      // Si hay etiquetas seleccionadas, filtramos a nivel de base de datos
      if (tagIds.length > 0) {
        query = query.in('memory_tags.tag_id', tagIds);
      }

      // Búsqueda por texto en título o descripción
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transformamos los datos
      let memories = (data || []).map((memory: MemoryRow) => ({
        ...memory,
        tags: memory.memory_tags?.map((mt: MemoryTagsRelation) => mt.tags).filter(Boolean) || [],
      })) as MemoryWithTags[];

      return memories;
    },
    getNextPageParam: (lastPage, allPages) => {
      // Si recibimos menos resultados que el tamaño de página, no hay más páginas
      return lastPage.length === pageSize ? allPages.length : undefined;
    },
  });
};
