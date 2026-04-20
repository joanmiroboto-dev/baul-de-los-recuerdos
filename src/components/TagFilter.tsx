import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import TagBadge from './TagBadge';
import { Filter, X } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Tag = Database['public']['Tables']['tags']['Row'];

interface TagFilterProps {
  selectedTagIds: string[];
  onFilterChange: (tagIds: string[]) => void;
}

const categoryOrder = ['year', 'person', 'event', 'place'];
const categoryLabels: Record<string, string> = {
  year: 'Año',
  person: 'Persona',
  event: 'Evento',
  place: 'Lugar',
};

const TagFilter: React.FC<TagFilterProps> = ({ selectedTagIds, onFilterChange }) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching tags:', error);
      } else {
        setTags(data || []);
      }
    };

    fetchTags();
  }, []);

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onFilterChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onFilterChange([...selectedTagIds, tagId]);
    }
  };

  const clearFilters = () => {
    onFilterChange([]);
  };

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  const groupedTags = categoryOrder.reduce((acc, category) => {
    acc[category] = tags.filter((tag) => tag.category === category);
    return acc;
  }, {} as Record<string, Tag[]>);

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={selectedTagIds.length > 0 ? 'secondary' : 'outline'}
            size="sm"
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtrar
            {selectedTagIds.length > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {selectedTagIds.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4 bg-popover" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filtrar por etiquetas</h4>
              {selectedTagIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs h-auto py-1"
                >
                  Limpiar
                </Button>
              )}
            </div>

            {categoryOrder.map((category) => {
              const categoryTags = groupedTags[category];
              if (!categoryTags || categoryTags.length === 0) return null;

              return (
                <div key={category}>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {categoryLabels[category]}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {categoryTags.map((tag) => (
                      <TagBadge
                        key={tag.id}
                        name={tag.name}
                        category={tag.category}
                        size="sm"
                        onClick={() => toggleTag(tag.id)}
                        removable={selectedTagIds.includes(tag.id)}
                        onRemove={() => toggleTag(tag.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Show selected filters as chips */}
      {selectedTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {selectedTags.map((tag) => (
            <TagBadge
              key={tag.id}
              name={tag.name}
              category={tag.category}
              size="sm"
              removable
              onRemove={() => toggleTag(tag.id)}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 px-2 text-xs text-muted-foreground"
          >
            <X className="w-3 h-3 mr-1" />
            Limpiar
          </Button>
        </div>
      )}
    </div>
  );
};

export default TagFilter;
