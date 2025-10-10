'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import { getUserLoans, getLoanStats, checkLoanEligibility } from '@/lib/loans-service';
import { LoanApplication, LoanStatus, LoanStats, LoanEligibility } from '@/types/loans';
import { AnimatedCard } from '@/components/ui/animated-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2,
  Clock,
  XCircle,
  List,
  Percent,
  AlertCircle,
  Calendar,
  Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

// Helper para formatear moneda colombiana
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper para obtener color del badge según estado
const getLoanStatusColor = (status: LoanStatus) => {
  switch (status) {
    case LoanStatus.ACTIVE:
      return 'bg-blue-500';
    case LoanStatus.APPROVED:
      return 'bg-green-500';
    case LoanStatus.PENDING:
      return 'bg-yellow-500';
    case LoanStatus.PAID:
      return 'bg-emerald-500';
    case LoanStatus.OVERDUE:
      return 'bg-red-500';
    case LoanStatus.DEFAULTED:
      return 'bg-red-700';
    case LoanStatus.REJECTED:
      return 'bg-gray-500';
    case LoanStatus.CANCELLED:
      return 'bg-gray-400';
    default:
      return 'bg-gray-500';
  }
};

// Helper para traducir estado
const getLoanStatusLabel = (status: LoanStatus) => {
  const labels: Record<LoanStatus, string> = {
    [LoanStatus.PENDING]: 'Pendiente',
    [LoanStatus.APPROVED]: 'Aprobado',
    [LoanStatus.ACTIVE]: 'Activo',
    [LoanStatus.PAID]: 'Pagado',
    [LoanStatus.OVERDUE]: 'En Mora',
    [LoanStatus.DEFAULTED]: 'Incumplido',
    [LoanStatus.REJECTED]: 'Rechazado',
    [LoanStatus.CANCELLED]: 'Cancelado',
  };
  return labels[status] || status;
};

