'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import {
  Search,
  MoreHorizontal,
  FileDown,
  UserCheck,
  UserX,
  Shield,
  User,
  Users,
  Activity,
  BarChart2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Filter,
  Download,
  Mail,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { toggleUserStatus, getUserMetrics } from '@/lib/admin-service';
import type { UserMetrics } from '@/types/admin';

type User = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  role: 'cliente' | 'asociado' | 'admin';
  status: 'activo' | 'inactivo' | 'pendiente';
  registrationDate: { seconds: number };
};

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { user: adminUser } = useUser();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState(searchParams?.get('role') || 'all');
  const [statusFilter, setStatusFilter] = useState(searchParams?.get('status') || 'all');
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToToggle, setUserToToggle] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToView, setUserToView] = useState<string | null>(null);
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isPending, startTransition] = useTransition();

  const usersQuery = useMemoFirebase(() => {
    return firestore ? collection(firestore, 'users') : null;
  }, [firestore]);

  const { data: users, isLoading } = useCollection<User>(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!users) return [];

    return users.filter((user) => {
      const searchMatch =
        searchTerm.toLowerCase() === '' ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.toLowerCase().includes(searchTerm.toLowerCase());

      const roleMatch = roleFilter === 'all' || user.role === roleFilter;
      const statusMatch = statusFilter === 'all' || user.status === statusFilter;

      return searchMatch && roleMatch && statusMatch;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const statistics = useMemo(() => {
    if (!users) return { total: 0, active: 0, pending: 0, inactive: 0 };

    return {
      total: users.length,
      active: users.filter((u) => u.status === 'activo').length,
      pending: users.filter((u) => u.status === 'pendiente').length,
      inactive: users.filter((u) => u.status === 'inactivo').length,
    };
  }, [users]);

  useEffect(() => {
    if (userToView) {
      loadUserMetrics(userToView);
    }
  }, [userToView]);

  const loadUserMetrics = async (userId: string) => {
    try {
      setLoadingMetrics(true);
      const metrics = await getUserMetrics(userId);
      setUserMetrics(metrics);
    } catch (error) {
      console.error('Error loading user metrics:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las métricas del usuario',
        variant: 'destructive',
      });
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleRoleChange = () => {
    if (!userToEdit || !firestore) return;

    startTransition(async () => {
      const newRole = userToEdit.role === 'cliente' ? 'asociado' : 'cliente';
      const userDocRef = doc(firestore, 'users', userToEdit.id);

      setDocumentNonBlocking(userDocRef, { role: newRole }, { merge: true });

      toast({
        title: 'Rol Actualizado',
        description: `El rol de ${userToEdit.name} ha sido cambiado a ${newRole}.`,
      });
      setUserToEdit(null);
    });
  };

  const handleToggleStatus = async () => {
    if (!userToToggle || !adminUser?.uid) return;

    try {
      const newStatus = userToToggle.status === 'activo' ? 'inactivo' : 'activo';
      await toggleUserStatus(userToToggle.id, newStatus, adminUser.uid);

      toast({
        title: 'Estado Actualizado',
        description: `El usuario ha sido ${newStatus === 'activo' ? 'activado' : 'desactivado'}.`,
      });
      setUserToToggle(null);
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado del usuario',
        variant: 'destructive',
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((u) => u.id));
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleExport = () => {
    // Crear CSV
    const headers = ['Nombre', 'Email', 'Teléfono', 'Rol', 'Estado', 'Fecha de Registro'];
    const csvData = filteredUsers.map((user) => [
      user.name,
      user.email,
      user.phone || '',
      user.role,
      user.status,
      new Date(user.registrationDate.seconds * 1000).toLocaleDateString('es-CO'),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers, ...csvData].map((row) => row.join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Exportación Exitosa',
      description: `Se han exportado ${filteredUsers.length} usuarios`,
    });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'activo':
        return 'default';
      case 'inactivo':
        return 'secondary';
      case 'pendiente':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'asociado':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (seconds: number) => {
    return new Date(seconds * 1000).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Users className="mr-2 h-8 w-8" />
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra todos los usuarios del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/admin')}>
            Volver
          </Button>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total}</div>
            <p className="text-xs text-muted-foreground">Registrados en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle2 className="mr-1 h-4 w-4 text-green-600" />
              Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics.active}</div>
            <p className="text-xs text-muted-foreground">
              {((statistics.active / statistics.total) * 100).toFixed(0)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="mr-1 h-4 w-4 text-yellow-600" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{statistics.pending}</div>
            <p className="text-xs text-muted-foreground">Esperando aprobación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <XCircle className="mr-1 h-4 w-4 text-red-600" />
              Inactivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statistics.inactive}</div>
            <p className="text-xs text-muted-foreground">Suspendidos o desactivados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y Búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o teléfono..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="cliente">Clientes</SelectItem>
                <SelectItem value="asociado">Asociados</SelectItem>
                <SelectItem value="admin">Administradores</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="activo">Activos</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="inactivo">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedUsers.length > 0 && (
            <Alert>
              <Activity className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {selectedUsers.length} {selectedUsers.length === 1 ? 'usuario seleccionado' : 'usuarios seleccionados'}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowBulkActions(true)}>
                    Acciones en Lote
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedUsers([])}>
                    Limpiar Selección
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Tabla de Usuarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Usuarios ({filteredUsers.length})</span>
            {filteredUsers.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                {selectedUsers.length === filteredUsers.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground mt-4">No se encontraron usuarios</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedUsers.length === filteredUsers.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => handleSelectUser(user.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{user.phone || 'Sin teléfono'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleVariant(user.role)}>
                          {user.role === 'admin' && <Shield className="mr-1 h-3 w-3" />}
                          {user.role === 'asociado' && <UserCheck className="mr-1 h-3 w-3" />}
                          {user.role === 'cliente' && <User className="mr-1 h-3 w-3" />}
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(user.registrationDate.seconds)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setUserToView(user.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setUserToEdit(user)}>
                              <Activity className="mr-2 h-4 w-4" />
                              Cambiar Rol
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setUserToToggle(user)}>
                              {user.status === 'activo' ? (
                                <>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Activar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setUserToDelete(user)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Cambiar Rol */}
      <AlertDialog open={!!userToEdit} onOpenChange={() => setUserToEdit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar Rol de Usuario</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                ¿Estás seguro de que quieres cambiar el rol de <strong>{userToEdit?.name}</strong> de{' '}
                <Badge variant={getRoleVariant(userToEdit?.role || 'cliente')}>{userToEdit?.role}</Badge> a{' '}
                <Badge variant={getRoleVariant(userToEdit?.role === 'cliente' ? 'asociado' : 'cliente')}>
                  {userToEdit?.role === 'cliente' ? 'asociado' : 'cliente'}
                </Badge>
                ?
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleChange} disabled={isPending}>
              {isPending ? 'Cambiando...' : 'Cambiar Rol'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Toggle Status */}
      <AlertDialog open={!!userToToggle} onOpenChange={() => setUserToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToToggle?.status === 'activo' ? 'Desactivar' : 'Activar'} Usuario
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres {userToToggle?.status === 'activo' ? 'desactivar' : 'activar'} a{' '}
              <strong>{userToToggle?.name}</strong>?
              {userToToggle?.status === 'activo' &&
                ' El usuario no podrá acceder al sistema mientras esté desactivado.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus}>
              {userToToggle?.status === 'activo' ? 'Desactivar' : 'Activar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Ver Detalles */}
      <Dialog open={!!userToView} onOpenChange={() => setUserToView(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Métricas del Usuario</DialogTitle>
            <DialogDescription>Información detallada y estadísticas del usuario</DialogDescription>
          </DialogHeader>
          {loadingMetrics ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : userMetrics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Ahorros Totales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(userMetrics.totalSavings)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Balance actual: {formatCurrency(userMetrics.currentSavingsBalance)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Préstamos Activos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {userMetrics.currentActiveLoans}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Deuda total: {formatCurrency(userMetrics.totalOutstandingDebt)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Asistencia a Reuniones</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userMetrics.attendanceRate.toFixed(0)}%</div>
                    <p className="text-xs text-muted-foreground">
                      {userMetrics.totalMeetingsAttended} asistidas, {userMetrics.totalMeetingsMissed} ausencias
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Historial de Pagos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge
                      variant={
                        userMetrics.paymentHistory === 'excellent'
                          ? 'default'
                          : userMetrics.paymentHistory === 'good'
                          ? 'outline'
                          : 'destructive'
                      }
                    >
                      {userMetrics.paymentHistory}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      {userMetrics.overduePayments} pagos vencidos
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No se pudieron cargar las métricas</p>
          )}
          <DialogFooter>
            <Button onClick={() => setUserToView(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
