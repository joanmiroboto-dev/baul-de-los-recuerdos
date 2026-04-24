import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import TagSelector from '@/components/TagSelector';
import { CalendarIcon, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Memory = Database['public']['Tables']['memories']['Row'];

interface EditMemoryDialogProps {
  memory: Memory;
  currentTagIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedMemory: Memory, newTagIds: string[]) => void;
  canDelete?: boolean;
  onDelete?: () => void;
}

const EditMemoryDialog: React.FC<EditMemoryDialogProps> = ({
  memory,
  currentTagIds,
  open,
  onOpenChange,
  onSave,
  canDelete = false,
  onDelete,
}) => {
  const { toast } = useToast();
  const [title, setTitle] = useState(memory.title);
  const [description, setDescription] = useState(memory.description || '');
  const [memoryDate, setMemoryDate] = useState<Date>(new Date(memory.memory_date));
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(currentTagIds);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setTitle(memory.title);
    setDescription(memory.description || '');
    setMemoryDate(new Date(memory.memory_date));
    setSelectedTagIds(currentTagIds);
  }, [memory, currentTagIds, open]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'El título es obligatorio.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      // Update memory
      const { data: updatedMemory, error: memoryError } = await supabase
        .from('memories')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          memory_date: format(memoryDate, 'yyyy-MM-dd'),
        })
        .eq('id', memory.id)
        .select()
        .single();

      if (memoryError) throw memoryError;

      // Update tags: delete existing and insert new
      await supabase.from('memory_tags').delete().eq('memory_id', memory.id);

      if (selectedTagIds.length > 0) {
        const tagInserts = selectedTagIds.map((tagId) => ({
          memory_id: memory.id,
          tag_id: tagId,
        }));
        await supabase.from('memory_tags').insert(tagInserts);
      }

      toast({
        title: 'Guardado',
        description: 'El recuerdo se ha actualizado correctamente.',
      });

      onSave(updatedMemory, selectedTagIds);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating memory:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar los cambios.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // 1. Delete associated tags
      await supabase.from('memory_tags').delete().eq('memory_id', memory.id);
      
      // 2. Delete associated comments
      await supabase.from('comments').delete().eq('memory_id', memory.id);
      
      // 3. Delete the memory itself
      const { error } = await supabase.from('memories').delete().eq('id', memory.id);
      
      if (error) throw error;
      
      toast({
        title: 'Eliminado',
        description: 'El recuerdo ha sido eliminado permanentemente.',
      });
      
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onDelete?.();
    } catch (error) {
      console.error('Error deleting memory:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el recuerdo.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este recuerdo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán también todos los comentarios 
              y etiquetas asociados a este recuerdo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">Editar recuerdo</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-lg">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg"
              placeholder="Nombre del recuerdo"
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="text-lg">Fecha del recuerdo</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal text-lg',
                    !memoryDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {memoryDate ? format(memoryDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={memoryDate}
                  onSelect={(date) => date && setMemoryDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-lg">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] text-lg"
              placeholder="Describe este recuerdo..."
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-lg">Etiquetas</Label>
            <TagSelector
              selectedTagIds={selectedTagIds}
              onTagsChange={setSelectedTagIds}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {canDelete && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSaving}
              className="w-full sm:w-auto sm:mr-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar cambios'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default EditMemoryDialog;
