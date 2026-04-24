import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  UserPlus, 
  Trash2, 
  Loader2,
  Shield,
  Edit,
  Users,
  Tags
} from 'lucide-react';
import { z } from 'zod';
import TagManager from '@/components/TagManager';

interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: 'superadmin' | 'admin' | 'editor' | 'viewer' | null;
  createdAt: string;
}

interface AdminFunctionError {
  message?: string;
}

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) return (err as AdminFunctionError).message || 'Error desconocido';
  return 'Error desconocido';
};

const createUserSchema = z.object({
  email: z.string().trim().email({ message: 'Email inválido' }),
  displayName: z.string().trim().min(1, { message: 'Nombre requerido' }).max(100),
  password: z.string().min(8, { message: 'Mínimo 8 caracteres' }),
  role: z.enum(['superadmin', 'admin', 'editor', 'viewer']),
});

const Admin: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Create user dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    password: '',
    role: 'viewer' as 'superadmin' | 'admin' | 'editor' | 'viewer',
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Edit role dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<'superadmin' | 'admin' | 'editor' | 'viewer'>('viewer');

  // Delete confirmation dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list' },
      });

      if (error) throw error;
      setUsers(data.users || []);
    } catch (err: unknown) {
      console.error('Error fetching users:', err);
      toast({
        title: 'Error',
        description: getErrorMessage(err) || 'No se pudieron cargar los usuarios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async () => {
    // Validate
    const result = createUserSchema.safeParse(newUser);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setCreateErrors(errors);
      return;
    }

    try {
      setActionLoading(true);
      setCreateErrors({});

      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { 
          action: 'create',
          email: newUser.email.trim(),
          displayName: newUser.displayName.trim(),
          password: newUser.password,
          role: newUser.role,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: 'Usuario creado',
        description: `${newUser.displayName} ha sido añadido como ${newUser.role}`,
      });

      setShowCreateDialog(false);
      setNewUser({ email: '', displayName: '', password: '', role: 'viewer' });
      fetchUsers();
    } catch (err: unknown) {
      console.error('Error creating user:', err);
      toast({
        title: 'Error al crear usuario',
        description: getErrorMessage(err) || 'No se pudo crear el usuario',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingUser) return;

    try {
      setActionLoading(true);

      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { 
          action: 'update-role',
          userId: editingUser.id,
          role: newRole,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: 'Rol actualizado',
        description: `${editingUser.displayName} ahora es ${newRole}`,
      });

      setShowEditDialog(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err: unknown) {
      console.error('Error updating role:', err);
      toast({
        title: 'Error al actualizar rol',
        description: getErrorMessage(err) || 'No se pudo actualizar el rol',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      setActionLoading(true);

      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { 
          action: 'delete',
          userId: deletingUser.id,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: 'Usuario eliminado',
        description: `${deletingUser.displayName} ha sido eliminado`,
      });

      setShowDeleteDialog(false);
      setDeletingUser(null);
      fetchUsers();
    } catch (err: unknown) {
      console.error('Error deleting user:', err);
      toast({
        title: 'Error al eliminar usuario',
        description: getErrorMessage(err) || 'No se pudo eliminar el usuario',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case 'superadmin':
      case 'admin':
        return 'destructive';
      case 'editor':
        return 'default';
      case 'viewer':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'superadmin':
        return 'Superadmin';
      case 'admin':
        return 'Administrador';
      case 'editor':
        return 'Editor';
      case 'viewer':
        return 'Visitante';
      default:
        return 'Sin rol';
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="px-6 py-6 bg-card border-b-2 border-border">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                aria-label="Volver"
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-serif text-primary">
                    Administración
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Gestiona usuarios y etiquetas
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="gold"
              className="gap-2"
              onClick={() => setShowCreateDialog(true)}
            >
              <UserPlus className="w-5 h-5" />
              <span className="hidden sm:inline">Invitar</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="users" className="gap-2">
                <Users className="w-4 h-4" />
                Usuarios
              </TabsTrigger>
              <TabsTrigger value="tags" className="gap-2">
                <Tags className="w-4 h-4" />
                Etiquetas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-20">
                  <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-serif text-foreground mb-2">
                    No hay usuarios
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Invita a tu primer miembro de la familia
                  </p>
                  <Button
                    variant="gold"
                    className="gap-2"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <UserPlus className="w-5 h-5" />
                    Invitar familiar
                  </Button>
                </div>
              ) : (
                <div className="bg-card rounded-xl border-2 border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-lg">Usuario</TableHead>
                        <TableHead className="text-lg">Rol</TableHead>
                        <TableHead className="text-lg hidden sm:table-cell">Creado</TableHead>
                        <TableHead className="text-lg text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">
                                {user.displayName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {getRoleLabel(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString('es-ES')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingUser(user);
                                  setNewRole(user.role || 'viewer');
                                  setShowEditDialog(true);
                                }}
                                disabled={user.id === currentUser?.id}
                                aria-label="Editar rol"
                              >
                                <Edit className="w-5 h-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDeletingUser(user);
                                  setShowDeleteDialog(true);
                                }}
                                disabled={user.id === currentUser?.id}
                                className="text-destructive hover:text-destructive"
                                aria-label="Eliminar"
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tags">
              <TagManager />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Invitar familiar
            </DialogTitle>
            <DialogDescription>
              Crea una cuenta para un nuevo miembro de la familia
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nombre</Label>
              <Input
                id="displayName"
                value={newUser.displayName}
                onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                placeholder="Nombre para mostrar"
              />
              {createErrors.displayName && (
                <p className="text-sm text-destructive">{createErrors.displayName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="correo@ejemplo.com"
              />
              {createErrors.email && (
                <p className="text-sm text-destructive">{createErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña temporal</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Mínimo 8 caracteres"
              />
              {createErrors.password && (
                <p className="text-sm text-destructive">{createErrors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select
                value={newUser.role}
                onValueChange={(value: 'superadmin' | 'admin' | 'editor' | 'viewer') => 
                  setNewUser({ ...newUser, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <img src="/assets/icons/viewer.png" alt="Viewer" className="w-5 h-5 rounded-sm object-cover" />
                      <span>Visitante - Solo ver y comentar</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex items-center gap-2">
                      <img src="/assets/icons/editor.png" alt="Editor" className="w-5 h-5 rounded-sm object-cover" />
                      <span>Editor - Puede añadir recuerdos</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <img src="/assets/icons/admin.png" alt="Admin" className="w-5 h-5 rounded-sm object-cover" />
                      <span>Admin - Control total familiar</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="superadmin">
                    <div className="flex items-center gap-2">
                      <img src="/assets/icons/superadmin.png" alt="Superadmin" className="w-5 h-5 rounded-sm object-cover" />
                      <span>Superadmin - Puede borrar recuerdos</span>
                    </div>
                  </SelectItem>
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
              onClick={handleCreateUser}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Crear usuario'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Cambiar rol
            </DialogTitle>
            <DialogDescription>
              Cambia el rol de {editingUser?.displayName}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select
              value={newRole}
              onValueChange={(value: 'superadmin' | 'admin' | 'editor' | 'viewer') => setNewRole(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Visitante</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="superadmin">Superadmin</SelectItem>
              </SelectContent>
            </Select>
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
              onClick={handleUpdateRole}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Eliminar usuario
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar a{' '}
              <strong>{deletingUser?.displayName}</strong>? Esta acción no se puede deshacer.
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
              onClick={handleDeleteUser}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Eliminar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
