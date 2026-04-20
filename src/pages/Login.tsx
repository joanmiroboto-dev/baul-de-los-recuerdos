import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import iconoCaja from '@/assets/icono_caja_de_galletas.png';
const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const {
    signIn,
    user
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor, introduce tu correo y contraseña.',
        variant: 'destructive'
      });
      return;
    }
    setIsLoading(true);
    const {
      error
    } = await signIn(email, password);
    if (error) {
      let message = 'No pudimos iniciar sesión. Verifica tus datos.';
      if (error.message.includes('Invalid login credentials')) {
        message = 'Correo o contraseña incorrectos.';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Tu correo aún no ha sido confirmado.';
      }
      toast({
        title: 'Error al entrar',
        description: message,
        variant: 'destructive'
      });
      setIsLoading(false);
      return;
    }
    toast({
      title: '¡Bienvenido!',
      description: 'Has entrado a tu Caja de Galletas.'
    });
    navigate('/');
    setIsLoading(false);
  };
  return <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Decorative background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo/Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-4 border-accent shadow-gold mb-6 overflow-hidden bg-muted">
            <img alt="Caja de Galletas" className="w-24 h-24 object-contain" src="/lovable-uploads/9b89a977-03d4-4b4a-a3ab-303290191641.png" />
          </div>
          <h1 className="text-4xl md:text-5xl text-primary mb-3 font-serif">
            Mi Caja de Galletas
          </h1>
          <p className="text-muted-foreground font-extralight text-xl">
            Donde guardamos los recuerdos de la familia
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-card rounded-3xl p-8 md:p-10 shadow-elevated border-2 border-border opacity-75 py-[20px] px-[20px]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-xl font-medium flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Correo electrónico
              </Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" className="input-accessible" autoComplete="email" aria-describedby="email-help" />
            </div>

            <div className="space-y-3">
              <Label htmlFor="password" className="text-xl font-medium flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Contraseña
              </Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input-accessible pr-14" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-2" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full mt-8" disabled={isLoading}>
              {isLoading ? <span className="flex items-center gap-3">
                  <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Entrando...
                </span> : 'Entrar'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-muted-foreground">
              Esta es una aplicación privada familiar.
              <br />
              <span className="text-primary font-medium">
                Solo el administrador puede invitar nuevos miembros.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>;
};
export default Login;