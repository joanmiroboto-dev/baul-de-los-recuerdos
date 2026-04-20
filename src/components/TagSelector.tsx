import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import TagBadge from './TagBadge';
import { Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Tag = Database['public']['Tables']['tags']['Row'];

interface TagSelectorProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
}

const categoryOrder = ['year', 'person', 'event', 'place'];
const categoryLabels: Record<string, string> = {
  year: 'Año',
  person: 'Persona',
  event: 'Evento',
  place: 'Lugar',
};

const TagSelector: React.FC<TagSelectorProps> = ({ selectedTagIds, onTagsChange }) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTags = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching tags:', error);
      } else {
        setTags(data || []);
      }
      setLoading(false);
    };

    fetchTags();
  }, []);

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const groupedTags = categoryOrder.reduce((acc, category) => {
    acc[category] = tags.filter((tag) => tag.category === category);
    return acc;
  }, {} as Record<string, Tag[]>);

  // Add uncategorized tags
  const uncategorized = tags.filter((tag) => !tag.category || !categoryOrder.includes(tag.category));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-2">
        No hay etiquetas disponibles. El administrador puede crearlas.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {categoryOrder.map((category) => {
        const categoryTags = groupedTags[category];
        if (!categoryTags || categoryTags.length === 0) return null;

        return (
          <div key={category}>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              {categoryLabels[category]}
            </h4>
            <div className="flex flex-wrap gap-2">
              {categoryTags.map((tag) => (
                <TagBadge
                  key={tag.id}
                  name={tag.name}
                  category={tag.category}
                  onClick={() => toggleTag(tag.id)}
                  removable={selectedTagIds.includes(tag.id)}
                  onRemove={() => toggleTag(tag.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {uncategorized.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Otras</h4>
          <div className="flex flex-wrap gap-2">
            {uncategorized.map((tag) => (
              <TagBadge
                key={tag.id}
                name={tag.name}
                category={tag.category}
                onClick={() => toggleTag(tag.id)}
                removable={selectedTagIds.includes(tag.id)}
                onRemove={() => toggleTag(tag.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagSelector;
