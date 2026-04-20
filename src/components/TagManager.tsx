import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import TagBadge from './TagBadge';
import { Plus, Loader2, Trash2, Edit } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Tag = Database['public']['Tables']['tags']['Row'];

const categoryOrder = ['year', 'person', 'event', 'place'];
const categoryLabels: Record<string, string> = {
  year: '📅 Año',
  person: '👤 Persona',
  event: '🎉 Evento',
  place: '📍 Lugar',
};

const TagManager: React.FC = () => {
  const { toast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Create dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagCategory, setNewTagCategory] = useState<string>('year');

  // Edit dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editName, setEditName] = useState('');

  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('category')
      .order('name');

    if (error) {
      console.error('Error fetching tags:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las etiquetas',
        variant: 'destructive',
      });
    } else {
      setTags(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setActionLoading(true);
    const { error } = await supabase.from('tags').insert({
      name: newTagName.trim(),
      category: newTagCategory,
    });

    if (error) {
      console.error('Error creating tag:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la etiqueta',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Etiqueta creada',
        description: `"${newTagName.trim()}" añadida correctamente`,
      });
      setNewTagName('');
      setShowCreateDialog(false);
      fetchTags();
    }
    setActionLoading(false);
  };

  const handleEditTag = async () => {
    if (!editingTag || !editName.trim()) return;

    setActionLoading(true);
    const { error } = await supabase
      .from('tags')
      .update({ name: editName.trim() })
      .eq('id', editingTag.id);

    if (error) {
      console.error('Error updating tag:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la etiqueta',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Etiqueta actualizada',
        description: `Cambios guardados correctamente`,
      });
      setShowEditDialog(false);
      setEditingTag(null);
      fetchTags();
    }
    setActionLoading(false);
  };

  const handleDeleteTag = async () => {
    if (!deletingTag) return;

    setActionLoading(true);
    const { error } = await supabase.from('tags').delete().eq('id', deletingTag.id);

    if (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la etiqueta',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Etiqueta eliminada',
        description: `"${deletingTag.name}" eliminada correctamente`,
      });
      setShowDeleteDialog(false);
      setDeletingTag(null);
      fetchTags();
    }
    setActionLoading(false);
  };

  const groupedTags = categoryOrder.reduce((acc, category) => {
    acc[category] = tags.filter((tag) => tag.category === category);
    return acc;
  }, {} as Record<string, Tag[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Gestiona las etiquetas para clasificar recuerdos
        </p>
        <Button
          variant="gold"
          size="sm"
          className="gap-2"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="w-4 h-4" />
          Nueva Etiqueta
        </Button>
      </div>

      {/* Tags grouped by category */}
      <div className="space-y-6">
        {categoryOrder.map((category) => {
          const categoryTags = groupedTags[category];

          return (
            <div key={category} className="bg-card rounded-xl p-5 border border-border">
              <h4 className="text-lg font-medium mb-4">{categoryLabels[category]}</h4>
              {categoryTags.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No hay etiquetas en esta categoría
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {categoryTags.map((tag) => (
                    <div key={tag.id} className="flex items-center gap-1">
                      <TagBadge name={tag.name} category={tag.category} />
                      <button
                        onClick={() => {
                          setEditingTag(tag);
                          setEditName(tag.name);
                          setShowEditDialog(true);
                        }}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        aria-label="Editar"
                      >
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingTag(tag);
                          setShowDeleteDialog(true);
                        }}
                        className="p-1 rounded hover:bg-destructive/10 transition-colors"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Etiqueta</DialogTitle>
            <DialogDescription>
              Crea una etiqueta para clasificar recuerdos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Nombre</Label>
              <Input
                id="tag-name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Ej: Navidad, Mamá, 1985..."
              />
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={newTagCategory} onValueChange={setNewTagCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">📅 Año</SelectItem>
                  <SelectItem value="person">👤 Persona</SelectItem>
                  <SelectItem value="event">🎉 Evento</SelectItem>
                  <SelectItem value="place">📍 Lugar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="gold"
              onClick={handleCreateTag}
              disabled={actionLoading || !newTagName.trim()}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Etiqueta</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="gold"
              onClick={handleEditTag}
              disabled={actionLoading || !editName.trim()}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar etiqueta?</DialogTitle>
            <DialogDescription>
              Se eliminará "{deletingTag?.name}" y se quitará de todos los recuerdos asociados.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTag}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TagManager;
