import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LoanStatus() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado de Préstamo Activo</CardTitle>
        <CardDescription>Tu progreso de préstamo personal</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <p>No tienes préstamos activos</p>
        </div>
      </CardContent>
    </Card>
  );
}
