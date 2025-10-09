'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function DashboardRedirectPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const [loadingRole, setLoadingRole] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until user object is loaded
    }
    if (!user) {
      // Usuario no autenticado, redirigir inmediatamente
      router.replace('/');
      return;
    }

    const fetchUserRole = async () => {
      setLoadingRole(true);
      setError(null);
      const userDocRef = doc(firestore, 'users', user.uid);
      try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userRole = userData?.role;
          const userStatus = userData?.status;
          
          // Allow admin to bypass the status check
          if (userRole === 'admin') {
            router.push('/dashboard/admin');
            return;
          }

          // Check if user is active for non-admin roles
          if (userStatus !== 'activo') {
             setError('Tu cuenta no está activa. Contacta al administrador.');
             // Optionally, sign out the user
             // signOut(auth); 
             return;
          }

          if (userRole === 'asociado') {
            router.push('/dashboard/asociado');
          } else {
            router.push('/dashboard/cliente');
          }
        } else {
          // Default to client if profile doesn't exist or has no role
          router.push('/dashboard/cliente');
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setError('Error al cargar tu información. Intenta de nuevo.');
        // Default to client dashboard on error
        router.push('/dashboard/cliente');
      } finally {
        setLoadingRole(false);
      }
    };

    fetchUserRole();

  }, [user, isUserLoading, router, firestore]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      {error ? (
        <div className="text-center">
            <p className="text-destructive font-semibold">Error de Acceso</p>
            <p className="text-muted-foreground">{error}</p>
        </div>
      ) : (
        <p>Cargando...</p>
      )}
    </div>
  );
}
