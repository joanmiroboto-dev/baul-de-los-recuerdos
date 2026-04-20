import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'editor' | 'viewer';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-lg text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // No role assigned (not a family member)
  if (!userRole) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 mb-6 rounded-full bg-muted flex items-center justify-center">
          <span className="text-4xl">🔒</span>
        </div>
        <h2 className="text-2xl font-serif text-foreground mb-3">
          Acceso pendiente
        </h2>
        <p className="text-lg text-muted-foreground max-w-md mb-6">
          Tu cuenta aún no tiene acceso a la Caja de Galletas.
          Contacta con el administrador de la familia para que te invite.
        </p>
      </div>
    );
  }

  // Check specific role if required
  if (requiredRole) {
    const roleHierarchy = { admin: 3, editor: 2, viewer: 1 };
    const hasPermission = roleHierarchy[userRole] >= roleHierarchy[requiredRole];

    if (!hasPermission) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 mb-6 rounded-full bg-muted flex items-center justify-center">
            <span className="text-4xl">🚫</span>
          </div>
          <h2 className="text-2xl font-serif text-foreground mb-3">
            Sin permisos
          </h2>
          <p className="text-lg text-muted-foreground max-w-md">
            No tienes los permisos necesarios para acceder a esta sección.
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
