'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Download, DollarSign, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';
import { useUser } from '@/firebase/provider';
import { getSavingsAccount } from '@/lib/savings-service';
import { getLoanStats } from '@/lib/loans-service';
import { SavingsAccount } from '@/types/savings';
import { LoanStats } from '@/types/loans';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function AssociateReportsPage() {
  const { user } = useUser();
  const [savingsAccount, setSavingsAccount] = useState<SavingsAccount | null>(null);
  const [loanStats, setLoanStats] = useState<LoanStats | null>(null);
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
      const [savings, loans] = await Promise.all([
        getSavingsAccount(user.uid),
        getLoanStats(user.uid)
      ]);
      
      setSavingsAccount(savings);
      setLoanStats(loans);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  }

  const patrimonio = (savingsAccount?.balance || 0) - (loanStats?.currentDebt || 0);

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Skeleton className="h-32" />
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
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold font-headline">Estado de Cuenta y Reportes</h1>
        <Button variant="secondary">
          <Download className="mr-2 h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ahorros</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(savingsAccount?.balance || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Balance actual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Préstamos</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(loanStats?.currentDebt || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Deuda actual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patrimonio</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${patrimonio >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(patrimonio)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ahorros - Deudas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntaje</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {loanStats?.creditScore || 0}/100
            </div>
            <p className="text-xs text-muted-foreground">
              Score crediticio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Savings Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Ahorros</CardTitle>
            <CardDescription>Detalles de tu cuenta de ahorros</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Balance Actual</span>
              <span className="font-semibold">{formatCurrency(savingsAccount?.balance || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Depósitos</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(savingsAccount?.totalDeposits || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Retiros</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(savingsAccount?.totalWithdrawals || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm text-muted-foreground">Cuota Mensual</span>
              <span className="font-semibold">
                {formatCurrency(savingsAccount?.minMonthlyContribution || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Racha de Contribución</span>
              <span className="font-semibold">
                {savingsAccount?.contributionStreak || 0} meses
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Loans Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Préstamos</CardTitle>
            <CardDescription>Detalles de tus préstamos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Préstamos Activos</span>
              <span className="font-semibold">{loanStats?.activeLoans || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Deuda Actual</span>
              <span className="font-semibold text-orange-600">
                {formatCurrency(loanStats?.currentDebt || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Pagado</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(loanStats?.totalPaid || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm text-muted-foreground">Pagos Realizados</span>
              <span className="font-semibold">{loanStats?.paymentsMade || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pagos Puntuales</span>
              <span className="font-semibold text-green-600">
                {loanStats?.paymentsOnTime || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Puntaje Crediticio</span>
              <span className="font-semibold text-purple-600">
                {loanStats?.creditScore || 0}/100
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Health */}
      <Card>
        <CardHeader>
          <CardTitle>Salud Financiera</CardTitle>
          <CardDescription>Análisis de tu situación financiera en el fondo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Ratio Ahorro/Deuda</span>
                <span className="text-sm font-medium">
                  {loanStats?.currentDebt ? 
                    `${Math.round(((savingsAccount?.balance || 0) / loanStats.currentDebt) * 100)}%` : 
                    '∞'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ 
                    width: `${Math.min(100, loanStats?.currentDebt ? 
                      ((savingsAccount?.balance || 0) / loanStats.currentDebt) * 100 : 100)}%` 
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Puntaje Crediticio</span>
                <span className="text-sm font-medium">{loanStats?.creditScore || 0}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    (loanStats?.creditScore || 0) >= 80 ? 'bg-green-600' :
                    (loanStats?.creditScore || 0) >= 60 ? 'bg-yellow-600' :
                    'bg-red-600'
                  }`}
                  style={{ width: `${loanStats?.creditScore || 0}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Fortalezas</span>
                </div>
                <ul className="text-xs text-green-700 space-y-1">
                  {savingsAccount && savingsAccount.balance > 100000 && (
                    <li>• Balance de ahorros saludable</li>
                  )}
                  {loanStats && loanStats.paymentsOnTime === loanStats.paymentsMade && loanStats.paymentsMade > 0 && (
                    <li>• Todos los pagos a tiempo</li>
                  )}
                  {savingsAccount && savingsAccount.contributionStreak >= 3 && (
                    <li>• Racha de contribución constante</li>
                  )}
                  {!loanStats?.activeLoans && <li>• Sin deudas activas</li>}
                </ul>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Patrimonio</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(patrimonio)}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {patrimonio >= 0 ? 'Patrimonio positivo' : 'Patrimonio negativo'}
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Capacidad</span>
                </div>
                <p className="text-xs text-purple-700">
                  {loanStats?.creditScore && loanStats.creditScore >= 70 ?
                    'Buena capacidad para nuevo préstamo' :
                    'Mejora tu score para nuevo préstamo'
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
