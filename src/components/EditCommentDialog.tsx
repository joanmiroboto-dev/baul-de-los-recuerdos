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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Comment = Database['public']['Tables']['comments']['Row'];

interface EditCommentDialogProps {
  comment: Comment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedComment: Comment) => void;
}

const EditCommentDialog: React.FC<EditCommentDialogProps> = ({
  comment,
  open,
  onOpenChange,
  onSave,
}) => {
  const { toast } = useToast();
  const [content, setContent] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setContent(comment.content);
  }, [comment, open]);

  const handleSave = async () => {
    if (!content.trim()) {
      toast({
        title: 'Error',
        description: 'El comentario no puede estar vacío.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const { data: updatedComment, error } = await supabase
        .from('comments')
        .update({ content: content.trim() })
        .eq('id', comment.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Guardado',
        description: 'El comentario se ha actualizado.',
      });

      onSave(updatedComment);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el comentario.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">Editar comentario</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] text-lg"
            placeholder="Tu historia o comentario..."
          />
        </div>

        <DialogFooter className="gap-2">
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
              'Guardar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditCommentDialog;
