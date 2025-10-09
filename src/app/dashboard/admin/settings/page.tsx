'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminSettingsPage() {
  return (
    <div className="container mx-auto max-w-6xl">
       <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/admin"> &larr; Volver al Dashboard</Link>
        </Button>
      </div>
      <h1 className="text-3xl font-bold mb-6 font-headline">Configuración General</h1>
      <Card>
        <CardHeader>
          <CardTitle>Ajustes Globales del Fondo</CardTitle>
          <CardDescription>
            Ajusta cuotas, tasas de interés y otras reglas del fondo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-8 border-2 border-dashed rounded-lg text-center">
            <h2 className="text-xl font-semibold">En Construcción</h2>
            <p className="text-muted-foreground">
              Este módulo está siendo desarrollado. Pronto podrás configurar el fondo desde aquí.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
