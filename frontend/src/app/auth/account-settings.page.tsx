import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, 
  Mail, 
  Key, 
  Link as LinkIcon, 
  Check, 
  X,
  AlertTriangle,
  Shield,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/app/layout/app-layout';
import { accountSettingsService, type ChangePasswordRequest, type EmailAddress } from '@/services/accountSettingsService';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AccountSettingsProps {}

export default function AccountSettings({}: AccountSettingsProps) {
  const [activeSection, setActiveSection] = useState<'email' | 'password' | 'connections'>('email');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailAddresses, setEmailAddresses] = useState<EmailAddress[]>([]);
  
  // Estados para visibilidad de contraseñas
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { user, logout, adminLogout, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Cargar emails del usuario al montar el componente
  useEffect(() => {
    loadEmailAddresses();
  }, []);

  const loadEmailAddresses = async () => {
    try {
      setLoading(true);
      const response = await accountSettingsService.getEmailAddresses();
      setEmailAddresses(response.results);
    } catch (error) {
      console.error('Error cargando emails:', error);
      toast.error("No se pudieron cargar las direcciones de email");
    } finally {
      setLoading(false);
    }
  };

  // Obtener email principal
  const primaryEmail = emailAddresses.find(email => email.primary) || emailAddresses[0];
  const userEmail = primaryEmail?.email || user?.email || '';
  const isEmailVerified = primaryEmail?.verified || false;

  const menuItems = [
    { id: 'email', label: 'Cambiar correo electrónico', icon: Mail },
    { id: 'password', label: 'Cambiar la contraseña', icon: Key },
    { id: 'connections', label: 'Conexiones de Cuenta', icon: LinkIcon },
  ];

  const handleChangeEmail = async () => {
    if (!newEmail) return;
    
    try {
      setLoading(true);
      await accountSettingsService.addEmailAddress({ email: newEmail });
      toast.success("Se ha enviado un email de verificación a la nueva dirección");
      setNewEmail('');
      await loadEmailAddresses(); // Recargar lista de emails
    } catch (error: any) {
      toast.error(error.message || "No se pudo agregar el email");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Todos los campos son requeridos");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas nuevas no coinciden");
      return;
    }

    try {
      setLoading(true);
      const data: ChangePasswordRequest = {
        old_password: currentPassword,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      };
      
      await accountSettingsService.changePassword(data);
      toast.success("Tu contraseña ha sido cambiada exitosamente");
      
      // Limpiar formulario
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "No se pudo cambiar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setLoading(true);
      await accountSettingsService.resendEmailVerification(primaryEmail?.id || 0);
      toast.success("Se ha reenviado el email de verificación");
    } catch (error: any) {
      toast.error(error.message || "No se pudo reenviar la verificación");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!userEmail) {
      toast.error("No se encontró un email asociado a la cuenta");
      return;
    }

    try {
      setLoading(true);
      await accountSettingsService.requestPasswordReset(userEmail);
      toast.success("Se ha enviado un email con instrucciones para restablecer tu contraseña");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "No se pudo enviar el email de restablecimiento");
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      // Usar el logout apropiado según el tipo de usuario
      if (isAdmin) {
        adminLogout();
      } else {
        logout();
      }
      navigate('/admin');
    } catch (error) {
      console.error('Error durante el logout:', error);
  // Forzar redirección al login admin aunque falle el logout
  navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const renderEmailSection = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Direcciones de correo electrónico</h2>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">
          Las siguientes direcciones de correo electrónico están asociadas a su cuenta:
        </p>
      </div>

      {/* Email actual */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <input type="radio" checked readOnly className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-sm sm:text-base">{userEmail}</span>
              </div>
              <Badge variant={isEmailVerified ? "default" : "secondary"} className={`flex items-center gap-1 text-xs ${isEmailVerified ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                <Check className="w-3 h-3" />
                <span className="hidden sm:inline">{isEmailVerified ? 'Verificado Principal' : 'Sin verificar'}</span>
                <span className="sm:hidden">{isEmailVerified ? 'Verificado' : 'Pendiente'}</span>
              </Badge>
            </div>
             <div className="flex flex-wrap gap-2">
               <Button variant="outline" size="sm" disabled={loading} className="text-xs sm:text-sm">
                 <span className="hidden sm:inline">Definir como principal</span>
                 <span className="sm:hidden">Principal</span>
               </Button>
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={handleResendVerification}
                 disabled={loading}
                 className="text-xs sm:text-sm"
               >
                 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                 <span className="hidden sm:inline">Reenviar Verificación</span>
                 <span className="sm:hidden">Reenviar</span>
               </Button>
               <Button 
                 variant="outline" 
                 size="sm" 
                 className="text-red-600 hover:text-red-700 text-xs sm:text-sm"
                 disabled={loading}
               >
                 Eliminar
               </Button>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Agregar nuevo email */}
      <div>
        <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900">Añadir correo electrónico</h3>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-email" className="text-sm sm:text-base">Correo electrónico:</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="Dirección de correo electrónico"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
               <Button 
                 onClick={handleChangeEmail} 
                 disabled={!newEmail || loading}
                 className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
               >
                 {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                 <span className="hidden sm:inline">Añadir correo electrónico</span>
                 <span className="sm:hidden">Añadir email</span>
               </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderPasswordSection = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Cambiar la contraseña</h2>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            <div>
              <Label htmlFor="current-password" className="text-sm sm:text-base">Contraseña actual:</Label>
              <div className="relative mt-1">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Contraseña actual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="new-password" className="text-sm sm:text-base">Nueva contraseña:</Label>
              <div className="relative mt-1">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Nueva contraseña"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              
              {/* Reglas de contraseña */}
              <div className="mt-3 space-y-2 text-xs sm:text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Su contraseña no puede asemejarse tanto a su otra información personal.</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Su contraseña debe contener al menos 8 caracteres.</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Su contraseña no puede ser una clave utilizada comúnmente.</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Su contraseña no puede ser completamente numérica.</span>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-password" className="text-sm sm:text-base">Nueva contraseña (de nuevo):</Label>
              <div className="relative mt-1">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Nueva contraseña (de nuevo)"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

             <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 gap-3">
               <Button 
                 onClick={handleChangePassword} 
                 disabled={!currentPassword || !newPassword || !confirmPassword || loading}
                 className="bg-blue-600 hover:bg-blue-700"
               >
                 {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                 <span className="hidden sm:inline">Cambiar la contraseña</span>
                 <span className="sm:hidden">Cambiar</span>
               </Button>
               <Button 
                 variant="link" 
                 className="text-blue-600 p-0 text-sm"
                 onClick={handlePasswordReset}
                 disabled={loading}
               >
                 ¿Olvidó su contraseña?
               </Button>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderConnectionsSection = () => (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Conexiones de Cuenta</h2>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">
          Actualmente no tiene cuentas de terceros conectadas a esta cuenta.
        </p>
      </div>

      <div>
        <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900">Agregar una cuenta de terceros</h3>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="text-center py-6 sm:py-8">
              <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-blue-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Las conexiones de terceros no están disponibles en este momento.
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                Esta funcionalidad estará disponible en futuras actualizaciones.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

   return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header con botón volver */}
          <div className="mb-4 sm:mb-6">
            <Button 
              variant="outline" 
              onClick={handleGoBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Sidebar del menú */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Menú</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <nav className="space-y-1">
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveSection(item.id as any)}
                          className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 text-sm transition-colors hover:bg-blue-50 ${
                            activeSection === item.id 
                              ? 'text-blue-600 border-r-2 border-blue-600 bg-blue-50' 
                              : 'text-blue-600 hover:text-blue-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{item.label}</span>
                            <span className="sm:hidden">{item.label.split(' ')[0]}</span>
                          </div>
                        </button>
                      );
                    })}
                     <div className="border-t pt-2 mt-2">
                       <button 
                         onClick={handleLogout}
                         disabled={loading}
                         className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                       >
                         {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                         <span className="hidden sm:inline">Cerrar sesión</span>
                         <span className="sm:hidden">Salir</span>
                       </button>
                     </div>
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* Contenido principal */}
            <div className="lg:col-span-3">
              <ScrollArea className="h-[calc(100vh-200px)] sm:h-[calc(100vh-150px)]">
                <div className="p-4 sm:p-6">
                  {activeSection === 'email' && renderEmailSection()}
                  {activeSection === 'password' && renderPasswordSection()}
                  {activeSection === 'connections' && renderConnectionsSection()}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
     </AppLayout>
  );
}
