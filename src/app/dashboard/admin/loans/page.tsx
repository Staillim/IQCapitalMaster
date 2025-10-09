'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Eye,
  CheckCheck,
  XCircle,
  DollarSign,
  Calendar,
  FileText,
  AlertCircle,
  Download,
} from 'lucide-react';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { collection, query, getDocs, updateDoc, doc, addDoc, Timestamp, where } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

// Tipos
type LoanRequest = {
  id: string;
  userId: string;
  userName: string;
  userRole: 'cliente' | 'asociado';
  amount: number;
  term: number; // meses
  purpose: string;
  interestRate: number;
  monthlyPayment: number;
  totalToRepay: number;
  requestDate: Date;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed';
  reviewNotes?: string;
  riskLevel?: 'low' | 'medium' | 'high';
};

type ActiveLoan = {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  term: number;
  interestRate: number;
  monthlyPayment: number;
  totalToRepay: number;
  totalPaid: number;
  remainingBalance: number;
  paymentsCompleted: number;
  nextPaymentDate: Date;
  status: 'active' | 'overdue' | 'completed';
  approvalDate: Date;
};

type Payment = {
  id: string;
  loanId: string;
  userId: string;
  userName: string;
  amount: number;
  paymentDate: Date;
  dueDate: Date;
  status: 'on-time' | 'late' | 'missed';
  lateFee?: number;
};

