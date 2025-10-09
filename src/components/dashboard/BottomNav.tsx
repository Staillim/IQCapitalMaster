'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PiggyBank, Landmark, Calendar, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

const clientNavItems = [
  { href: '/dashboard/cliente', icon: Home, label: 'Inicio' },
  { href: '/dashboard/ahorros', icon: PiggyBank, label: 'Ahorros' },
  { href: '/dashboard/prestamos', icon: Landmark, label: 'Préstamos' },
  { href: '/dashboard/reuniones', icon: Calendar, label: 'Reuniones' },
  { href: '/dashboard/reportes', icon: BarChart2, label: 'Reportes' },
];

const associateNavItems = [
  { href: '/dashboard/asociado', icon: Home, label: 'Inicio' },
  { href: '/dashboard/asociado/ahorros', icon: PiggyBank, label: 'Ahorros' },
  { href: '/dashboard/asociado/prestamos', icon: Landmark, label: 'Préstamos' },
  { href: '/dashboard/asociado/reuniones', icon: Calendar, label: 'Reuniones' },
  { href: '/dashboard/asociado/reportes', icon: BarChart2, label: 'Reportes' },
];


export function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  if (userProfile?.role === 'admin') {
    return null; // Don't show bottom nav for admin
  }

  const navItems = userProfile?.role === 'asociado' ? associateNavItems : clientNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card p-2 sm:hidden">
      <div className="grid grid-cols-5 gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-md p-2 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
