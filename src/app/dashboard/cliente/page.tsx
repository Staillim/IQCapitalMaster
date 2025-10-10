'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  PiggyBank,
  Landmark,
  Calendar,
} from 'lucide-react';
import { AnimatedCard } from '@/components/ui/animated-card';
import { collection } from 'firebase/firestore';

export default function ClientDashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const accountsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/accounts`);
  }, [user, firestore]);
  
  const { data: accounts, isLoading: isAccountsLoading } = useCollection(accountsQuery);

  const loansQuery = useMemoFirebase(() => {
    if (!user || !accounts) return null;
    // This will fetch loans from the subcollection of the first account for simplicity
    if (accounts && accounts.length > 0) {
      // A more robust solution would query loans across all accounts.
      // For this example, we assume loans are under the user directly for simplicity.
      return collection(firestore, `users/${user.uid}/loans`);
    }
    return null;
  }, [user, firestore, accounts]);
  
  const { data: loans, isLoading: isLoansLoading } = useCollection(loansQuery);
  
  const meetingsQuery = useMemoFirebase(() => {
    return collection(firestore, 'meetings');
  }, [firestore]);

  const { data: meetings, isLoading: isMeetingsLoading } = useCollection(meetingsQuery);

  const totalBalance = useMemo(() => {
    if (!accounts) return 0;
    // We assume the savings are in an account of type 'ahorro'
    const savingsAccount = accounts.find(acc => acc.accountType === 'ahorro');
    return savingsAccount ? savingsAccount.balance : 0;
  }, [accounts]);


  useEffect(() => {
    if (!isUserLoading && !user) {
      // Usuario no autenticado, redirigir inmediatamente
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  const isLoading = isUserLoading || isAccountsLoading || isLoansLoading || isMeetingsLoading;

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl">
      <div className="mb-4 text-sm text-muted-foreground">
        <span>Inicio</span>
        <span className="mx-2">/</span>
        <span className="font-medium text-foreground">Dashboard</span>
      </div>

      <h1 className="text-3xl font-bold mb-6 font-headline">
        Bienvenido, {user.displayName || 'User'}
      </h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <AnimatedCard
          title="Saldo Actual"
          description="Total en todas las cuentas de ahorro"
          icon={<PiggyBank className="h-5 w-5" />}
          gradient="medium"
        >
          <div className="text-3xl font-bold text-primary">${totalBalance.toFixed(2)}</div>
        </AnimatedCard>

        <AnimatedCard
          title="Préstamos Activos"
          description="Total de préstamos activos"
          icon={<Landmark className="h-5 w-5" />}
          gradient="vibrant"
        >
          <div className="text-3xl font-bold text-primary">{loans?.length || 0}</div>
        </AnimatedCard>

        <AnimatedCard
          title="Próximas Reuniones"
          description="Total de reuniones programadas"
          icon={<Calendar className="h-5 w-5" />}
          gradient="vivid"
        >
          <div className="text-3xl font-bold text-primary">{meetings?.length || 0}</div>
        </AnimatedCard>
      </div>

      <AnimatedCard
        title="Módulos"
        description="Selecciona una opción de la barra de navegación inferior para continuar"
        gradient="deep"
        className="text-center"
      >
        <div className="py-4">
          <p className="text-muted-foreground">
            Accede a Ahorros, Préstamos, Reuniones o Reportes desde el menú
          </p>
        </div>
      </AnimatedCard>
    </div>
  );
}
