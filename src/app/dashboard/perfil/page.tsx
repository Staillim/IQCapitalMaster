'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Camera, 
  MapPinned,
  Bell,
  Shield,
  FileText,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  photoURL?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    timestamp?: string;
  };
  termsAccepted?: boolean;
  termsAcceptedDate?: string;
  notifications?: {
    email: boolean;
    push: boolean;
    sms: boolean;
    loans: boolean;
    meetings: boolean;
    transactions: boolean;
  };
}

export default function PerfilPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    photoURL: '',
    location: undefined,
    termsAccepted: false,
    termsAcceptedDate: '',
    notifications: {
      email: true,
      push: true,
      sms: false,
      loans: true,
      meetings: true,
      transactions: true,
    },
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    } else if (user) {
      loadUserProfile();
    }
  }, [user, isUserLoading, router]);

  const loadUserProfile = async () => {
    if (!user) return;

    setLoadingData(true);
    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfile({
          id: user.uid,
          name: data.name || user.displayName || '',
          email: data.email || user.email || '',
          phone: data.phone || '',
          address: data.address || '',
          photoURL: data.photoURL || user.photoURL || '',
          location: data.location,
          termsAccepted: data.termsAccepted || false,
          termsAcceptedDate: data.termsAcceptedDate || '',
          notifications: data.notifications || {
            email: true,
            push: true,
            sms: false,
            loans: true,
            meetings: true,
            transactions: true,
          },
        });
      } else {
        // Si no existe el documento, usar los datos de auth
        setProfile({
          id: user.uid,
          name: user.displayName || '',
          email: user.email || '',
          phone: '',
          address: '',
          photoURL: user.photoURL || '',
          location: undefined,
          termsAccepted: false,
          termsAcceptedDate: '',
          notifications: {
            email: true,
            push: true,
            sms: false,
            loans: true,
            meetings: true,
            transactions: true,
          },
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el perfil',
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona una imagen válida',
        variant: 'destructive',
      });
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'La imagen no debe superar los 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingPhoto(true);
    try {
      // Convertir imagen a base64
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        // Actualizar en Firestore
        const userDocRef = doc(firestore, 'users', user.uid);
        await setDoc(userDocRef, { photoURL: base64String }, { merge: true });

        // NO actualizar en Auth porque no acepta base64 (strings muy largos)
        // El photoURL se mantiene solo en Firestore

        setProfile({ ...profile, photoURL: base64String });

        toast({
          title: 'Foto actualizada',
          description: 'Tu foto de perfil ha sido actualizada exitosamente',
        });
        
        setUploadingPhoto(false);
      };

      reader.onerror = () => {
        toast({
          title: 'Error',
          description: 'No se pudo leer la imagen',
          variant: 'destructive',
        });
        setUploadingPhoto(false);
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Error',
        description: 'No se pudo subir la foto',
        variant: 'destructive',
      });
      setUploadingPhoto(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Error',
        description: 'Tu navegador no soporta geolocalización',
        variant: 'destructive',
      });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date().toISOString(),
        };

        setProfile({ ...profile, location });
        setGettingLocation(false);

        toast({
          title: 'Ubicación obtenida',
          description: `Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}`,
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        setGettingLocation(false);
        toast({
          title: 'Error',
          description: 'No se pudo obtener la ubicación. Verifica los permisos.',
          variant: 'destructive',
        });
      }
    );
  };

  const handleAcceptTerms = async () => {
    if (!user) return;

    try {
      const termsAcceptedDate = new Date().toISOString();
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(
        userDocRef,
        {
          termsAccepted: true,
          termsAcceptedDate,
        },
        { merge: true }
      );

      setProfile({ ...profile, termsAccepted: true, termsAcceptedDate });

      toast({
        title: 'Términos aceptados',
        description: 'Has aceptado los términos y condiciones',
      });
    } catch (error) {
      console.error('Error accepting terms:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los términos',
        variant: 'destructive',
      });
    }
  };

  const handleChangePassword = async () => {
    if (!user || !auth.currentUser) return;

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Re-autenticar al usuario
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Cambiar contraseña
      await updatePassword(auth.currentUser, newPassword);

      toast({
        title: 'Contraseña actualizada',
        description: 'Tu contraseña ha sido cambiada exitosamente',
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordFields(false);
    } catch (error: any) {
      console.error('Error changing password:', error);
      let errorMessage = 'No se pudo cambiar la contraseña';
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'La contraseña actual es incorrecta';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La nueva contraseña es muy débil';
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Actualizar Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(
        userDocRef,
        {
          id: user.uid,
          name: profile.name,
          email: profile.email,
          phone: profile.phone || '',
          address: profile.address || '',
          photoURL: profile.photoURL || '',
          location: profile.location,
          termsAccepted: profile.termsAccepted,
          termsAcceptedDate: profile.termsAcceptedDate,
          notifications: profile.notifications,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Actualizar displayName en Firebase Auth (sin photoURL porque base64 es muy largo)
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: profile.name,
          // NO incluir photoURL aquí - se guarda solo en Firestore
        });

        // Solo intentar actualizar email si cambió
        if (profile.email !== user.email) {
          try {
            await updateEmail(auth.currentUser, profile.email);
          } catch (emailError: any) {
            if (emailError.code === 'auth/requires-recent-login') {
              toast({
                title: 'Requiere autenticación reciente',
                description: 'Para cambiar el email, debes cerrar sesión y volver a iniciar sesión',
                variant: 'destructive',
              });
            } else {
              throw emailError;
            }
          }
        }
      }

      toast({
        title: 'Perfil actualizado',
        description: 'Tu información ha sido guardada exitosamente',
      });

      // Opcional: redirigir al dashboard
      // router.push('/dashboard');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el perfil',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  if (isUserLoading || loadingData) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-headline mb-2">Mi Perfil</h1>
          <p className="text-muted-foreground">
            Gestiona tu información personal, seguridad y preferencias de cuenta
          </p>
        </div>

        {/* Foto de Perfil */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Foto de Perfil
            </CardTitle>
            <CardDescription>
              Sube tu foto desde la cámara o galería (máx. 5MB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.photoURL} alt={profile.name} />
                <AvatarFallback className="text-2xl">{getInitials(profile.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  variant="outline"
                  className="gap-2"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  {uploadingPhoto ? 'Subiendo...' : 'Cambiar foto'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  JPG, PNG o GIF. Máximo 5MB.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información Personal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
            <CardDescription>
              Actualiza tus datos básicos de contacto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Nombre completo
                </Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Tu nombre completo"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="tu@email.com"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+57 300 123 4567"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Dirección
                </Label>
                <Input
                  id="address"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  placeholder="Tu dirección"
                  className="h-11"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ubicación GPS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinned className="h-5 w-5" />
              Ubicación Actual (GPS)
            </CardTitle>
            <CardDescription>
              Captura tu ubicación actual para mejor servicio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {profile.location && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">Ubicación guardada</p>
                      <p className="text-xs text-muted-foreground">
                        Lat: {profile.location.latitude.toFixed(6)}, Lng: {profile.location.longitude.toFixed(6)}
                      </p>
                      {profile.location.timestamp && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Capturada: {new Date(profile.location.timestamp).toLocaleString('es-CO')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <Button
                onClick={handleGetLocation}
                disabled={gettingLocation}
                variant="outline"
                className="gap-2"
              >
                {gettingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPinned className="h-4 w-4" />
                )}
                {gettingLocation ? 'Obteniendo ubicación...' : 'Capturar ubicación actual'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Términos y Condiciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Términos y Condiciones
            </CardTitle>
            <CardDescription>
              Acepta los términos y condiciones de uso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg space-y-3">
                <p className="text-sm">
                  Al usar IQCapital Master, aceptas nuestros términos y condiciones de servicio,
                  incluyendo el manejo de datos personales, política de privacidad y términos de uso
                  de la plataforma financiera.
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {profile.termsAccepted ? '✓ Términos aceptados' : 'Términos no aceptados'}
                    </p>
                    {profile.termsAcceptedDate && (
                      <p className="text-xs text-muted-foreground">
                        Aceptados el {new Date(profile.termsAcceptedDate).toLocaleDateString('es-CO')}
                      </p>
                    )}
                  </div>
                  {!profile.termsAccepted && (
                    <Button onClick={handleAcceptTerms} size="sm">
                      Aceptar términos
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Notificaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Configuración de Notificaciones
            </CardTitle>
            <CardDescription>
              Controla qué notificaciones deseas recibir
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Notificaciones por Email</p>
                  <p className="text-xs text-muted-foreground">Recibe actualizaciones por correo</p>
                </div>
                <Switch
                  checked={profile.notifications?.email}
                  onCheckedChange={(checked) =>
                    setProfile({
                      ...profile,
                      notifications: { ...profile.notifications!, email: checked },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Notificaciones Push</p>
                  <p className="text-xs text-muted-foreground">Notificaciones en el navegador</p>
                </div>
                <Switch
                  checked={profile.notifications?.push}
                  onCheckedChange={(checked) =>
                    setProfile({
                      ...profile,
                      notifications: { ...profile.notifications!, push: checked },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Notificaciones por SMS</p>
                  <p className="text-xs text-muted-foreground">Mensajes de texto importantes</p>
                </div>
                <Switch
                  checked={profile.notifications?.sms}
                  onCheckedChange={(checked) =>
                    setProfile({
                      ...profile,
                      notifications: { ...profile.notifications!, sms: checked },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Actualizaciones de Préstamos</p>
                  <p className="text-xs text-muted-foreground">Cambios en tus préstamos</p>
                </div>
                <Switch
                  checked={profile.notifications?.loans}
                  onCheckedChange={(checked) =>
                    setProfile({
                      ...profile,
                      notifications: { ...profile.notifications!, loans: checked },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Recordatorios de Reuniones</p>
                  <p className="text-xs text-muted-foreground">Próximas reuniones programadas</p>
                </div>
                <Switch
                  checked={profile.notifications?.meetings}
                  onCheckedChange={(checked) =>
                    setProfile({
                      ...profile,
                      notifications: { ...profile.notifications!, meetings: checked },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Alertas de Transacciones</p>
                  <p className="text-xs text-muted-foreground">Movimientos en tu cuenta</p>
                </div>
                <Switch
                  checked={profile.notifications?.transactions}
                  onCheckedChange={(checked) =>
                    setProfile({
                      ...profile,
                      notifications: { ...profile.notifications!, transactions: checked },
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seguridad de la Cuenta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Seguridad de la Cuenta
            </CardTitle>
            <CardDescription>
              Gestiona la seguridad de tu cuenta y contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="text-sm font-medium">Cambiar contraseña</p>
                  <p className="text-xs text-muted-foreground">Actualiza tu contraseña periódicamente</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasswordFields(!showPasswordFields)}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {showPasswordFields ? 'Cancelar' : 'Cambiar'}
                </Button>
              </div>

              {showPasswordFields && (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Contraseña actual</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Ingresa tu contraseña actual"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva contraseña</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la nueva contraseña"
                    />
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                    className="w-full"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Actualizar contraseña
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="text-sm font-medium">ID de Usuario</p>
                  <p className="text-xs text-muted-foreground">Tu identificador único</p>
                </div>
                <code className="text-xs bg-muted px-2 py-1 rounded">{user.uid.substring(0, 12)}...</code>
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="text-sm font-medium">Estado de verificación</p>
                  <p className="text-xs text-muted-foreground">Email verificado</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    user.emailVerified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {user.emailVerified ? 'Verificado' : 'No verificado'}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">Método de autenticación</p>
                  <p className="text-xs text-muted-foreground">Cómo accedes a tu cuenta</p>
                </div>
                <span className="text-xs bg-muted px-2 py-1 rounded">Email/Contraseña</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botones de acción finales */}
        <div className="flex justify-end gap-3 pb-8">
          <Button variant="outline" onClick={() => router.push('/dashboard')} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar todos los cambios
          </Button>
        </div>
      </div>
    </div>
  );
}
