'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { IQCapitalLogo } from "@/components/IQCapitalLogo";
import { User, LogOut, Bell, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { signOut } from "firebase/auth";
import { collection, doc } from "firebase/firestore";

// A mapping from icon names (strings) to icon components
const iconMap: { [key: string]: React.ElementType } = {
  default: Bell,
  CheckCircle: CheckCircle,
  AlertCircle: AlertCircle,
};


export function Header() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [photoURL, setPhotoURL] = useState<string>('');

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const notificationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/notifications`);
  }, [user, firestore]);
  const { data: notifications, isLoading: isLoadingNotifications } = useCollection(notificationsQuery);

  const getIcon = (iconName: string | undefined) => {
    return iconMap[iconName || 'default'] || Bell;
  };


  useEffect(() => {
    if (userProfile?.photoURL) {
      setPhotoURL(userProfile.photoURL);
    }
  }, [userProfile]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Redirigir inmediatamente al inicio después de cerrar sesión
      router.push('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('');
  }

  const handleNotificationClick = (href: string) => {
    if (href) {
      router.push(href);
    }
  };

  const unreadNotifications = notifications?.filter(n => !(n as any).read) || [];

  return (
    <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6 z-50">
      <Link href="/dashboard" className="flex items-center gap-2">
        <IQCapitalLogo />
      </Link>
      <div className="ml-auto flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full relative">
              <Bell className="h-5 w-5" />
              {unreadNotifications.length > 0 && (
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
              )}
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notificaciones Recientes</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {isLoadingNotifications && <DropdownMenuItem>Cargando...</DropdownMenuItem>}
              {!isLoadingNotifications && notifications && notifications.length > 0 ? (
                 notifications.slice(0, 3).map((notif: any) => {
                    const IconComponent = getIcon(notif.icon);
                    return (
                        <DropdownMenuItem key={notif.id} className="gap-3" onClick={() => handleNotificationClick(notif.href)}>
                            <IconComponent className={`h-5 w-5 ${notif.read ? 'text-muted-foreground' : 'text-primary'}`} />
                            <p className={`text-sm truncate ${notif.read ? 'text-muted-foreground' : 'font-semibold'}`}>
                                {notif.text}
                            </p>
                        </DropdownMenuItem>
                    )
                 })
              ) : (
                !isLoadingNotifications && <DropdownMenuItem>No hay notificaciones</DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/notifications')}>
              <div className="w-full text-center text-primary font-semibold">
                Ver todas
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                {photoURL && <AvatarImage src={photoURL} alt={user?.displayName || 'User Avatar'} />}
                <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/perfil')}>
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
