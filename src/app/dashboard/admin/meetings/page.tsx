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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Users,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Download,
  Video,
  TrendingUp,
} from 'lucide-react';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, query, getDocs, addDoc, updateDoc, doc, Timestamp, where } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

// Tipos
type Meeting = {
  id: string;
  title: string;
  type: 'mensual' | 'extraordinaria' | 'general';
  date: Date;
  time: string;
  location: string;
  isVirtual: boolean;
  meetingLink?: string;
  description: string;
  fineAmount: number;
  status: 'upcoming' | 'in-progress' | 'completed' | 'cancelled';
  totalMembers: number;
  attendees: number;
  absent: number;
  createdAt: Date;
};

type Attendance = {
  id: string;
  meetingId: string;
  userId: string;
  userName: string;
  userRole: 'cliente' | 'asociado' | 'admin';
  status: 'present' | 'absent' | 'late' | 'excused';
  checkInTime?: Date;
  notes?: string;
  fineApplied: boolean;
  fineAmount?: number;
};

export default function AdminMeetingsPage() {
  const router = useRouter();
  const firebaseContext = useFirebase();
  const user = firebaseContext?.user;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);

  // Form state
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    type: 'mensual' as 'mensual' | 'extraordinaria' | 'general',
    date: new Date(),
    time: '',
    location: '',
    isVirtual: false,
    meetingLink: '',
    description: '',
    fineAmount: 5000,
  });

  // Estados para datos de Firestore
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);

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

        // Cargar reuniones
        try {
          const meetingsRef = collection(db, 'meetings');
          const meetingsSnapshot = await getDocs(meetingsRef);
          
          const mtgs: Meeting[] = [];
          meetingsSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            mtgs.push({
              id: docSnap.id,
              title: data.title || '',
              type: data.type || 'mensual',
              date: data.date?.toDate() || new Date(),
              time: data.time || '',
              location: data.location || '',
              isVirtual: data.isVirtual || false,
              meetingLink: data.meetingLink,
              description: data.description || '',
              fineAmount: data.fineAmount || 5000,
              status: data.status || 'upcoming',
              totalMembers: data.totalMembers || 0,
              attendees: data.attendees || 0,
              absent: data.absent || 0,
              createdAt: data.createdAt?.toDate() || new Date(),
            });
          });
          setMeetings(mtgs);
        } catch (e) {
          console.log('No meetings collection yet');
          setMeetings([]);
        }

        // Cargar asistencias
        try {
          const attendanceRef = collection(db, 'meeting_attendance');
          const attendanceSnapshot = await getDocs(attendanceRef);
          
          const atts: Attendance[] = [];
          for (const docSnap of attendanceSnapshot.docs) {
            const data = docSnap.data();
            
            // Obtener nombre de usuario
            let userName = 'Usuario';
            let userRole: 'cliente' | 'asociado' | 'admin' = 'cliente';
            if (data.userId) {
              try {
                const userDoc = await getDocs(query(usersRef, where('__name__', '==', data.userId)));
                if (!userDoc.empty) {
                  const userData = userDoc.docs[0].data();
                  userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || 'Sin nombre';
                  userRole = userData.role || 'cliente';
                }
              } catch (e) {
                console.error('Error fetching user:', e);
              }
            }

            atts.push({
              id: docSnap.id,
              meetingId: data.meetingId || '',
              userId: data.userId || '',
              userName,
              userRole,
              status: data.status || 'absent',
              checkInTime: data.checkInTime?.toDate(),
              notes: data.notes,
              fineApplied: data.fineApplied || false,
              fineAmount: data.fineAmount,
            });
          }
          setAttendanceRecords(atts);
        } catch (e) {
          console.log('No meeting_attendance collection yet');
          setAttendanceRecords([]);
        }

      } catch (error) {
        console.error('Error loading meetings data:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos de reuniones',
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
    const upcoming = meetings.filter((m) => m.status === 'upcoming').length;
    const completed = meetings.filter((m) => m.status === 'completed').length;
    const totalAttendees = meetings.reduce((sum, m) => sum + m.attendees, 0);
    const totalAbsent = meetings.reduce((sum, m) => sum + m.absent, 0);
    const attendanceRate =
      totalAttendees + totalAbsent > 0
        ? (totalAttendees / (totalAttendees + totalAbsent)) * 100
        : 0;
    const totalFines = attendanceRecords.reduce(
      (sum, a) => sum + (a.fineApplied && a.fineAmount ? a.fineAmount : 0),
      0
    );

    return {
      upcoming,
      completed,
      totalMeetings: meetings.length,
      attendanceRate,
      totalFines,
      totalAbsent,
    };
  }, [meetings, attendanceRecords]);

  const upcomingMeetings = useMemo(() => {
    return meetings
      .filter((m) => m.status === 'upcoming')
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [meetings]);

  const pastMeetings = useMemo(() => {
    return meetings
      .filter((m) => m.status === 'completed')
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [meetings]);

  const handleCreateMeeting = async () => {
    try {
      const db = initializeFirebase().firestore;
      const meetingsRef = collection(db, 'meetings');

      // Obtener total de miembros (usuarios activos)
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(query(usersRef, where('status', '==', 'activo')));
      const totalMembers = usersSnapshot.size;

      // Crear la reunión
      const newMeeting = {
        title: meetingForm.title,
        type: meetingForm.type,
        date: Timestamp.fromDate(meetingForm.date),
        time: meetingForm.time,
        location: meetingForm.location,
        isVirtual: meetingForm.isVirtual,
        meetingLink: meetingForm.meetingLink || null,
        description: meetingForm.description,
        fineAmount: meetingForm.fineAmount,
        status: 'upcoming',
        totalMembers,
        attendees: 0,
        absent: 0,
        createdAt: Timestamp.now(),
        createdBy: user?.uid,
      };

      const docRef = await addDoc(meetingsRef, newMeeting);

      // Actualizar estado local
      setMeetings(prev => [...prev, {
        id: docRef.id,
        ...meetingForm,
        status: 'upcoming',
        totalMembers,
        attendees: 0,
        absent: 0,
        createdAt: new Date(),
      }]);

      toast({
        title: 'Reunión Creada',
        description: 'La reunión ha sido creada exitosamente',
      });
      setShowCreateDialog(false);
      // Reset form
      setMeetingForm({
        title: '',
        type: 'mensual',
        date: new Date(),
        time: '',
        location: '',
        isVirtual: false,
        meetingLink: '',
        description: '',
        fineAmount: 5000,
      });
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la reunión',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAttendance = async (attendanceId: string, status: 'present' | 'absent') => {
    try {
      // TODO: Implementar lógica real de marcado
      toast({
        title: 'Asistencia Registrada',
        description: `Asistencia marcada como ${status === 'present' ? 'presente' : 'ausente'}`,
      });
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: 'Error',
        description: 'No se pudo registrar la asistencia',
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
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
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
            <Users className="mr-2 h-8 w-8" />
            Gestión de Reuniones
          </h1>
          <p className="text-muted-foreground mt-1">
            Crea reuniones, controla asistencia y gestiona multas
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Reunión
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
            <CardTitle className="text-sm font-medium flex items-center">
              <CalendarIcon className="mr-1 h-4 w-4 text-blue-600" />
              Próximas Reuniones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{statistics.upcoming}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {statistics.totalMeetings} reuniones totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="mr-1 h-4 w-4 text-green-600" />
              Tasa de Asistencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statistics.attendanceRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {statistics.totalAbsent} ausencias totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle2 className="mr-1 h-4 w-4 text-purple-600" />
              Completadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{statistics.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">Reuniones finalizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="mr-1 h-4 w-4 text-orange-600" />
              Multas Aplicadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(statistics.totalFines)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total recaudado</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert para próximas reuniones */}
      {statistics.upcoming > 0 && (
        <Alert>
          <CalendarIcon className="h-4 w-4" />
          <AlertDescription>
            Tienes <strong>{statistics.upcoming}</strong> reuniones próximas programadas.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="upcoming">Próximas ({upcomingMeetings.length})</TabsTrigger>
          <TabsTrigger value="past">Historial ({pastMeetings.length})</TabsTrigger>
        </TabsList>

        {/* Tab: Resumen */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas de Asistencia</CardTitle>
                <CardDescription>Datos generales de participación</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Tasa de Asistencia Promedio</span>
                  <Badge variant="default">{statistics.attendanceRate.toFixed(1)}%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total de Ausencias</span>
                  <Badge variant="destructive">{statistics.totalAbsent}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Multas Aplicadas</span>
                  <Badge variant="secondary">{formatCurrency(statistics.totalFines)}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reuniones por Tipo</CardTitle>
                <CardDescription>Distribución de reuniones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Mensuales</span>
                  <Badge variant="default">
                    {meetings.filter((m) => m.type === 'mensual').length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Extraordinarias</span>
                  <Badge variant="secondary">
                    {meetings.filter((m) => m.type === 'extraordinaria').length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Generales</span>
                  <Badge variant="outline">
                    {meetings.filter((m) => m.type === 'general').length}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Próxima Reunión Destacada */}
          {upcomingMeetings.length > 0 && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Próxima Reunión</CardTitle>
                    <CardDescription>Detalles de la próxima reunión programada</CardDescription>
                  </div>
                  <Badge variant="default">Próximamente</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">{upcomingMeetings[0].title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(upcomingMeetings[0].date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{upcomingMeetings[0].time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {upcomingMeetings[0].isVirtual ? (
                        <Video className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>{upcomingMeetings[0].location}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {upcomingMeetings[0].description}
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedMeeting(upcomingMeetings[0]);
                        setShowAttendanceDialog(true);
                      }}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Marcar Asistencia
                    </Button>
                    {upcomingMeetings[0].isVirtual && upcomingMeetings[0].meetingLink && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(upcomingMeetings[0].meetingLink, '_blank')}
                      >
                        <Video className="mr-2 h-4 w-4" />
                        Unirse
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Próximas */}
        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reuniones Programadas</CardTitle>
              <CardDescription>Todas las reuniones futuras</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingMeetings.map((meeting) => (
                  <Card key={meeting.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{meeting.title}</h3>
                            <Badge variant="outline">
                              {meeting.type === 'mensual'
                                ? 'Mensual'
                                : meeting.type === 'extraordinaria'
                                ? 'Extraordinaria'
                                : 'General'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              <span>{formatDate(meeting.date)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{meeting.time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {meeting.isVirtual ? (
                                <Video className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span>{meeting.location}</span>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground">{meeting.description}</p>

                          <div className="flex items-center gap-4 text-sm">
                            <span>
                              <strong>Participantes:</strong> {meeting.totalMembers}
                            </span>
                            <span>
                              <strong>Multa:</strong> {formatCurrency(meeting.fineAmount)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedMeeting(meeting);
                              setShowAttendanceDialog(true);
                            }}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Asistencia
                          </Button>
                          {meeting.isVirtual && meeting.meetingLink && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(meeting.meetingLink, '_blank')}
                            >
                              <Video className="mr-2 h-4 w-4" />
                              Link
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {upcomingMeetings.length === 0 && (
                  <div className="text-center py-12">
                    <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground mt-4">No hay reuniones programadas</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Historial */}
        <TabsContent value="past" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reuniones Completadas</CardTitle>
              <CardDescription>Historial de reuniones pasadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Asistentes</TableHead>
                      <TableHead>Ausentes</TableHead>
                      <TableHead>Tasa</TableHead>
                      <TableHead>Multas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastMeetings.map((meeting) => {
                      const attendance =
                        meeting.totalMembers > 0
                          ? (meeting.attendees / meeting.totalMembers) * 100
                          : 0;
                      const fines = attendanceRecords
                        .filter((a) => a.meetingId === meeting.id && a.fineApplied)
                        .reduce((sum, a) => sum + (a.fineAmount || 0), 0);

                      return (
                        <TableRow key={meeting.id}>
                          <TableCell className="font-medium">{meeting.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {meeting.type === 'mensual'
                                ? 'Mensual'
                                : meeting.type === 'extraordinaria'
                                ? 'Extra'
                                : 'General'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(meeting.date)}</TableCell>
                          <TableCell>
                            <Badge variant="default">{meeting.attendees}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">{meeting.absent}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={attendance >= 80 ? 'default' : 'secondary'}
                              className={attendance >= 80 ? 'bg-green-600' : ''}
                            >
                              {attendance.toFixed(0)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-orange-600 font-semibold">
                            {formatCurrency(fines)}
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
      </Tabs>

      {/* Dialog: Crear Reunión */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Nueva Reunión</DialogTitle>
            <DialogDescription>
              Completa la información para programar una nueva reunión
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título de la Reunión</Label>
              <Input
                id="title"
                placeholder="Ej: Reunión Mensual Febrero"
                value={meetingForm.title}
                onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Tipo de Reunión</Label>
                <Select
                  value={meetingForm.type}
                  onValueChange={(value: any) => setMeetingForm({ ...meetingForm, type: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensual">Mensual</SelectItem>
                    <SelectItem value="extraordinaria">Extraordinaria</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="time">Hora</Label>
                <Input
                  id="time"
                  type="time"
                  value={meetingForm.time}
                  onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                placeholder="Ej: Sede Principal o Link de reunión virtual"
                value={meetingForm.location}
                onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isVirtual"
                checked={meetingForm.isVirtual}
                onCheckedChange={(checked) =>
                  setMeetingForm({ ...meetingForm, isVirtual: checked as boolean })
                }
              />
              <Label htmlFor="isVirtual">Reunión Virtual</Label>
            </div>

            {meetingForm.isVirtual && (
              <div>
                <Label htmlFor="meetingLink">Link de la Reunión</Label>
                <Input
                  id="meetingLink"
                  placeholder="https://meet.google.com/..."
                  value={meetingForm.meetingLink}
                  onChange={(e) =>
                    setMeetingForm({ ...meetingForm, meetingLink: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Describe el propósito de la reunión..."
                value={meetingForm.description}
                onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="fineAmount">Multa por Inasistencia (COP)</Label>
              <Input
                id="fineAmount"
                type="number"
                step="1000"
                value={meetingForm.fineAmount}
                onChange={(e) =>
                  setMeetingForm({ ...meetingForm, fineAmount: Number(e.target.value) })
                }
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateMeeting}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Reunión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Asistencia */}
      <Dialog open={showAttendanceDialog} onOpenChange={setShowAttendanceDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Control de Asistencia</DialogTitle>
            <DialogDescription>
              {selectedMeeting?.title} - {selectedMeeting && formatDate(selectedMeeting.date)}
            </DialogDescription>
          </DialogHeader>

          {selectedMeeting && (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Multa</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords
                      .filter((a) => a.meetingId === selectedMeeting.id)
                      .map((attendance) => (
                        <TableRow key={attendance.id}>
                          <TableCell className="font-medium">{attendance.userName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {attendance.userRole === 'asociado'
                                ? 'Asociado'
                                : attendance.userRole === 'cliente'
                                ? 'Cliente'
                                : 'Admin'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                attendance.status === 'present'
                                  ? 'default'
                                  : attendance.status === 'absent'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {attendance.status === 'present'
                                ? 'Presente'
                                : attendance.status === 'absent'
                                ? 'Ausente'
                                : attendance.status === 'late'
                                ? 'Tardío'
                                : 'Excusado'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {attendance.checkInTime
                              ? formatTime(attendance.checkInTime)
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {attendance.fineApplied && attendance.fineAmount ? (
                              <span className="text-orange-600 font-semibold">
                                {formatCurrency(attendance.fineAmount)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMarkAttendance(attendance.id, 'present')}
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMarkAttendance(attendance.id, 'absent')}
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAttendanceDialog(false)}>
              Cerrar
            </Button>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
