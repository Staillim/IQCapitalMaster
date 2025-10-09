'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Search, MoreHorizontal, FileDown } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';


type User = {
  id: string;
  name: string;
  email: string;
  role: 'cliente' | 'asociado' | 'admin';
  status: 'activo' | 'inactivo' | 'pendiente';
  registrationDate: { seconds: number };
}

export default function AdminUsersPage() {
  const firestore = useFirestore();
  const { user: adminUser } = useUser();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [isPending, startTransition] = useTransition();

  const usersQuery = useMemoFirebase(() => {
    return firestore ? collection(firestore, 'users') : null;
  }, [firestore]);

  const { data: users, isLoading } = useCollection<User>(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!users) return [];

    return users.filter(user => {
      const searchMatch = searchTerm.toLowerCase() === '' ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const roleMatch = roleFilter === 'all' || user.role === roleFilter;

      return searchMatch && roleMatch;
    });
  }, [users, searchTerm, roleFilter]);

  const handleRoleChange = () => {
    if (!userToEdit || !firestore) return;

    startTransition(async () => {
        const newRole = userToEdit.role === 'cliente' ? 'asociado' : 'cliente';
        const userDocRef = doc(firestore, 'users', userToEdit.id);

        setDocumentNonBlocking(userDocRef, { role: newRole }, { merge: true });

        toast({
            title: "Rol Actualizado",
            description: `El rol de ${userToEdit.name} ha sido cambiado a ${newRole}.`,
        });
        setUserToEdit(null);
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
      case 'cliente':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto max-w-7xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/admin"> &larr; Volver al Dashboard</Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">Gestiona los roles de todos los usuarios del fondo.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Exportar</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            {isLoading ? 'Cargando usuarios...' : `Mostrando ${filteredUsers.length} de ${users?.length || 0} usuarios.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos los roles</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="asociado">Asociado</SelectItem>
                    <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Rol</TableHead>
                  <TableHead className="hidden sm:table-cell">Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Fecha de Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">Cargando usuarios...</TableCell>
                  </TableRow>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                         <Badge variant={getRoleVariant(user.role)} className="capitalize">{user.role}</Badge>
                      </TableCell>
                       <TableCell className="hidden sm:table-cell">
                         <Badge variant={getStatusVariant(user.status)} className="capitalize">{user.status || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {user.registrationDate ? new Date(user.registrationDate.seconds * 1000).toLocaleDateString('es-CO') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={user.id === adminUser?.uid || user.role === 'admin'}>
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setUserToEdit(user)}>
                                Cambiar Rol
                            </DropdownMenuItem>
                            <DropdownMenuItem>Ver Perfil</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive">Desactivar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">No se encontraron usuarios.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

        {userToEdit && (
            <AlertDialog open={!!userToEdit} onOpenChange={() => setUserToEdit(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Cambiar Rol de Usuario</AlertDialogTitle>
                    <AlertDialogDescription>
                        Estás a punto de cambiar el rol de <span className="font-bold">{userToEdit.name}</span>.
                        Su rol actual es <span className="font-bold capitalize">{userToEdit.role}</span>.
                        ¿Deseas cambiarlo a <span className="font-bold capitalize">{userToEdit.role === 'cliente' ? 'asociado' : 'cliente'}</span>?
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRoleChange} disabled={isPending}>
                        {isPending ? "Cambiando..." : "Confirmar Cambio"}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
    </div>
  );
}
