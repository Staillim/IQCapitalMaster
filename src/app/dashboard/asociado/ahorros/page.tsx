'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/firebase/provider';
import { getSavingsAccount, getSavingsTransactions } from '@/lib/savings-service';
import { SavingsAccount, SavingsTransaction } from '@/types/savings';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function AssociateSavingsPage() {
  const { user } = useUser();
  const [account, setAccount] = useState<SavingsAccount | null>(null);
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
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
      const [accountData, transactionsData] = await Promise.all([
        getSavingsAccount(user.uid),
        getSavingsTransactions(user.uid, 10)
      ]);
      
      setAccount(accountData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading savings data:', error);
    } finally {
      setLoading(false);
    }
  }

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
      
      <h1 className="text-3xl font-bold mb-6 font-headline">Módulo de Ahorros</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Actual</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(account?.balance || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Estado: <Badge variant={account?.status === 'active' ? 'default' : 'secondary'}>
                {account?.status === 'active' ? 'Activo' : 'Inactivo'}
              </Badge>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Depósitos</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(account?.totalDeposits || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Aporte mensual: {formatCurrency(account?.minMonthlyContribution || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Retiros</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(account?.totalWithdrawals || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Retiros este mes: {account?.withdrawalsThisMonth || 0}/{account?.maxWithdrawalsPerMonth || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>Gestiona tus ahorros</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button className="w-full sm:w-auto" asChild>
              <Link href="/dashboard/ahorros">
                <PlusCircle className="mr-2 h-4 w-4" />
                Registrar Depósito
              </Link>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/dashboard/ahorros">
                <TrendingDown className="mr-2 h-4 w-4" />
                Solicitar Retiro
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transacciones Recientes</CardTitle>
          <CardDescription>Últimas {transactions.length} transacciones</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No tienes transacciones aún
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${
                      transaction.type === 'deposit' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {transaction.type === 'deposit' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {transaction.type === 'deposit' ? 'Depósito' : 'Retiro'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.concept || 'Sin concepto'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.createdAt?.toDate?.().toLocaleDateString() || 'Fecha no disponible'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    <Badge variant="default">
                      Completado
                    </Badge>
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
