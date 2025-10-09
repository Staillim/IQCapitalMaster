'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Download } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

export default function ReportesPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const transactionsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/transactions`);
  }, [user, firestore]);

  const { data: transactions, isLoading } = useCollection(transactionsQuery);

  const chartData = useMemoFirebase(() => {
    if (!transactions) return [];
    
    const monthlyData = transactions.reduce((acc, t) => {
        const date = new Date(t.transactionDate.seconds * 1000);
        const month = date.toLocaleString('es-CO', { month: 'long' });
        if (!acc[month]) {
            acc[month] = { month, ahorros: 0, prestamos: 0 };
        }
        if (t.transactionType === 'ahorro') {
            acc[month].ahorros += t.amount;
        } else if (t.transactionType === 'abono_prestamo') {
            acc[month].prestamos += t.amount;
        }
        return acc;
    }, {} as Record<string, { month: string; ahorros: number; prestamos: number }>);

    return Object.values(monthlyData);
  }, [transactions]);

  const chartConfig = {
    ahorros: {
      label: "Ahorros",
      color: "hsl(var(--chart-1))",
    },
    prestamos: {
      label: "Préstamos",
      color: "hsl(var(--chart-2))",
    },
  }
  return (
    <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 font-headline">Estado de Cuenta / Reportes</h1>
        <Card>
        <CardHeader>
            <CardTitle>Estado de Cuenta</CardTitle>
            <CardDescription>Visualiza tu actividad financiera.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
            <div className="h-[350px] w-full">
            {isLoading && <p>Cargando datos del gráfico...</p>}
            {!isLoading && chartData.length === 0 && <p>No hay datos para mostrar.</p>}
            {!isLoading && chartData.length > 0 && (
              <ChartContainer config={chartConfig} className="w-full h-full">
                  <BarChart accessibilityLayer data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                      dataKey="month"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                  />
                  <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Bar dataKey="ahorros" fill="var(--color-ahorros)" radius={4} />
                  <Bar dataKey="prestamos" fill="var(--color-prestamos)" radius={4} />
                  </BarChart>
              </ChartContainer>
            )}
            </div>
            <Button variant="secondary" className="self-start"><Download className="mr-2" /> Exportar PDF</Button>
        </CardContent>
        </Card>
    </div>
  );
}