export default function PrestamosPage() {
  const { user } = useFirebase();
  const router = useRouter();
  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [stats, setStats] = useState<LoanStats | null>(null);
  const [eligibility, setEligibility] = useState<LoanEligibility | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    loadLoansData();
  }, [user]);

  const loadLoansData = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const [loansData, statsData, eligibilityData] = await Promise.all([
        getUserLoans(user.uid),
        getLoanStats(user.uid),
        checkLoanEligibility(user.uid),
      ]);

      setLoans(loansData);
      setStats(statsData);
      setEligibility(eligibilityData);
    } catch (error) {
      console.error('Error loading loans data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const activeLoans = loans.filter(
    (loan) => loan.status === LoanStatus.ACTIVE || loan.status === LoanStatus.OVERDUE
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Préstamos</h1>
          <p className="text-muted-foreground">
            Gestiona tus préstamos y solicitudes
          </p>
        </div>
        <Button
          asChild
          disabled={!eligibility?.isEligible}
        >
          <Link href="/dashboard/prestamos/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Solicitar Préstamo
          </Link>
        </Button>
      </div>

      {/* Eligibility Alert */}
      {eligibility && !eligibility.isEligible && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>No eres elegible para préstamos:</strong>
            <ul className="list-disc list-inside mt-2">
              {eligibility.reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Credit Score Alert */}
      {stats && stats.creditScore < 70 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tu puntaje de crédito es <strong>{stats.creditScore}/100</strong>. 
            Mejora tu historial de pagos para acceder a mejores condiciones.
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Borrowed */}
        <AnimatedCard
          title="Total Prestado"
          description="Histórico de préstamos"
          icon={<DollarSign className="h-5 w-5" />}
          gradient="vivid"
        >
          <div className="text-3xl font-bold text-primary">
            {formatCurrency(stats?.totalBorrowed || 0)}
          </div>
        </AnimatedCard>

        {/* Total Paid */}
        <AnimatedCard
          title="Total Pagado"
          description="Pagos realizados"
          icon={<CheckCircle2 className="h-5 w-5" />}
          gradient="vibrant"
        >
          <div className="text-3xl font-bold text-primary">
            {formatCurrency(stats?.totalPaid || 0)}
          </div>
        </AnimatedCard>

        {/* Current Debt */}
        <AnimatedCard
          title="Deuda Actual"
          description={`${activeLoans.length} préstamo(s) activo(s)`}
          icon={<TrendingUp className="h-5 w-5" />}
          gradient="intense"
        >
          <div className="text-3xl font-bold text-primary">
            {formatCurrency(stats?.currentDebt || 0)}
          </div>
        </AnimatedCard>

        {/* Credit Score */}
        <AnimatedCard
          title="Puntaje"
          description="Historial crediticio"
          icon={<Percent className="h-5 w-5" />}
          gradient="deep"
        >
          <div className="text-3xl font-bold text-primary">{stats?.creditScore || 0}/100</div>
        </AnimatedCard>
      </div>

      {/* Overdue Alert */}
      {stats && stats.overdueAmount > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Tienes pagos vencidos:</strong> {formatCurrency(stats.overdueAmount)} en mora. 
            Realiza tus pagos lo antes posible para evitar más cargos.
          </AlertDescription>
        </Alert>
      )}

      {/* Active Loans */}
      {activeLoans.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Préstamos Activos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeLoans.map((loan) => (
              <Card key={loan.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {formatCurrency(loan.amount)}
                      </CardTitle>
                      <CardDescription>{loan.purpose}</CardDescription>
                    </div>
                    <Badge className={getLoanStatusColor(loan.status)}>
                      {getLoanStatusLabel(loan.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>
                      Solicitado{' '}
                      {formatDistanceToNow(loan.createdAt.toDate(), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Plazo</p>
                      <p className="font-medium">{loan.term} meses</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Interés</p>
                      <p className="font-medium">2%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cuota Mensual</p>
                      <p className="font-medium">
                        {formatCurrency(loan.monthlyPayment)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Saldo Pendiente</p>
                      <p className="font-medium">
                        {formatCurrency(loan.remainingBalance)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center text-sm">
                    <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{loan.codeudores.length} co-deudor(es)</span>
                  </div>

                  {loan.status === LoanStatus.OVERDUE && loan.overdueDays > 0 && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        {loan.overdueDays} días de mora • Multa:{' '}
                        {formatCurrency(loan.totalLateFees)}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled
                      title="Funcionalidad próximamente"
                    >
                      <Clock className="mr-2 h-3 w-3" />
                      Ver Cronograma
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled
                      title="Funcionalidad próximamente"
                    >
                      <CheckCircle2 className="mr-2 h-3 w-3" />
                      Pagar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Loans History */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Historial de Préstamos</h2>
        {loans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No tienes préstamos</p>
              <p className="text-muted-foreground text-center mb-4">
                {eligibility?.isEligible
                  ? 'Puedes solicitar un préstamo de hasta ' +
                    formatCurrency(eligibility.maxLoanAmount)
                  : 'Cumple los requisitos para solicitar préstamos'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {loans.map((loan) => (
                  <div
                    key={loan.id}
                    className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      // TODO: View loan details
                      console.log('View loan:', loan.id);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-full ${
                            loan.status === LoanStatus.PAID
                              ? 'bg-emerald-100'
                              : loan.status === LoanStatus.OVERDUE
                              ? 'bg-red-100'
                              : 'bg-blue-100'
                          }`}
                        >
                          {loan.status === LoanStatus.PAID ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : loan.status === LoanStatus.OVERDUE ? (
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          ) : loan.status === LoanStatus.REJECTED ||
                            loan.status === LoanStatus.CANCELLED ? (
                            <XCircle className="h-5 w-5 text-gray-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {formatCurrency(loan.amount)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {loan.purpose}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(loan.createdAt.toDate(), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getLoanStatusColor(loan.status)}>
                          {getLoanStatusLabel(loan.status)}
                        </Badge>
                        {(loan.status === LoanStatus.ACTIVE || loan.status === LoanStatus.OVERDUE) && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Saldo: {formatCurrency(loan.remainingBalance)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
