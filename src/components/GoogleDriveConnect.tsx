import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link2, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleDriveConnectProps {
  onConnectionChange?: (connected: boolean, email?: string) => void;
}

export default function GoogleDriveConnect({ onConnectionChange }: GoogleDriveConnectProps) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  const checkConnection = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tokens_google')
        .select('google_email')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      const connected = !!data?.google_email;
      setIsConnected(connected);
      setGoogleEmail(data?.google_email || null);
      onConnectionChange?.(connected, data?.google_email || undefined);
    } catch (error) {
      console.error('Error checking connection:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, onConnectionChange]);

  useEffect(() => {
    checkConnection();
    
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === 'true') {
      toast.success('Google Drive conectado correctamente');
      window.history.replaceState({}, '', window.location.pathname);
      checkConnection();
    }
    if (params.get('google_error')) {
      toast.error(`Error al conectar: ${params.get('google_error')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [checkConnection]);

  const handleConnect = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión primero');
      return;
    }

    setIsConnecting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No hay sesión activa');
      }

      const { data, error } = await supabase.functions.invoke('google-auth', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error('No se recibió URL de autorización');
      }
    } catch (error: unknown) {
      console.error('Connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al conectar: ${errorMessage}`);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tokens_google')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setIsConnected(false);
      setGoogleEmail(null);
      onConnectionChange?.(false);
      toast.success('Google Drive desconectado');
    } catch (error: unknown) {
      console.error('Disconnect error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al desconectar: ${errorMessage}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Verificando conexión...</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Google Drive conectado</span>
        </div>
        {googleEmail && (
          <p className="text-sm text-muted-foreground">{googleEmail}</p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          className="w-fit"
        >
          Desconectar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-amber-600">
        <AlertCircle className="h-5 w-5" />
        <span>Google Drive no conectado</span>
      </div>
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        className="w-fit"
      >
        {isConnecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Conectando...
          </>
        ) : (
          <>
            <Link2 className="mr-2 h-4 w-4" />
            Conectar Google Drive
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground">
        Los archivos se guardarán en tu Google Drive personal de forma privada.
      </p>
    </div>
  );
}
