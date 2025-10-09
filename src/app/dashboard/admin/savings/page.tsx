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
import {
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Download,
  Eye,
  CheckCheck,
  XCircle,
  ArrowUpDown,
} from 'lucide-react';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { collection, query, getDocs, updateDoc, doc, Timestamp, where } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

// Tipos
type SavingsAccount = {
  id: string;
  userId: string;
  userName: string;
  balance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  monthlyContribution: number;
  status: 'active' | 'inactive';
  lastDeposit?: Date;
};

type WithdrawalRequest = {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  currentBalance: number;
  requestDate: Date;
  scheduledDate: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reviewNotes?: string;
};

type Transaction = {
  id: string;
  userId: string;
  userName: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  date: Date;
  description: string;
  status: 'completed' | 'pending' | 'cancelled';
};

export default function AdminSavingsPage() {
  const router = useRouter();
  const firebaseContext = useFirebase();
  const user = firebaseContext?.user;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Estados para datos de Firestore
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

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

        // Cargar cuentas de ahorro desde users
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        const accounts: SavingsAccount[] = [];
        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          accounts.push({
            id: doc.id,
            userId: doc.id,
            userName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || 'Sin nombre',
            balance: userData.savingsBalance || 0,
            totalDeposits: userData.totalSavingsDeposits || 0,
            totalWithdrawals: userData.totalSavingsWithdrawals || 0,
            monthlyContribution: userData.monthlyContribution || 50000,
            status: userData.status === 'activo' ? 'active' : 'inactive',
            lastDeposit: userData.lastSavingsDeposit ? userData.lastSavingsDeposit.toDate() : undefined,
          });
        });
        setSavingsAccounts(accounts);

        // Cargar solicitudes de retiro (si existe la colección)
        try {
          const withdrawalsRef = collection(db, 'withdrawal_requests');
          const withdrawalsSnapshot = await getDocs(withdrawalsRef);
          
          const requests: WithdrawalRequest[] = [];
          for (const docSnap of withdrawalsSnapshot.docs) {
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

            requests.push({
              id: docSnap.id,
              userId: data.userId || '',
              userName,
              amount: data.amount || 0,
              currentBalance: data.currentBalance || 0,
              requestDate: data.requestDate?.toDate() || new Date(),
              scheduledDate: data.scheduledDate?.toDate() || new Date(),
              reason: data.reason || '',
              status: data.status || 'pending',
              reviewNotes: data.reviewNotes,
            });
          }
          setWithdrawalRequests(requests);
        } catch (e) {
          console.log('No withdrawal_requests collection yet');
          setWithdrawalRequests([]);
        }

        // Cargar transacciones (si existe la colección)
        try {
          const transactionsRef = collection(db, 'savings_transactions');
          const transactionsSnapshot = await getDocs(transactionsRef);
          
          const txs: Transaction[] = [];
          for (const docSnap of transactionsSnapshot.docs) {
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

            txs.push({
              id: docSnap.id,
              userId: data.userId || '',
              userName,
              type: data.type || 'deposit',
              amount: data.amount || 0,
              date: data.date?.toDate() || new Date(),
              description: data.description || '',
              status: data.status || 'completed',
            });
          }
          setTransactions(txs);
        } catch (e) {
          console.log('No savings_transactions collection yet');
          setTransactions([]);
        }

      } catch (error) {
        console.error('Error loading savings data:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos de ahorros',
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
    const totalBalance = savingsAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalDeposits = savingsAccounts.reduce((sum, acc) => sum + acc.totalDeposits, 0);
    const totalWithdrawals = savingsAccounts.reduce((sum, acc) => sum + acc.totalWithdrawals, 0);
    const activeAccounts = savingsAccounts.filter((acc) => acc.status === 'active').length;
    const pendingWithdrawals = withdrawalRequests.filter((req) => req.status === 'pending').length;

    return {
      totalBalance,
      totalDeposits,
      totalWithdrawals,
      activeAccounts,
      pendingWithdrawals,
      netGrowth: totalDeposits - totalWithdrawals,
      averageBalance: totalBalance / savingsAccounts.length || 0,
    };
  }, [savingsAccounts, withdrawalRequests]);

  const filteredAccounts = useMemo(() => {
    return savingsAccounts.filter((account) => {
      const searchMatch =
        searchTerm.toLowerCase() === '' ||
        account.userName.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = statusFilter === 'all' || account.status === statusFilter;
      return searchMatch && statusMatch;
    });
  }, [savingsAccounts, searchTerm, statusFilter]);

  const filteredRequests = useMemo(() => {
    return withdrawalRequests.filter((request) => {
      const searchMatch =
        searchTerm.toLowerCase() === '' ||
        request.userName.toLowerCase().includes(searchTerm.toLowerCase());
      return searchMatch;
    });
  }, [withdrawalRequests, searchTerm]);

  const handleApproveWithdrawal = async (requestId: string) => {
    try {
      const db = initializeFirebase().firestore;
      const requestRef = doc(db, 'withdrawal_requests', requestId);
      
      await updateDoc(requestRef, {
        status: 'approved',
        reviewNotes,
        reviewedBy: user?.uid,
        reviewedAt: Timestamp.now(),
      });

      // Actualizar estado local
      setWithdrawalRequests(prev => 
        prev.map(req => req.id === requestId ? { ...req, status: 'approved', reviewNotes } : req)
      );

      toast({
        title: 'Retiro Aprobado',
        description: 'La solicitud de retiro ha sido aprobada exitosamente',
      });
      setSelectedRequest(null);
      setReviewNotes('');
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      toast({
        title: 'Error',
        description: 'No se pudo aprobar el retiro',
        variant: 'destructive',
      });
    }
  };

  const handleRejectWithdrawal = async (requestId: string) => {
    try {
      const db = initializeFirebase().firestore;
      const requestRef = doc(db, 'withdrawal_requests', requestId);
      
      await updateDoc(requestRef, {
        status: 'rejected',
        reviewNotes,
        reviewedBy: user?.uid,
        reviewedAt: Timestamp.now(),
      });

      // Actualizar estado local
      setWithdrawalRequests(prev => 
        prev.map(req => req.id === requestId ? { ...req, status: 'rejected', reviewNotes } : req)
      );

      toast({
        title: 'Retiro Rechazado',
        description: 'La solicitud de retiro ha sido rechazada',
      });
      setSelectedRequest(null);
      setReviewNotes('');
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      toast({
        title: 'Error',
        description: 'No se pudo rechazar el retiro',
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
            <PiggyBank className="mr-2 h-8 w-8" />
            Gestión de Ahorros
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra cuentas de ahorro, retiros y transacciones
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
            <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(statistics.totalBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {statistics.activeAccounts} cuentas activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="mr-1 h-4 w-4 text-green-600" />
              Total Depósitos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(statistics.totalDeposits)}</div>
            <p className="text-xs text-muted-foreground mt-1">Acumulado histórico</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingDown className="mr-1 h-4 w-4 text-red-600" />
              Total Retiros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(statistics.totalWithdrawals)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Acumulado histórico</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="mr-1 h-4 w-4 text-yellow-600" />
              Retiros Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {statistics.pendingWithdrawals}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Esperando aprobación</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {statistics.pendingWithdrawals > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tienes <strong>{statistics.pendingWithdrawals}</strong> solicitudes de retiro pendientes
            de revisión.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="accounts">
            Cuentas ({savingsAccounts.length})
          </TabsTrigger>
          <TabsTrigger value="withdrawals">
            Retiros ({withdrawalRequests.length})
          </TabsTrigger>
          <TabsTrigger value="transactions">
            Transacciones ({transactions.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Resumen */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Crecimiento Neto</CardTitle>
                <CardDescription>Diferencia entre depósitos y retiros</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(statistics.netGrowth)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Balance promedio por cuenta: {formatCurrency(statistics.averageBalance)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estado de Cuentas</CardTitle>
                <CardDescription>Distribución por estado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Activas</span>
                  <Badge variant="default">{statistics.activeAccounts}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Inactivas</span>
                  <Badge variant="secondary">
                    {savingsAccounts.length - statistics.activeAccounts}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top 5 Ahorradores */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Ahorradores</CardTitle>
              <CardDescription>Usuarios con mayor balance de ahorro</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...savingsAccounts]
                  .sort((a, b) => b.balance - a.balance)
                  .slice(0, 5)
                  .map((account, index) => (
                    <div key={account.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-lg text-muted-foreground">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{account.userName}</p>
                          <p className="text-sm text-muted-foreground">
                            Cuota: {formatCurrency(account.monthlyContribution)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {formatCurrency(account.balance)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Cuentas */}
        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="active">Activas</SelectItem>
                    <SelectItem value="inactive">Inactivas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cuentas de Ahorro ({filteredAccounts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Cuota Mensual</TableHead>
                      <TableHead>Total Depósitos</TableHead>
                      <TableHead>Total Retiros</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Último Depósito</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.userName}</TableCell>
                        <TableCell className="font-bold text-green-600">
                          {formatCurrency(account.balance)}
                        </TableCell>
                        <TableCell>{formatCurrency(account.monthlyContribution)}</TableCell>
                        <TableCell>{formatCurrency(account.totalDeposits)}</TableCell>
                        <TableCell className="text-red-600">
                          {formatCurrency(account.totalWithdrawals)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                            {account.status === 'active' ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {account.lastDeposit ? formatDate(account.lastDeposit) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Retiros */}
        <TabsContent value="withdrawals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Solicitudes de Retiro ({filteredRequests.length})</CardTitle>
              <CardDescription>Revisa y aprueba/rechaza solicitudes de retiro</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{request.userName}</h3>
                            <Badge
                              variant={
                                request.status === 'pending'
                                  ? 'outline'
                                  : request.status === 'approved'
                                  ? 'default'
                                  : 'destructive'
                              }
                            >
                              {request.status === 'pending'
                                ? 'Pendiente'
                                : request.status === 'approved'
                                ? 'Aprobado'
                                : 'Rechazado'}
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
                              <p className="text-muted-foreground">Balance Actual</p>
                              <p className="font-semibold">{formatCurrency(request.currentBalance)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Fecha Solicitud</p>
                              <p className="font-semibold">{formatDate(request.requestDate)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Fecha Programada</p>
                              <p className="font-semibold">{formatDate(request.scheduledDate)}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground">Motivo:</p>
                            <p className="text-sm">{request.reason}</p>
                          </div>

                          {request.reviewNotes && (
                            <div className="mt-2 p-3 bg-muted rounded-md">
                              <p className="text-sm text-muted-foreground">Notas de revisión:</p>
                              <p className="text-sm">{request.reviewNotes}</p>
                            </div>
                          )}
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
                    <p className="text-muted-foreground mt-4">No hay solicitudes de retiro</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Transacciones */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Transacciones</CardTitle>
              <CardDescription>Todas las transacciones de ahorro y retiro</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-sm">
                          {formatDate(transaction.date)}
                        </TableCell>
                        <TableCell className="font-medium">{transaction.userName}</TableCell>
                        <TableCell>
                          <Badge
                            variant={transaction.type === 'deposit' ? 'default' : 'destructive'}
                          >
                            {transaction.type === 'deposit' ? (
                              <>
                                <TrendingUp className="mr-1 h-3 w-3" />
                                Depósito
                              </>
                            ) : (
                              <>
                                <TrendingDown className="mr-1 h-3 w-3" />
                                Retiro
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={
                            transaction.type === 'deposit'
                              ? 'font-bold text-green-600'
                              : 'font-bold text-red-600'
                          }
                        >
                          {transaction.type === 'deposit' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell className="text-sm">{transaction.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{transaction.status}</Badge>
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

      {/* Dialog: Revisar Retiro */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisar Solicitud de Retiro</DialogTitle>
            <DialogDescription>
              Revisa la información y aprueba o rechaza esta solicitud
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
                  <Label>Monto Solicitado</Label>
                  <p className="font-bold text-blue-600">
                    {formatCurrency(selectedRequest.amount)}
                  </p>
                </div>
                <div>
                  <Label>Balance Actual</Label>
                  <p className="font-semibold">{formatCurrency(selectedRequest.currentBalance)}</p>
                </div>
                <div>
                  <Label>Balance Después del Retiro</Label>
                  <p className="font-semibold">
                    {formatCurrency(selectedRequest.currentBalance - selectedRequest.amount)}
                  </p>
                </div>
              </div>

              <div>
                <Label>Motivo del Retiro</Label>
                <p className="text-sm mt-1">{selectedRequest.reason}</p>
              </div>

              <div>
                <Label>Fechas</Label>
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Solicitud</p>
                    <p className="text-sm font-semibold">
                      {formatDate(selectedRequest.requestDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha Programada</p>
                    <p className="text-sm font-semibold">
                      {formatDate(selectedRequest.scheduledDate)}
                    </p>
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
              onClick={() => selectedRequest && handleRejectWithdrawal(selectedRequest.id)}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Rechazar
            </Button>
            <Button
              onClick={() => selectedRequest && handleApproveWithdrawal(selectedRequest.id)}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
