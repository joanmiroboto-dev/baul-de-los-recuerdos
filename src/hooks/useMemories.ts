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
      // Construimos la consulta base
      let query = supabase
        .from('memories')
        .select(`
          *,
          memory_tags!left (
            tag_id,
            tags (*)
          )
        `)
        .order('memory_date', { ascending: sortAscending })
        .range(pageParam * pageSize, (pageParam + 1) * pageSize - 1);

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

      // Filtrado de etiquetas en cliente
      if (tagIds.length > 0) {
        memories = memories.filter(memory => 
          memory.tags.some((tag: Tag) => tagIds.includes(tag.id))
        );
      }

      return memories;
    },
    getNextPageParam: (lastPage, allPages) => {
      // Si recibimos menos resultados que el tamaño de página, no hay más páginas
      return lastPage.length === pageSize ? allPages.length : undefined;
    },
  });
};
