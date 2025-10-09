'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import {
  PiggyBank,
  Landmark,
  Calendar,
  AlertTriangle,
  BadgeDollarSign,
  Bell,
  User as UserIcon,
  BarChart2,
  Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { collection, doc } from 'firebase/firestore';

export default function AssociateDashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  // --- Data Fetching ---
  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const accountsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/accounts`);
  }, [user, firestore]);
  const { data: accounts, isLoading: isAccountsLoading } = useCollection(accountsQuery);
  
  const loansQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/loans`);
  }, [user, firestore]);
  const { data: loans, isLoading: isLoansLoading } = useCollection(loansQuery);

  const notificationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/notifications`);
  }, [user, firestore]);
  const { data: notifications, isLoading: isNotificationsLoading } = useCollection(notificationsQuery);

  // These should be calculated based on real data later
  const pendingFines = 0.00;
  const accumulatedEarnings = 0.00;

  const totalSavings = useMemo(() => {
    if (!accounts) return 0;
    // Sum balances from all accounts considered for savings
    return accounts.reduce((sum, account) => sum + account.balance, 0);
  }, [accounts]);
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const isLoading = isUserLoading || isProfileLoading || isAccountsLoading || isLoansLoading || isNotificationsLoading;

  if (isLoading || !user || !userProfile) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <p>Cargando dashboard del asociado...</p>
      </div>
    );
  }
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  const moduleLinks = [
    { href: '/dashboard/perfil', icon: UserIcon, label: 'Perfil' },
    { href: '/dashboard/asociado/ahorros', icon: PiggyBank, label: 'Ahorros' },
    { href: '/dashboard/asociado/prestamos', icon: Landmark, label: 'Préstamos' },
    { href: '/dashboard/asociado/reuniones', icon: Calendar, label: 'Reuniones' },
    { href: '/dashboard/asociado/reportes', icon: BarChart2, label: 'Reportes' },
    { href: '/dashboard/perfil', icon: Settings, label: 'Configuración' }
  ];


  return (
    <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-bold font-headline">
                    👋 Bienvenido, {user.displayName || 'Asociado'}
                </h1>
                <p className="text-muted-foreground">Tu panel de control general.</p>
            </div>
            <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                    <AvatarImage src={userProfile.photoURL} alt={user.displayName || ''} />
                    <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold">{user.displayName}</p>
                    <Badge variant={userProfile.status === 'activo' ? 'default' : 'destructive'}>
                      {userProfile.status || 'Activo'}
                    </Badge>
                </div>
            </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Ahorrado</CardTitle>
                    <PiggyBank className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${totalSavings.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Suma de todas tus cuentas</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Préstamos Activos</CardTitle>
                    <Landmark className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{loans?.length || 0}</div>
                    <p className="text-xs text-muted-foreground">Total de préstamos vigentes</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Multas Pendientes</CardTitle>
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">${pendingFines.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Por pagos atrasados</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Ganancias Acumuladas</CardTitle>
                    <BadgeDollarSign className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">${accumulatedEarnings.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Rendimiento de tus aportes</p>
                </CardContent>
            </Card>
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Accesos Rápidos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {moduleLinks.map((link) => (
              <Link href={link.href} key={`${link.href}-${link.label}`}>
                <Card className="text-center p-4 hover:bg-muted hover:shadow-lg transition-all flex flex-col items-center justify-center h-full">
                  <link.icon className="h-8 w-8 mb-2 text-primary" />
                  <p className="font-semibold text-sm">{link.label}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notificaciones Recientes
                </CardTitle>
                <CardDescription>
                    Mantente al día con las últimas novedades y tareas.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && <p className="text-sm text-muted-foreground text-center py-4">Cargando notificaciones...</p>}
                {!isLoading && notifications && notifications.length > 0 ? (
                  <ul className="space-y-4">
                      {notifications.slice(0, 5).map((notif: any) => (
                          <li key={notif.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                              {/* Assuming notif.icon exists. You might need a mapping from a string to an Icon component */}
                              <Bell className={`h-5 w-5 mt-1 flex-shrink-0 ${notif.read ? 'text-muted-foreground' : 'text-primary'}`} />
                              <div className="flex-1">
                                  <p className={`text-sm ${notif.read ? 'text-muted-foreground' : 'font-semibold'}`}>
                                      {notif.text}
                                  </p>
                              </div>
                              {!notif.read && <div className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 mt-2"></div>}
                          </li>
                      ))}
                  </ul>
                ) : (
                  !isLoading && <p className="text-sm text-muted-foreground text-center py-4">No tienes notificaciones nuevas.</p>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
