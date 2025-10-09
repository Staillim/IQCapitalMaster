'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import {
  Users,
  PiggyBank,
  Landmark,
  Calendar,
  AlertTriangle,
  BadgeDollarSign,
  BarChart2,
  Settings,
  UserCheck,
  FileText,
  TrendingUp,
  Clock,
  Activity,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { getAdminDashboardMetrics, getSystemAlerts } from '@/lib/admin-service';
import type { AdminDashboardMetrics, SystemAlert } from '@/types/admin';

export default function AdminDashboardPage() {
  const router = useRouter();
  const firebaseContext = useFirebase();
  const user = firebaseContext?.user;
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [metricsData, alertsData] = await Promise.all([
        getAdminDashboardMetrics(),
        getSystemAlerts(false),
      ]);
      setMetrics(metricsData);
      setAlerts(alertsData);
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const moduleLinks = [
    { href: '/dashboard/admin/users', icon: Users, label: 'Usuarios' },
    { href: '/dashboard/admin/savings', icon: PiggyBank, label: 'Ahorros' },
    { href: '/dashboard/admin/loans', icon: Landmark, label: 'Préstamos' },
    { href: '/dashboard/admin/meetings', icon: Calendar, label: 'Reuniones' },
    { href: '/dashboard/admin/reports', icon: BarChart2, label: 'Reportes' },
    { href: '/dashboard/admin/config', icon: Settings, label: 'Configuración' }
  ];

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-7xl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">
            👋 Bienvenido, Administrador
          </h1>
          <p className="text-muted-foreground">Panel de control general del fondo FAP.</p>
        </div>
        <Button onClick={loadDashboardData} variant="outline">
          <Activity className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Alertas Críticas */}
      {alerts.length > 0 && (
        <Alert variant={alerts[0].severity === 'critical' ? 'destructive' : 'default'} className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-semibold">{alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'} del sistema.</span>{' '}
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto"
              onClick={() => router.push('/dashboard/admin/alerts')}
            >
              Ver todas <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs Principales */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Asociados / Clientes Activos</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.usersByRole.asociado || 0} / {metrics?.usersByRole.cliente || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.activeUsers || 0} usuarios activos de {metrics?.totalUsers || 0} totales
            </p>
            {metrics?.newUsersThisMonth && metrics.newUsersThisMonth > 0 && (
              <div className="flex items-center mt-2 text-xs text-green-600">
                <TrendingUp className="mr-1 h-3 w-3" />
                +{metrics.newUsersThisMonth} este mes
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Ahorrado (General)</CardTitle>
            <PiggyBank className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics?.totalSavings || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.activeSavingsAccounts || 0} cuentas activas
            </p>
            {metrics?.monthlySavingsGrowth && metrics.monthlySavingsGrowth > 0 && (
              <div className="flex items-center mt-2 text-xs text-green-600">
                <TrendingUp className="mr-1 h-3 w-3" />
                +{metrics.monthlySavingsGrowth.toFixed(1)}% este mes
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total en Préstamos</CardTitle>
            <Landmark className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(metrics?.totalLoans || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.activeLoans || 0} préstamos activos
            </p>
            {metrics?.overdueLoans && metrics.overdueLoans > 0 && (
              <p className="text-xs text-red-600 mt-1">
                {metrics.overdueLoans} préstamos vencidos
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Multas Aplicadas</CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(metrics?.totalFines || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(metrics?.totalFinesThisMonth || 0)} este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ganancias del Fondo</CardTitle>
            <BadgeDollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics?.totalInterestEarned || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Intereses + {formatCurrency(metrics?.totalFeesCollected || 0)} en cuotas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Próximas Reuniones</CardTitle>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.upcomingMeetings || 0}</div>
            <p className="text-xs text-muted-foreground">
              Asistencia promedio: {metrics?.averageAttendanceRate?.toFixed(0) || 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tareas Pendientes */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="border-l-4 border-yellow-500 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => router.push('/dashboard/admin/loans')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-md">
              <FileText className="h-5 w-5 text-yellow-500" />
              Solicitudes de Préstamos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.pendingLoanApprovals || 0}</div>
            <p className="text-sm text-muted-foreground">Esperando aprobación</p>
            {metrics?.pendingLoanApprovals && metrics.pendingLoanApprovals > 0 && (
              <Button variant="link" className="p-0 h-auto mt-2" size="sm">
                Revisar solicitudes <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-blue-500 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => router.push('/dashboard/admin/users?status=pendiente')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-md">
              <UserCheck className="h-5 w-5 text-blue-500" />
              Verificaciones Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.pendingUsers || 0}</div>
            <p className="text-sm text-muted-foreground">Nuevos usuarios por activar</p>
            {metrics?.pendingUsers && metrics.pendingUsers > 0 && (
              <Button variant="link" className="p-0 h-auto mt-2" size="sm">
                Activar usuarios <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-red-500 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => router.push('/dashboard/admin/savings')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-md">
              <Clock className="h-5 w-5 text-red-500" />
              Retiros Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.pendingWithdrawals || 0}</div>
            <p className="text-sm text-muted-foreground">Solicitudes de retiro</p>
            {metrics?.pendingWithdrawals && metrics.pendingWithdrawals > 0 && (
              <Button variant="link" className="p-0 h-auto mt-2" size="sm">
                Revisar retiros <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accesos Rápidos */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Módulos de Gestión</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {moduleLinks.map((link) => (
            <Link href={link.href} key={link.href}>
              <Card className="text-center p-4 hover:bg-muted hover:shadow-lg transition-all flex flex-col items-center justify-center h-full">
                <link.icon className="h-8 w-8 mb-2 text-primary" />
                <p className="font-semibold text-sm">{link.label}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
