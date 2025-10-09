'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/firebase/provider';
import { useFirestore } from '@/firebase/provider';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface Meeting {
  id: string;
  title: string;
  type: string;
  date: any;
  time: string;
  location: string;
  description: string;
  fineAmount: number;
  status: string;
  totalMembers: number;
  attendedMembers?: number;
  createdBy: string;
  createdAt: any;
}

export default function AssociateMeetingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMeetings();
    }
  }, [user]);

  async function loadMeetings() {
    if (!user) return;
    
    try {
      setLoading(true);
      // Query sin where para evitar índice compuesto
      // Filtraremos por status en el cliente
      const meetingsRef = collection(firestore, 'meetings');
      const q = query(
        meetingsRef,
        orderBy('date', 'desc'),
        limit(20) // Traemos más para tener suficientes después de filtrar
      );

      const snapshot = await getDocs(q);
      const allMeetings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Meeting[];

      // Filtrar por status en el cliente (evita índice compuesto)
      const filteredMeetings = allMeetings
        .filter(m => m.status === 'upcoming' || m.status === 'in-progress')
        .slice(0, 10); // Limitar a 10 después de filtrar

      setMeetings(filteredMeetings);
    } catch (error) {
      console.error('Error loading meetings:', error);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      upcoming: { label: 'Próxima', variant: 'default' },
      'in-progress': { label: 'En Curso', variant: 'secondary' },
      completed: { label: 'Completada', variant: 'outline' },
      cancelled: { label: 'Cancelada', variant: 'destructive' },
    };
    return statusMap[status] || { label: status, variant: 'secondary' };
  };

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; color: string }> = {
      mensual: { label: 'Mensual', color: 'bg-blue-100 text-blue-800' },
      extraordinaria: { label: 'Extraordinaria', color: 'bg-purple-100 text-purple-800' },
      general: { label: 'General', color: 'bg-green-100 text-green-800' },
    };
    return typeMap[type] || { label: type, color: 'bg-gray-100 text-gray-800' };
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl p-6">
        <Skeleton className="h-8 w-64 mb-6" />
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
      
      <h1 className="text-3xl font-bold mb-6 font-headline">Módulo de Reuniones</h1>

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Información</CardTitle>
          <CardDescription>Próximas reuniones del fondo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button className="w-full sm:w-auto" asChild>
              <Link href="/dashboard/reuniones">
                <Calendar className="mr-2 h-4 w-4" />
                Ver Todas las Reuniones
              </Link>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/dashboard/reuniones">
                <Clock className="mr-2 h-4 w-4" />
                Ver Historial de Asistencia
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Meetings List */}
      <Card>
        <CardHeader>
          <CardTitle>Próximas Reuniones</CardTitle>
          <CardDescription>Lista de reuniones programadas</CardDescription>
        </CardHeader>
        <CardContent>
          {meetings.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay reuniones programadas
            </div>
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{meeting.title}</h3>
                        <Badge variant={getStatusBadge(meeting.status).variant}>
                          {getStatusBadge(meeting.status).label}
                        </Badge>
                        <span className={`text-xs px-2 py-1 rounded ${getTypeBadge(meeting.type).color}`}>
                          {getTypeBadge(meeting.type).label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {meeting.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {meeting.date?.toDate ? 
                          meeting.date.toDate().toLocaleDateString('es-CO', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          }) : 
                          'Fecha por definir'
                        }
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{meeting.time}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{meeting.location}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{meeting.attendedMembers || 0}/{meeting.totalMembers} asistentes</span>
                      </div>
                      {meeting.fineAmount > 0 && (
                        <div className="text-red-600 font-medium">
                          Multa por inasistencia: {formatCurrency(meeting.fineAmount)}
                        </div>
                      )}
                    </div>
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
