import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function TransactionHistory() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Transacciones</CardTitle>
        <CardDescription>Lista de tus transacciones recientes.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <p>No hay transacciones para mostrar</p>
        </div>
      </CardContent>
    </Card>
  );
}
