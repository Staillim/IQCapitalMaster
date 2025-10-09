'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useMemo } from 'react';

// A mapping from icon names (strings) to icon components
const iconMap: { [key: string]: React.ElementType } = {
  default: Bell,
  CheckCircle: CheckCircle,
  AlertCircle: AlertCircle,
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  const notificationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/notifications`);
  }, [user, firestore]);

  const { data: allNotifications, isLoading } = useCollection(notificationsQuery);

  const getIcon = (iconName: string | undefined) => {
    return iconMap[iconName || 'default'] || Bell;
  };

  return (
    <div className="container mx-auto max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
          </Link>
        </Button>
      </div>
      <h1 className="text-3xl font-bold mb-6 font-headline flex items-center gap-3">
        <Bell />
        Todas las Notificaciones
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Historial de Notificaciones</CardTitle>
          <CardDescription>
            Aquí puedes ver todas las alertas y avisos de tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Cargando notificaciones...
              </p>
            )}
            {!isLoading && allNotifications && allNotifications.length > 0 ? (
              allNotifications.map((notif: any) => {
                const IconComponent = getIcon(notif.icon);
                return (
                  <div
                    key={notif.id}
                    onClick={() => notif.href && router.push(notif.href)}
                    className={`flex items-start gap-4 p-4 border-l-4 rounded-r-lg ${notif.href ? 'cursor-pointer' : ''} transition-colors hover:bg-muted ${notif.read ? 'border-transparent bg-muted/50' : 'border-primary bg-primary/10'}`}
                  >
                    <IconComponent className={`h-6 w-6 mt-1 flex-shrink-0 ${notif.read ? 'text-muted-foreground' : 'text-primary'}`} />
                    <div className="flex-1">
                      <p className={`text-sm ${notif.read ? 'text-muted-foreground' : 'font-semibold text-foreground'}`}>
                        {notif.text}
                      </p>
                      {notif.date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notif.date.seconds * 1000).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {!notif.read && <div className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 mt-2"></div>}
                  </div>
                )
              })
            ) : (
             !isLoading && <p className="text-sm text-muted-foreground text-center py-8">
                No tienes notificaciones.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
