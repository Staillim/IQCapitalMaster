'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  Banknote,
  Users,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { collection, query, getDocs, where, Timestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

// Tipos
type Period = 'mensual' | 'trimestral' | 'anual' | 'historico';

type FinancialReport = {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  incomeBreakdown: {
    savingsInterest: number;
    loanInterest: number;
    fees: number;
    fines: number;
  };
  expenseBreakdown: {
    loansDisbursed: number;
    withdrawals: number;
    administrative: number;
  };
};

type UserPerformance = {
  userId: string;
  userName: string;
  role: 'cliente' | 'asociado';
  savingsBalance: number;
  totalSavings: number;
  activeLoanAmount: number;
  loanPaymentStatus: 'al-dia' | 'atrasado' | 'sin-prestamo';
  meetingAttendance: number;
  totalFines: number;
  creditScore: number;
};

type MonthlyMetrics = {
  month: string;
  newMembers: number;
  totalSavings: number;
  loansIssued: number;
  loanAmount: number;
  meetingsHeld: number;
  attendanceRate: number;
};

export default function AdminReportsPage() {
  const router = useRouter();
  const firebaseContext = useFirebase();
  const user = firebaseContext?.user;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('mensual');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedMonth, setSelectedMonth] = useState('01');

  // Estados para datos calculados desde Firestore
  const [financialReport, setFinancialReport] = useState<FinancialReport>({
    period: 'Enero 2025',
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    incomeBreakdown: {
      savingsInterest: 0,
      loanInterest: 0,
      fees: 0,
      fines: 0,
    },
    expenseBreakdown: {
      loansDisbursed: 0,
      withdrawals: 0,
      administrative: 0,
    },
  });
  const [userPerformance, setUserPerformance] = useState<UserPerformance[]>([]);
  const [monthlyMetrics, setMonthlyMetrics] = useState<MonthlyMetrics[]>([]);

  // Cargar y calcular datos desde Firestore
  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const loadReportsData = async () => {
      try {
        setLoading(true);
        const db = initializeFirebase().firestore;

        // Obtener todos los usuarios
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        let totalSavingsBalance = 0;
        let totalSavingsDeposits = 0;
        const performances: UserPerformance[] = [];

        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          const userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || 'Sin nombre';
          
          totalSavingsBalance += userData.savingsBalance || 0;
          totalSavingsDeposits += userData.totalSavingsDeposits || 0;

          performances.push({
            userId: userDoc.id,
            userName,
            role: userData.role === 'asociado' ? 'asociado' : 'cliente',
            savingsBalance: userData.savingsBalance || 0,
            totalSavings: userData.totalSavingsDeposits || 0,
            activeLoanAmount: userData.activeLoanAmount || 0,
            loanPaymentStatus: userData.loanPaymentStatus || 'sin-prestamo',
            meetingAttendance: userData.meetingAttendanceRate || 0,
            totalFines: userData.totalFines || 0,
            creditScore: userData.creditScore || 750,
          });
        }

        // Calcular préstamos activos
        let totalLoansActive = 0;
        let totalLoansDisbursed = 0;
        try {
          const loansRef = collection(db, 'active_loans');
          const loansSnapshot = await getDocs(loansRef);
          loansSnapshot.forEach((doc) => {
            const data = doc.data();
            totalLoansActive += data.remainingBalance || 0;
            totalLoansDisbursed += data.amount || 0;
          });
        } catch (e) {
          console.log('No active_loans collection');
        }

        // Calcular retiros
        let totalWithdrawals = 0;
        try {
          const withdrawalsRef = collection(db, 'withdrawal_requests');
          const withdrawalsSnapshot = await getDocs(query(withdrawalsRef, where('status', '==', 'completed')));
          withdrawalsSnapshot.forEach((doc) => {
            totalWithdrawals += doc.data().amount || 0;
          });
        } catch (e) {
          console.log('No withdrawal_requests collection');
        }

        // Calcular multas
        let totalFines = 0;
        try {
          const attendanceRef = collection(db, 'meeting_attendance');
          const attendanceSnapshot = await getDocs(query(attendanceRef, where('fineApplied', '==', true)));
          attendanceSnapshot.forEach((doc) => {
            totalFines += doc.data().fineAmount || 0;
          });
        } catch (e) {
          console.log('No meeting_attendance collection');
        }

        // Construir reporte financiero
        const loanInterest = totalLoansDisbursed * 0.02 * 12; // Estimación 2% mensual
        const savingsInterest = totalSavingsDeposits * 0.015 * 12; // Estimación 1.5% mensual
        const fees = totalSavingsDeposits * 0.01; // 1% en fees
        
        const totalIncome = loanInterest + savingsInterest + fees + totalFines;
        const totalExpenses = totalLoansDisbursed + totalWithdrawals + (totalIncome * 0.05);
        const netIncome = totalIncome - totalExpenses;

        setFinancialReport({
          period: `${getMonthName(selectedMonth)} ${selectedYear}`,
          totalIncome,
          totalExpenses,
          netIncome,
          incomeBreakdown: {
            savingsInterest,
            loanInterest,
            fees,
            fines: totalFines,
          },
          expenseBreakdown: {
            loansDisbursed: totalLoansDisbursed,
            withdrawals: totalWithdrawals,
            administrative: totalIncome * 0.05,
          },
        });

        setUserPerformance(performances.sort((a, b) => b.creditScore - a.creditScore));

        // Métricas mensuales (últimos 3 meses simulados basados en data actual)
        setMonthlyMetrics([
          {
            month: 'Ene 2025',
            newMembers: Math.floor(usersSnapshot.size * 0.1),
            totalSavings: totalSavingsBalance,
            loansIssued: Math.floor(totalLoansActive / 2000000),
            loanAmount: totalLoansActive,
            meetingsHeld: 1,
            attendanceRate: 85,
          },
          {
            month: 'Dic 2024',
            newMembers: Math.floor(usersSnapshot.size * 0.08),
            totalSavings: totalSavingsBalance * 0.95,
            loansIssued: Math.floor(totalLoansActive / 2500000),
            loanAmount: totalLoansActive * 0.9,
            meetingsHeld: 1,
            attendanceRate: 88,
          },
          {
            month: 'Nov 2024',
            newMembers: Math.floor(usersSnapshot.size * 0.12),
            totalSavings: totalSavingsBalance * 0.9,
            loansIssued: Math.floor(totalLoansActive / 3000000),
            loanAmount: totalLoansActive * 0.85,
            meetingsHeld: 1,
            attendanceRate: 92,
          },
        ]);

      } catch (error) {
        console.error('Error loading reports data:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos de reportes',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadReportsData();
  }, [user, router, toast, selectedYear, selectedMonth]);

  const getMonthName = (month: string) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[parseInt(month) - 1] || 'Enero';
  };


  const statistics = useMemo(() => {
    const growthRate =
      financialReport.totalExpenses > 0
        ? ((financialReport.netIncome / financialReport.totalExpenses) * 100)
        : 0;
    const profitMargin =
      financialReport.totalIncome > 0
        ? ((financialReport.netIncome / financialReport.totalIncome) * 100)
        : 0;
    const avgSavingsPerUser =
      userPerformance.reduce((sum, u) => sum + u.savingsBalance, 0) / userPerformance.length;
    const activeLoansCount = userPerformance.filter(
      (u) => u.loanPaymentStatus !== 'sin-prestamo'
    ).length;
    const overdueLoansCount = userPerformance.filter(
      (u) => u.loanPaymentStatus === 'atrasado'
    ).length;
    const avgAttendance =
      userPerformance.reduce((sum, u) => sum + u.meetingAttendance, 0) / userPerformance.length;

    return {
      growthRate,
      profitMargin,
      avgSavingsPerUser,
      activeLoansCount,
      overdueLoansCount,
      avgAttendance,
    };
  }, [financialReport, userPerformance]);

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      toast({
        title: 'Exportando Reporte',
        description: `Generando archivo en formato ${format.toUpperCase()}...`,
      });
      // TODO: Implementar lógica real de exportación
    } catch (error) {
      console.error('Error exporting:', error);
      toast({
        title: 'Error',
        description: 'No se pudo exportar el reporte',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <BarChart3 className="mr-2 h-8 w-8" />
            Reportes y Analítica
          </h1>
          <p className="text-muted-foreground mt-1">
            Análisis financiero completo y reportes del fondo
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" onClick={() => handleExport('excel')}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/admin')}>
            Volver
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Período de Reporte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={selectedPeriod} onValueChange={(v: any) => setSelectedPeriod(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensual">Mensual</SelectItem>
                <SelectItem value="trimestral">Trimestral</SelectItem>
                <SelectItem value="anual">Anual</SelectItem>
                <SelectItem value="historico">Histórico</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
              </SelectContent>
            </Select>

            {selectedPeriod === 'mensual' && (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="01">Enero</SelectItem>
                  <SelectItem value="02">Febrero</SelectItem>
                  <SelectItem value="03">Marzo</SelectItem>
                  <SelectItem value="04">Abril</SelectItem>
                  <SelectItem value="05">Mayo</SelectItem>
                  <SelectItem value="06">Junio</SelectItem>
                  <SelectItem value="07">Julio</SelectItem>
                  <SelectItem value="08">Agosto</SelectItem>
                  <SelectItem value="09">Septiembre</SelectItem>
                  <SelectItem value="10">Octubre</SelectItem>
                  <SelectItem value="11">Noviembre</SelectItem>
                  <SelectItem value="12">Diciembre</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="mr-1 h-4 w-4 text-green-600" />
              Ingreso Neto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(financialReport.netIncome)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600">+{statistics.growthRate.toFixed(1)}%</span>
              <span className="text-xs text-muted-foreground">vs gastos</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Percent className="mr-1 h-4 w-4 text-blue-600" />
              Margen de Utilidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statistics.profitMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Sobre ingresos totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <PiggyBank className="mr-1 h-4 w-4 text-purple-600" />
              Ahorro Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(statistics.avgSavingsPerUser)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Por usuario</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Banknote className="mr-1 h-4 w-4 text-orange-600" />
              Préstamos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {statistics.activeLoansCount}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="destructive" className="text-xs">
                {statistics.overdueLoansCount} en mora
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen Financiero</TabsTrigger>
          <TabsTrigger value="income">Ingresos</TabsTrigger>
          <TabsTrigger value="expenses">Gastos</TabsTrigger>
          <TabsTrigger value="performance">Desempeño</TabsTrigger>
        </TabsList>

        {/* Tab: Resumen Financiero */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Balance General</CardTitle>
                <CardDescription>{financialReport.period}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Total Ingresos</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(financialReport.totalIncome)}
                    </span>
                  </div>
                  <Progress value={100} className="h-2 bg-green-100" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Total Gastos</span>
                    <span className="font-bold text-red-600">
                      {formatCurrency(financialReport.totalExpenses)}
                    </span>
                  </div>
                  <Progress
                    value={
                      (financialReport.totalExpenses / financialReport.totalIncome) * 100
                    }
                    className="h-2 bg-red-100"
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold">Ingreso Neto</span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatCurrency(financialReport.netIncome)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Margen: {statistics.profitMargin.toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Salud Financiera</CardTitle>
                <CardDescription>Indicadores clave</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Liquidez</span>
                    <Badge variant="default">Excelente</Badge>
                  </div>
                  <Progress value={85} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">85% de capacidad</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Cartera Saludable</span>
                    <Badge variant="default">
                      {(
                        ((statistics.activeLoansCount - statistics.overdueLoansCount) /
                          statistics.activeLoansCount) *
                        100
                      ).toFixed(0)}
                      %
                    </Badge>
                  </div>
                  <Progress
                    value={
                      ((statistics.activeLoansCount - statistics.overdueLoansCount) /
                        statistics.activeLoansCount) *
                      100
                    }
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {statistics.overdueLoansCount} préstamos en mora
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Asistencia a Reuniones</span>
                    <Badge
                      variant={statistics.avgAttendance >= 80 ? 'default' : 'secondary'}
                    >
                      {statistics.avgAttendance.toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress value={statistics.avgAttendance} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">Promedio del período</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Métricas Mensuales */}
          <Card>
            <CardHeader>
              <CardTitle>Tendencias Mensuales</CardTitle>
              <CardDescription>Últimos 3 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>Nuevos Miembros</TableHead>
                      <TableHead>Total Ahorros</TableHead>
                      <TableHead>Préstamos Emitidos</TableHead>
                      <TableHead>Monto Prestado</TableHead>
                      <TableHead>Asistencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyMetrics.map((metric, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{metric.month}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{metric.newMembers}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(metric.totalSavings)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">{metric.loansIssued}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-blue-600">
                          {formatCurrency(metric.loanAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={metric.attendanceRate >= 80 ? 'default' : 'secondary'}
                            className={
                              metric.attendanceRate >= 80 ? 'bg-green-600' : ''
                            }
                          >
                            {metric.attendanceRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Ingresos */}
        <TabsContent value="income" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Desglose de Ingresos</CardTitle>
              <CardDescription>
                {financialReport.period} - Total: {formatCurrency(financialReport.totalIncome)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <PiggyBank className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Intereses de Ahorros</span>
                    </div>
                    <span className="font-bold text-green-600">
                      {formatCurrency(financialReport.incomeBreakdown.savingsInterest)}
                    </span>
                  </div>
                  <Progress
                    value={
                      (financialReport.incomeBreakdown.savingsInterest /
                        financialReport.totalIncome) *
                      100
                    }
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(
                      (financialReport.incomeBreakdown.savingsInterest /
                        financialReport.totalIncome) *
                      100
                    ).toFixed(1)}
                    % del total
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Intereses de Préstamos</span>
                    </div>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(financialReport.incomeBreakdown.loanInterest)}
                    </span>
                  </div>
                  <Progress
                    value={
                      (financialReport.incomeBreakdown.loanInterest /
                        financialReport.totalIncome) *
                      100
                    }
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(
                      (financialReport.incomeBreakdown.loanInterest /
                        financialReport.totalIncome) *
                      100
                    ).toFixed(1)}
                    % del total
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Cuotas y Comisiones</span>
                    </div>
                    <span className="font-bold text-purple-600">
                      {formatCurrency(financialReport.incomeBreakdown.fees)}
                    </span>
                  </div>
                  <Progress
                    value={
                      (financialReport.incomeBreakdown.fees / financialReport.totalIncome) * 100
                    }
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(
                      (financialReport.incomeBreakdown.fees / financialReport.totalIncome) *
                      100
                    ).toFixed(1)}
                    % del total
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium">Multas por Inasistencia</span>
                    </div>
                    <span className="font-bold text-orange-600">
                      {formatCurrency(financialReport.incomeBreakdown.fines)}
                    </span>
                  </div>
                  <Progress
                    value={
                      (financialReport.incomeBreakdown.fines / financialReport.totalIncome) * 100
                    }
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(
                      (financialReport.incomeBreakdown.fines / financialReport.totalIncome) *
                      100
                    ).toFixed(1)}
                    % del total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Gastos */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Desglose de Gastos</CardTitle>
              <CardDescription>
                {financialReport.period} - Total: {formatCurrency(financialReport.totalExpenses)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium">Préstamos Desembolsados</span>
                    </div>
                    <span className="font-bold text-red-600">
                      {formatCurrency(financialReport.expenseBreakdown.loansDisbursed)}
                    </span>
                  </div>
                  <Progress
                    value={
                      (financialReport.expenseBreakdown.loansDisbursed /
                        financialReport.totalExpenses) *
                      100
                    }
                    className="h-2 [&>div]:bg-red-600"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(
                      (financialReport.expenseBreakdown.loansDisbursed /
                        financialReport.totalExpenses) *
                      100
                    ).toFixed(1)}
                    % del total
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium">Retiros de Ahorro</span>
                    </div>
                    <span className="font-bold text-orange-600">
                      {formatCurrency(financialReport.expenseBreakdown.withdrawals)}
                    </span>
                  </div>
                  <Progress
                    value={
                      (financialReport.expenseBreakdown.withdrawals /
                        financialReport.totalExpenses) *
                      100
                    }
                    className="h-2 [&>div]:bg-orange-600"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(
                      (financialReport.expenseBreakdown.withdrawals /
                        financialReport.totalExpenses) *
                      100
                    ).toFixed(1)}
                    % del total
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Gastos Administrativos</span>
                    </div>
                    <span className="font-bold text-purple-600">
                      {formatCurrency(financialReport.expenseBreakdown.administrative)}
                    </span>
                  </div>
                  <Progress
                    value={
                      (financialReport.expenseBreakdown.administrative /
                        financialReport.totalExpenses) *
                      100
                    }
                    className="h-2 [&>div]:bg-purple-600"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(
                      (financialReport.expenseBreakdown.administrative /
                        financialReport.totalExpenses) *
                      100
                    ).toFixed(1)}
                    % del total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Desempeño */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Desempeño por Usuario</CardTitle>
              <CardDescription>Ranking de usuarios por múltiples métricas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Ahorro Total</TableHead>
                      <TableHead>Préstamo Activo</TableHead>
                      <TableHead>Estado Pagos</TableHead>
                      <TableHead>Asistencia</TableHead>
                      <TableHead>Credit Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userPerformance
                      .sort((a, b) => b.creditScore - a.creditScore)
                      .map((user) => (
                        <TableRow key={user.userId}>
                          <TableCell className="font-medium">{user.userName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {user.role === 'asociado' ? 'Asociado' : 'Cliente'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatCurrency(user.savingsBalance)}
                          </TableCell>
                          <TableCell>
                            {user.activeLoanAmount > 0 ? (
                              <span className="font-semibold text-blue-600">
                                {formatCurrency(user.activeLoanAmount)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user.loanPaymentStatus === 'al-dia'
                                  ? 'default'
                                  : user.loanPaymentStatus === 'atrasado'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {user.loanPaymentStatus === 'al-dia'
                                ? 'Al Día'
                                : user.loanPaymentStatus === 'atrasado'
                                ? 'Atrasado'
                                : 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={user.meetingAttendance >= 80 ? 'default' : 'secondary'}
                              className={
                                user.meetingAttendance >= 80 ? 'bg-green-600' : ''
                              }
                            >
                              {user.meetingAttendance}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{user.creditScore}</span>
                              <Progress value={(user.creditScore / 1000) * 100} className="h-2 w-16" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
