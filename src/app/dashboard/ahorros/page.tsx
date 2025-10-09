'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AnimatedCard } from '@/components/ui/animated-card';
import { useUser } from '@/firebase';
import { PlusCircle, TrendingUp, TrendingDown, Wallet, AlertCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { 
  getSavingsAccount, 
  getTransactionHistory, 
  getOrCreateSavingsAccount 
} from '@/lib/savings-service';
import { 
  SavingsAccount, 
  SavingsTransaction, 
  TransactionType,
  SAVINGS_CONSTANTS 
} from '@/types/savings';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DepositDialog } from '@/components/dashboard/DepositDialog';
import { WithdrawalDialog } from '@/components/dashboard/WithdrawalDialog';

export default function AhorrosPage() {
  const { user } = useUser();
  const [account, setAccount] = useState<SavingsAccount | null>(null);
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      loadAccountData();
    }
  }, [user]);

  const loadAccountData = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      // Obtener o crear cuenta de ahorros
      const accountData = await getOrCreateSavingsAccount(user.uid);
      setAccount(accountData);

      // Obtener historial de transacciones
      const transactionsData = await getTransactionHistory(user.uid, 20);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading account data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case TransactionType.DEPOSIT:
        return <ArrowUpCircle className="h-5 w-5 text-green-600" />;
      case TransactionType.WITHDRAWAL:
        return <ArrowDownCircle className="h-5 w-5 text-red-600" />;
      case TransactionType.FINE:
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case TransactionType.INTEREST:
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
    }
  };

  const getTransactionLabel = (type: TransactionType) => {
    switch (type) {
      case TransactionType.DEPOSIT:
        return 'Depósito';
      case TransactionType.WITHDRAWAL:
        return 'Retiro';
      case TransactionType.FINE:
        return 'Multa';
      case TransactionType.INTEREST:
        return 'Interés';
    }
  };

  const monthlyProgress = account 
    ? (account.monthlyContribution / account.minMonthlyContribution) * 100 
    : 0;

  const needsMonthlyContribution = account 
    ? account.monthlyContribution < account.minMonthlyContribution 
    : false;

  return (
    <div className="container mx-auto max-w-6xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline">Módulo de Ahorros</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus ahorros y retiros del Fondo
          </p>
        </div>
      </div>

      {/* Alert de cuota mensual */}
      {needsMonthlyContribution && account && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atención:</strong> Tu contribución mensual actual es {formatCurrency(account.monthlyContribution)}. 
            Necesitas aportar {formatCurrency(account.minMonthlyContribution - account.monthlyContribution)} más 
            para cumplir la cuota mínima de {formatCurrency(account.minMonthlyContribution)} y evitar multas.
          </AlertDescription>
        </Alert>
      )}

      {/* Tarjetas de resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <AnimatedCard
          title="Saldo Actual"
          description="Tu saldo disponible"
          icon={<Wallet className="h-5 w-5" />}
          gradient="green"
        >
          {isLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <div className="text-3xl font-bold text-primary">{formatCurrency(account?.balance || 0)}</div>
          )}
        </AnimatedCard>

        <AnimatedCard
          title="Contribución Mensual"
          description={`Meta: ${formatCurrency(SAVINGS_CONSTANTS.MIN_MONTHLY_CONTRIBUTION)}`}
          icon={<TrendingUp className="h-5 w-5" />}
          gradient="blue"
        >
          {isLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <>
              <div className="text-3xl font-bold text-primary mb-2">{formatCurrency(account?.monthlyContribution || 0)}</div>
              <div className="flex items-center gap-2">
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      monthlyProgress >= 100 ? 'bg-green-600' : 'bg-orange-500'
                    }`}
                    style={{ width: `${Math.min(monthlyProgress, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap font-semibold">
                  {monthlyProgress.toFixed(0)}%
                </span>
              </div>
            </>
          )}
        </AnimatedCard>

        <AnimatedCard
          title="Retiros Disponibles"
          description="Retiros restantes este mes"
          icon={<TrendingDown className="h-5 w-5" />}
          gradient="orange"
        >
          {isLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <div className="text-3xl font-bold text-primary">
              {account ? account.maxWithdrawalsPerMonth - account.withdrawalsThisMonth : 0} / {account?.maxWithdrawalsPerMonth || 2}
            </div>
          )}
        </AnimatedCard>
      </div>

      {/* Acciones principales */}
      <AnimatedCard
        title="Acciones Rápidas"
        description="Realiza depósitos o retiros de tu cuenta de ahorros"
        gradient="purple"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <DepositDialog 
            userId={user?.uid || ''} 
            onSuccess={loadAccountData}
            trigger={
              <Button className="w-full sm:w-auto" size="lg">
                <PlusCircle className="mr-2 h-5 w-5" /> 
                Hacer Depósito
              </Button>
            }
          />
          
          {account && (
            <WithdrawalDialog 
              userId={user?.uid || ''} 
              account={account}
              onSuccess={loadAccountData}
              trigger={
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto" 
                  size="lg"
                  disabled={!account || account.withdrawalsThisMonth >= account.maxWithdrawalsPerMonth}
                >
                  <TrendingDown className="mr-2 h-5 w-5" /> 
                  Solicitar Retiro
                </Button>
              }
            />
          )}
        </div>
      </AnimatedCard>

      {/* Historial de transacciones */}
      <AnimatedCard
        title="Historial de Transacciones"
        description="Últimas 20 operaciones en tu cuenta de ahorros"
        gradient="teal"
      >
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay transacciones registradas</p>
              <p className="text-sm">Realiza tu primer depósito para comenzar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div 
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-secondary">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{getTransactionLabel(transaction.type)}</p>
                        {transaction.metadata?.fee && (
                          <Badge variant="outline" className="text-xs">
                            Comisión: {formatCurrency(transaction.metadata.fee)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{transaction.concept}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {transaction.createdAt && format(transaction.createdAt.toDate(), "PPp", { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      transaction.type === TransactionType.DEPOSIT 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {transaction.type === TransactionType.DEPOSIT ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Saldo: {formatCurrency(transaction.balance)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
      </AnimatedCard>
    </div>
  );
}