export default function AdminLoansPage() {
  const router = useRouter();
  const firebaseContext = useFirebase();
  const user = firebaseContext?.user;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<LoanRequest | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<ActiveLoan | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Estados para datos de Firestore
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([]);
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Cargar datos desde Firestore
  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const db = initializeFirebase().firestore;
        const usersRef = collection(db, 'users');

        // Cargar solicitudes de préstamo
        try {
          const requestsRef = collection(db, 'loan_requests');
          const requestsSnapshot = await getDocs(requestsRef);
          
          const requests: LoanRequest[] = [];
          for (const docSnap of requestsSnapshot.docs) {
            const data = docSnap.data();
            
            // Obtener nombre de usuario
            let userName = 'Usuario';
            let userRole: 'cliente' | 'asociado' = 'cliente';
            if (data.userId) {
              try {
                const userDoc = await getDocs(query(usersRef, where('__name__', '==', data.userId)));
                if (!userDoc.empty) {
                  const userData = userDoc.docs[0].data();
                  userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || 'Sin nombre';
                  userRole = userData.role === 'asociado' ? 'asociado' : 'cliente';
                }
              } catch (e) {
                console.error('Error fetching user:', e);
              }
            }

            requests.push({
              id: docSnap.id,
              userId: data.userId || '',
              userName,
              userRole,
              amount: data.amount || 0,
              term: data.term || 12,
              purpose: data.purpose || '',
              interestRate: data.interestRate || 2.0,
              monthlyPayment: data.monthlyPayment || 0,
              totalToRepay: data.totalToRepay || 0,
              requestDate: data.requestDate?.toDate() || new Date(),
              status: data.status || 'pending',
              reviewNotes: data.reviewNotes,
              riskLevel: data.riskLevel || 'medium',
            });
          }
          setLoanRequests(requests);
        } catch (e) {
          console.log('No loan_requests collection yet');
          setLoanRequests([]);
        }

        // Cargar préstamos activos
        try {
          const loansRef = collection(db, 'active_loans');
          const loansSnapshot = await getDocs(loansRef);
          
          const loans: ActiveLoan[] = [];
          for (const docSnap of loansSnapshot.docs) {
            const data = docSnap.data();
            
            // Obtener nombre de usuario
            let userName = 'Usuario';
            if (data.userId) {
              try {
                const userDoc = await getDocs(query(usersRef, where('__name__', '==', data.userId)));
                if (!userDoc.empty) {
                  const userData = userDoc.docs[0].data();
                  userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || 'Sin nombre';
                }
              } catch (e) {
                console.error('Error fetching user:', e);
              }
            }

            loans.push({
              id: docSnap.id,
              userId: data.userId || '',
              userName,
              amount: data.amount || 0,
              term: data.term || 12,
              interestRate: data.interestRate || 2.0,
              monthlyPayment: data.monthlyPayment || 0,
              totalToRepay: data.totalToRepay || 0,
              totalPaid: data.totalPaid || 0,
              remainingBalance: data.remainingBalance || 0,
              paymentsCompleted: data.paymentsCompleted || 0,
              nextPaymentDate: data.nextPaymentDate?.toDate() || new Date(),
              status: data.status || 'active',
              approvalDate: data.approvalDate?.toDate() || new Date(),
            });
          }
          setActiveLoans(loans);
        } catch (e) {
          console.log('No active_loans collection yet');
          setActiveLoans([]);
        }

        // Cargar pagos
        try {
          const paymentsRef = collection(db, 'loan_payments');
          const paymentsSnapshot = await getDocs(paymentsRef);
          
          const pyts: Payment[] = [];
          for (const docSnap of paymentsSnapshot.docs) {
            const data = docSnap.data();
            
            // Obtener nombre de usuario
            let userName = 'Usuario';
            if (data.userId) {
              try {
                const userDoc = await getDocs(query(usersRef, where('__name__', '==', data.userId)));
                if (!userDoc.empty) {
                  const userData = userDoc.docs[0].data();
                  userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || 'Sin nombre';
                }
              } catch (e) {
                console.error('Error fetching user:', e);
              }
            }

            pyts.push({
              id: docSnap.id,
              loanId: data.loanId || '',
              userId: data.userId || '',
              userName,
              amount: data.amount || 0,
              paymentDate: data.paymentDate?.toDate() || new Date(),
              dueDate: data.dueDate?.toDate() || new Date(),
              status: data.status || 'on-time',
              lateFee: data.lateFee,
            });
          }
          setPayments(pyts);
        } catch (e) {
          console.log('No loan_payments collection yet');
          setPayments([]);
        }

      } catch (error) {
        console.error('Error loading loans data:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos de préstamos',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, router, toast]);


  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  const statistics = useMemo(() => {
    const totalLoaned = activeLoans.reduce((sum, loan) => sum + loan.amount, 0);
    const totalOutstanding = activeLoans.reduce((sum, loan) => sum + loan.remainingBalance, 0);
    const totalCollected = activeLoans.reduce((sum, loan) => sum + loan.totalPaid, 0);
    const overdueLoans = activeLoans.filter((loan) => loan.status === 'overdue').length;
    const pendingRequests = loanRequests.filter((req) => req.status === 'pending').length;
    const activeCount = activeLoans.filter((loan) => loan.status === 'active').length;

    return {
      totalLoaned,
      totalOutstanding,
      totalCollected,
      overdueLoans,
      pendingRequests,
      activeCount,
      defaultRate: activeLoans.length > 0 ? (overdueLoans / activeLoans.length) * 100 : 0,
    };
  }, [activeLoans, loanRequests]);

  const filteredRequests = useMemo(() => {
    return loanRequests.filter((request) => {
      const searchMatch =
        searchTerm.toLowerCase() === '' ||
        request.userName.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = statusFilter === 'all' || request.status === statusFilter;
      return searchMatch && statusMatch;
    });
  }, [loanRequests, searchTerm, statusFilter]);

  const filteredLoans = useMemo(() => {
    return activeLoans.filter((loan) => {
      const searchMatch =
        searchTerm.toLowerCase() === '' ||
        loan.userName.toLowerCase().includes(searchTerm.toLowerCase());
      return searchMatch;
    });
  }, [activeLoans, searchTerm]);

  const handleApproveLoan = async (requestId: string) => {
    try {
      const db = initializeFirebase().firestore;
      const requestRef = doc(db, 'loan_requests', requestId);
      
      await updateDoc(requestRef, {
        status: 'approved',
        reviewNotes,
        reviewedBy: user?.uid,
        reviewedAt: Timestamp.now(),
      });

      // Actualizar estado local
      setLoanRequests(prev => 
        prev.map(req => req.id === requestId ? { ...req, status: 'approved', reviewNotes } : req)
      );

      toast({
        title: 'Préstamo Aprobado',
        description: 'La solicitud ha sido aprobada exitosamente',
      });
      setSelectedRequest(null);
      setReviewNotes('');
    } catch (error) {
      console.error('Error approving loan:', error);
      toast({
        title: 'Error',
        description: 'No se pudo aprobar el préstamo',
        variant: 'destructive',
      });
    }
  };

  const handleRejectLoan = async (requestId: string) => {
    try {
      const db = initializeFirebase().firestore;
      const requestRef = doc(db, 'loan_requests', requestId);
      
      await updateDoc(requestRef, {
        status: 'rejected',
        reviewNotes,
        reviewedBy: user?.uid,
        reviewedAt: Timestamp.now(),
      });

      // Actualizar estado local
      setLoanRequests(prev => 
        prev.map(req => req.id === requestId ? { ...req, status: 'rejected', reviewNotes } : req)
      );

      toast({
        title: 'Préstamo Rechazado',
        description: 'La solicitud ha sido rechazada',
      });
      setSelectedRequest(null);
      setReviewNotes('');
    } catch (error) {
      console.error('Error rejecting loan:', error);
      toast({
        title: 'Error',
        description: 'No se pudo rechazar el préstamo',
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
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
            <Banknote className="mr-2 h-8 w-8" />
            Gestión de Préstamos
          </h1>
          <p className="text-muted-foreground mt-1">
            Aprueba solicitudes, monitorea pagos y gestiona mora
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {}}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/admin')}>
            Volver
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Préstamos Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{statistics.activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(statistics.totalLoaned)} total prestado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="mr-1 h-4 w-4 text-red-600" />
              Saldo Pendiente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(statistics.totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Por cobrar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle2 className="mr-1 h-4 w-4 text-green-600" />
              Total Recaudado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(statistics.totalCollected)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pagos realizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="mr-1 h-4 w-4 text-orange-600" />
              En Mora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{statistics.overdueLoans}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tasa de mora: {statistics.defaultRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {(statistics.pendingRequests > 0 || statistics.overdueLoans > 0) && (
        <div className="space-y-2">
          {statistics.pendingRequests > 0 && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Tienes <strong>{statistics.pendingRequests}</strong> solicitudes de préstamo
                pendientes de revisión.
              </AlertDescription>
            </Alert>
          )}
          {statistics.overdueLoans > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{statistics.overdueLoans}</strong> préstamos en mora requieren atención
                inmediata.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="requests">
            Solicitudes ({loanRequests.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Activos ({activeLoans.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            Pagos ({payments.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Resumen */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Salud de la Cartera</CardTitle>
                <CardDescription>Estado general de préstamos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Recaudado</span>
                    <span className="font-semibold">
                      {(
                        (statistics.totalCollected /
                          (statistics.totalCollected + statistics.totalOutstanding)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      (statistics.totalCollected /
                        (statistics.totalCollected + statistics.totalOutstanding)) *
                      100
                    }
                    className="h-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Préstamos Activos</p>
                    <p className="text-2xl font-bold text-blue-600">{statistics.activeCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">En Mora</p>
                    <p className="text-2xl font-bold text-orange-600">{statistics.overdueLoans}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Análisis Financiero</CardTitle>
                <CardDescription>Flujo de dinero</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Prestado</span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(statistics.totalLoaned)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Recaudado</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(statistics.totalCollected)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pendiente de Cobro</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(statistics.totalOutstanding)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-semibold">Intereses Generados</span>
                  <span className="font-bold text-purple-600">
                    {formatCurrency(statistics.totalCollected - statistics.totalLoaned + statistics.totalOutstanding)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Prestatarios */}
          <Card>
            <CardHeader>
              <CardTitle>Préstamos por Monto</CardTitle>
              <CardDescription>Top 5 préstamos más grandes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...activeLoans]
                  .sort((a, b) => b.amount - a.amount)
                  .slice(0, 5)
                  .map((loan, index) => (
                    <div key={loan.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-lg text-muted-foreground">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{loan.userName}</p>
                          <p className="text-sm text-muted-foreground">
                            {loan.paymentsCompleted}/{loan.term} pagos
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">{formatCurrency(loan.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          Pendiente: {formatCurrency(loan.remainingBalance)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Solicitudes */}
        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Solicitudes Pendientes ({filteredRequests.length})</CardTitle>
              <CardDescription>Revisa y aprueba solicitudes de préstamo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{request.userName}</h3>
                            <Badge variant="outline">
                              {request.userRole === 'asociado' ? 'Asociado' : 'Cliente'}
                            </Badge>
                            <Badge
                              variant={
                                request.riskLevel === 'low'
                                  ? 'default'
                                  : request.riskLevel === 'medium'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                            >
                              Riesgo {request.riskLevel === 'low' ? 'Bajo' : request.riskLevel === 'medium' ? 'Medio' : 'Alto'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Monto Solicitado</p>
                              <p className="font-bold text-blue-600">
                                {formatCurrency(request.amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Plazo</p>
                              <p className="font-semibold">{request.term} meses</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Cuota Mensual</p>
                              <p className="font-semibold">{formatCurrency(request.monthlyPayment)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total a Pagar</p>
                              <p className="font-semibold text-red-600">
                                {formatCurrency(request.totalToRepay)}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground">Propósito:</p>
                            <p className="text-sm">{request.purpose}</p>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Solicitado el {formatDate(request.requestDate)} • Tasa: {request.interestRate}% mensual
                          </div>
                        </div>

                        {request.status === 'pending' && (
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedRequest(request)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Revisar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredRequests.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground mt-4">No hay solicitudes pendientes</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Activos */}
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Préstamos Activos ({filteredLoans.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Progreso</TableHead>
                      <TableHead>Pagado</TableHead>
                      <TableHead>Pendiente</TableHead>
                      <TableHead>Próx. Pago</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLoans.map((loan) => {
                      const progress = (loan.paymentsCompleted / loan.term) * 100;
                      return (
                        <TableRow key={loan.id}>
                          <TableCell className="font-medium">{loan.userName}</TableCell>
                          <TableCell className="font-bold text-blue-600">
                            {formatCurrency(loan.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="w-32">
                              <Progress value={progress} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {loan.paymentsCompleted}/{loan.term} pagos
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-green-600">
                            {formatCurrency(loan.totalPaid)}
                          </TableCell>
                          <TableCell className="text-red-600">
                            {formatCurrency(loan.remainingBalance)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(loan.nextPaymentDate)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                loan.status === 'active'
                                  ? 'default'
                                  : loan.status === 'overdue'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {loan.status === 'active'
                                ? 'Activo'
                                : loan.status === 'overdue'
                                ? 'En Mora'
                                : 'Completado'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedLoan(loan)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Pagos */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos</CardTitle>
              <CardDescription>Todos los pagos realizados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha de Pago</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Fecha Límite</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Mora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-sm">
                          {formatDate(payment.paymentDate)}
                        </TableCell>
                        <TableCell className="font-medium">{payment.userName}</TableCell>
                        <TableCell className="font-bold text-green-600">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(payment.dueDate)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payment.status === 'on-time'
                                ? 'default'
                                : payment.status === 'late'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {payment.status === 'on-time'
                              ? 'A Tiempo'
                              : payment.status === 'late'
                              ? 'Tardío'
                              : 'No Pagado'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.lateFee ? (
                            <span className="text-sm text-orange-600">
                              {formatCurrency(payment.lateFee)}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
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

      {/* Dialog: Revisar Solicitud */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisar Solicitud de Préstamo</DialogTitle>
            <DialogDescription>
              Analiza la información y aprueba o rechaza esta solicitud
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Usuario</Label>
                  <p className="font-semibold">{selectedRequest.userName}</p>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Badge variant="outline">
                    {selectedRequest.userRole === 'asociado' ? 'Asociado' : 'Cliente'}
                  </Badge>
                </div>
                <div>
                  <Label>Monto Solicitado</Label>
                  <p className="font-bold text-blue-600">
                    {formatCurrency(selectedRequest.amount)}
                  </p>
                </div>
                <div>
                  <Label>Plazo</Label>
                  <p className="font-semibold">{selectedRequest.term} meses</p>
                </div>
                <div>
                  <Label>Tasa de Interés</Label>
                  <p className="font-semibold">{selectedRequest.interestRate}% mensual</p>
                </div>
                <div>
                  <Label>Cuota Mensual</Label>
                  <p className="font-semibold">{formatCurrency(selectedRequest.monthlyPayment)}</p>
                </div>
              </div>

              <div>
                <Label>Propósito del Préstamo</Label>
                <p className="text-sm mt-1">{selectedRequest.purpose}</p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total a Reembolsar</p>
                    <p className="text-xl font-bold text-red-600">
                      {formatCurrency(selectedRequest.totalToRepay)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nivel de Riesgo</p>
                    <Badge
                      variant={
                        selectedRequest.riskLevel === 'low'
                          ? 'default'
                          : selectedRequest.riskLevel === 'medium'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {selectedRequest.riskLevel === 'low'
                        ? 'Bajo'
                        : selectedRequest.riskLevel === 'medium'
                        ? 'Medio'
                        : 'Alto'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="reviewNotes">Notas de Revisión (Opcional)</Label>
                <Textarea
                  id="reviewNotes"
                  placeholder="Agrega comentarios sobre esta decisión..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedRequest && handleRejectLoan(selectedRequest.id)}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Rechazar
            </Button>
            <Button onClick={() => selectedRequest && handleApproveLoan(selectedRequest.id)}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalle de Préstamo Activo */}
      <Dialog open={!!selectedLoan} onOpenChange={() => setSelectedLoan(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del Préstamo</DialogTitle>
            <DialogDescription>Información completa del préstamo activo</DialogDescription>
          </DialogHeader>

          {selectedLoan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prestatario</Label>
                  <p className="font-semibold">{selectedLoan.userName}</p>
                </div>
                <div>
                  <Label>Fecha de Aprobación</Label>
                  <p className="text-sm">{formatDate(selectedLoan.approvalDate)}</p>
                </div>
                <div>
                  <Label>Monto Original</Label>
                  <p className="font-bold text-blue-600">
                    {formatCurrency(selectedLoan.amount)}
                  </p>
                </div>
                <div>
                  <Label>Total a Pagar</Label>
                  <p className="font-bold text-red-600">
                    {formatCurrency(selectedLoan.totalToRepay)}
                  </p>
                </div>
              </div>

              <div>
                <Label>Progreso de Pagos</Label>
                <div className="mt-2">
                  <Progress
                    value={(selectedLoan.paymentsCompleted / selectedLoan.term) * 100}
                    className="h-3"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedLoan.paymentsCompleted} de {selectedLoan.term} pagos completados (
                    {((selectedLoan.paymentsCompleted / selectedLoan.term) * 100).toFixed(1)}%)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Pagado</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(selectedLoan.totalPaid)}
                  </p>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <p className="text-sm text-muted-foreground">Saldo Pendiente</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(selectedLoan.remainingBalance)}
                  </p>
                </div>
              </div>

              <div>
                <Label>Próximo Pago</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{formatDate(selectedLoan.nextPaymentDate)}</span>
                  <Badge
                    variant={selectedLoan.status === 'overdue' ? 'destructive' : 'default'}
                  >
                    {selectedLoan.status === 'overdue' ? 'Vencido' : 'Próximo'}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLoan(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
