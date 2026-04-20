import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  BookOpen, 
  Users, 
  Images, 
  Clock, 
  LogOut, 
  Plus,
  Settings,
  Heart,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Dashboard: React.FC = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const quickAccessItems = [
    {
      icon: Clock,
      label: 'Ver Historia',
      description: 'Línea del tiempo',
      path: '/timeline',
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      borderColor: 'hover:border-amber-300',
    },
    {
      icon: Images,
      label: 'Álbumes',
      description: 'Galería de fotos',
      path: '/gallery',
      color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
      borderColor: 'hover:border-rose-300',
    },
    {
      icon: Users,
      label: 'Personas',
      description: 'Familiares',
      path: '/gallery?filter=people',
      color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      borderColor: 'hover:border-teal-300',
    },
  ];

  const canEdit = userRole === 'admin' || userRole === 'editor';

  const getRoleInfo = () => {
    switch (userRole) {
      case 'admin':
        return {
          title: 'Administrador',
          description: 'Tienes acceso completo. Puedes añadir recuerdos, invitar familiares y gestionar todo.',
          icon: '👑',
        };
      case 'editor':
        return {
          title: 'Editor',
          description: 'Puedes ver todos los recuerdos y añadir nuevos. ¡Comparte momentos especiales!',
          icon: '✏️',
        };
      case 'viewer':
        return {
          title: 'Visitante',
          description: 'Puedes ver todos los recuerdos y dejar comentarios de voz. ¡Disfruta recordando!',
          icon: '👀',
        };
      default:
        return null;
    }
  };

  const roleInfo = getRoleInfo();

  return (
    <div className="min-h-screen pb-24">
      {/* Header con textura de cuero inspirada en baúl */}
      <header className="relative px-6 py-12 lg:py-16 bg-gradient-to-br from-[#8B4513] via-[#5C2E0B] to-[#3A1D07] text-white shadow-[0_10px_40px_-10px_rgba(139,69,19,0.5)] overflow-hidden rounded-b-[2rem] sm:rounded-b-[3rem] border-b-[12px] border-amber-900/40">
        {/* Textura de ruido tipo cuero/papel antiguo */}
        <div 
          className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
        />
        
        <div className="max-w-4xl mx-auto relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              {/* Logo/Avatar mejorado */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                  <BookOpen className="w-10 h-10 text-white" strokeWidth={1.5} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-card border-2 border-border flex items-center justify-center text-lg">
                  🍪
                </div>
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-serif text-amber-50 drop-shadow-md">
                  Mi Caja de Galletas
                </h1>
                <p className="text-amber-200/90 mt-2 flex items-center gap-2 text-lg">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  Bienvenido, {user?.email?.split('@')[0]}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {userRole === 'admin' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/admin')}
                  aria-label="Configuración"
                  className="hover:bg-primary/10"
                >
                  <Settings className="w-6 h-6" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="gap-2"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Quick Access - Tarjetas mejoradas */}
          <section className="mb-10">
            <h2 className="text-2xl font-serif text-foreground mb-6 flex items-center gap-3">
              <span className="w-1 h-8 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full" />
              ¿Qué quieres ver hoy?
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {quickAccessItems.map((item, index) => (
                <Card
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "cursor-pointer transition-all duration-300 hover:shadow-lg",
                    "border-2 border-transparent hover:border-primary/20",
                    "bg-card/80 backdrop-blur hover:bg-card",
                    "group",
                    item.borderColor
                  )}
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                    animation: 'fade-in 0.5s ease-out forwards',
                    opacity: 0
                  }}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
                      item.color
                    )}>
                      <item.icon className="w-8 h-8" strokeWidth={1.5} />
                    </div>
                    <div>
                      <span className="text-xl font-serif text-foreground block">
                        {item.label}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {item.description}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Add Memory Button - Mejorado */}
          {canEdit && (
            <section className="mb-10">
              <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 overflow-hidden">
                <CardContent className="p-2">
                  <Button
                    variant="gold"
                    size="xl"
                    className="w-full gap-4 py-8 text-lg shadow-md hover:shadow-lg transition-shadow"
                    onClick={() => navigate('/upload')}
                  >
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Añadir nuevo recuerdo</div>
                      <div className="text-sm opacity-80">Comparte un momento especial</div>
                    </div>
                  </Button>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Welcome message for users - Mejorado */}
          {roleInfo && (
            <section className="relative overflow-hidden">
              <Card className="border-2 border-border shadow-warm bg-card/80 backdrop-blur">
                {/* Decoración */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-transparent rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl" />
                
                <CardContent className="p-8 relative">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{roleInfo.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-serif text-primary mb-2 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-rose-500" />
                        Tu rol: {roleInfo.title}
                      </h3>
                      <p className="text-muted-foreground text-lg leading-relaxed">
                        {roleInfo.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
