'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, DollarSign, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/firebase/provider';
import { getUserLoans, getLoanStats } from '@/lib/loans-service';
import { LoanApplication, LoanStats } from '@/types/loans';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function AssociateLoansPage() {
  const { user } = useUser();
  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [stats, setStats] = useState<LoanStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    if (!user) return;
    
    try {
      setLoading(true);
      const [loansData, statsData] = await Promise.all([
        getUserLoans(user.uid),
        getLoanStats(user.uid)
      ]);
      
      setLoans(loansData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading loans data:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'Pendiente', variant: 'secondary' as const },
      approved: { label: 'Aprobado', variant: 'default' as const },
      rejected: { label: 'Rechazado', variant: 'destructive' as const },
      active: { label: 'Activo', variant: 'default' as const },
      overdue: { label: 'Vencido', variant: 'destructive' as const },
      paid: { label: 'Pagado', variant: 'default' as const },
    };
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const };
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/asociado"> &larr; Volver al Dashboard</Link>
        </Button>
      </div>
      
      <h1 className="text-3xl font-bold mb-6 font-headline">Módulo de Préstamos</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Préstamos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLoans || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeLoans || 0} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Pendiente</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats?.currentDebt || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Deuda actual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Pagado</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats?.totalPaid || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total pagado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>Gestiona tus préstamos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button className="w-full sm:w-auto" asChild>
              <Link href="/dashboard/prestamos/nuevo">
                <PlusCircle className="mr-2 h-4 w-4" />
                Solicitar Préstamo
              </Link>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/dashboard/prestamos">
                <DollarSign className="mr-2 h-4 w-4" />
                Ver Historial de Pagos
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loans List */}
      <Card>
        <CardHeader>
          <CardTitle>Mis Préstamos</CardTitle>
          <CardDescription>Lista de préstamos solicitados y activos</CardDescription>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No tienes préstamos aún
            </div>
          ) : (
            <div className="space-y-4">
              {loans.map((loan) => (
                <div
                  key={loan.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${
                      loan.status === 'active' || loan.status === 'approved' ? 'bg-green-100' :
                      loan.status === 'pending' ? 'bg-yellow-100' :
                      loan.status === 'rejected' || loan.status === 'overdue' ? 'bg-red-100' :
                      'bg-gray-100'
                    }`}>
                      {loan.status === 'active' || loan.status === 'approved' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : loan.status === 'pending' ? (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {formatCurrency(loan.amount)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {loan.purpose || 'Sin propósito especificado'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Plazo: {loan.term} meses
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Solicitado: {loan.createdAt?.toDate?.().toLocaleDateString() || 'Fecha no disponible'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={getStatusBadge(loan.status).variant}>
                      {getStatusBadge(loan.status).label}
                    </Badge>
                    {loan.status === 'active' && loan.remainingBalance && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Saldo: {formatCurrency(loan.remainingBalance)}
                      </p>
                    )}
                    {loan.monthlyPayment && (
                      <p className="text-xs text-muted-foreground">
                        Cuota: {formatCurrency(loan.monthlyPayment)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
