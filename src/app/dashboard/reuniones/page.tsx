'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { ArrowRight, Check } from 'lucide-react';

export default function ReunionesPage() {
  const firestore = useFirestore();

  const meetingsQuery = useMemoFirebase(() => {
    return collection(firestore, `meetings`);
  }, [firestore]);

  const { data: meetings, isLoading } = useCollection(meetingsQuery);


  return (
    <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 font-headline">Módulo de Reuniones</h1>
        <Card>
        <CardHeader>
            <CardTitle>Reuniones</CardTitle>
            <CardDescription>Consulta las próximas reuniones y confirma tu asistencia.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Cargando reuniones...</p>}
          {!isLoading && (!meetings || meetings.length === 0) && <p className="text-sm text-muted-foreground">No hay reuniones programadas.</p>}
          {!isLoading && meetings && meetings.length > 0 && (
            <Table>
              <TableHeader>
                  <TableRow>
                  <TableHead>Reunión</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {meetings.map(meeting => (
                  <TableRow key={meeting.id}>
                    <TableCell>{meeting.name}</TableCell>
                    <TableCell>{new Date(meeting.date.seconds * 1000).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric'})}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="mr-2"><Check className="mr-1" /> Asistir</Button>
                        <Button size="sm" disabled={!meeting.active}>Entrar <ArrowRight className="ml-1" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        </Card>
    </div>
  );
}
