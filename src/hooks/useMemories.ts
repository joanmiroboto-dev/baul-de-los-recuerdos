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
      // Si hay etiquetas, usamos la función RPC para filtro estricto (AND)
      if (tagIds.length > 0) {
        const { data, error } = await supabase.rpc('get_memories_with_tags_strict', {
          search_query: searchQuery,
          filter_tag_ids: tagIds,
          sort_ascending: sortAscending,
          page_size: pageSize,
          page_offset: pageParam * pageSize
        });

        if (error) throw error;
        return (data || []) as MemoryWithTags[];
      }

      // Si no hay etiquetas, usamos la consulta normal (más eficiente para casos simples)
      let query = supabase
        .from('memories')
        .select(`*, memory_tags(tag_id, tags(*))`)
        .order('memory_date', { ascending: sortAscending })
        .range(pageParam * pageSize, (pageParam + 1) * pageSize - 1);

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((memory: any) => ({
        ...memory,
        tags: memory.memory_tags?.map((mt: any) => mt.tags).filter(Boolean) || [],
      })) as MemoryWithTags[];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === pageSize ? allPages.length : undefined;
    },
  });
};
