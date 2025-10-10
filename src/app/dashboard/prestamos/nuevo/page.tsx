'use client';

import { useState } from 'react';
import { AnimatedCard } from '@/components/ui/animated-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, DollarSign, Calculator, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useFirebase } from '@/firebase/provider';
import { createLoanApplication } from '@/lib/loans-service';
import { formatCurrency } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';

export default function NewLoanRequestPage() {
  const { user } = useFirebase();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [term, setTerm] = useState('');
  const [purpose, setPurpose] = useState('');
  const [description, setDescription] = useState('');
  
  // Calculated values
  const interestRate = 2.5; // 2.5% mensual
  const monthlyPayment = amount && term ? 
    (parseFloat(amount) * (1 + (interestRate / 100) * parseInt(term))) / parseInt(term) : 0;
  const totalToRepay = monthlyPayment * (term ? parseInt(term) : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Debes iniciar sesión para solicitar un préstamo');
      return;
    }

    if (!amount || !term || !purpose) {
      setError('Por favor completa todos los campos obligatorios');
      return;
    }

    const amountNum = parseFloat(amount);
    const termNum = parseInt(term);

    if (amountNum <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    if (termNum <= 0 || termNum > 120) {
      setError('El plazo debe estar entre 1 y 120 meses (10 años)');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await createLoanApplication({
        userId: user.uid,
        applicantName: user.displayName || `${user.email}`,
        amount: amountNum,
        term: termNum,
        purpose,
        codeudores: [], // Por ahora vacío, se puede agregar después
      });

      if (result.success) {
        setSuccess(true);
        
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push('/dashboard/prestamos');
        }, 2000);
      } else {
        setError(result.message || 'Error al enviar la solicitud');
      }
    } catch (err) {
      console.error('Error creating loan request:', err);
      setError('Error al enviar la solicitud. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <AnimatedCard
          title="¡Solicitud Enviada!"
          description="Tu solicitud de préstamo ha sido enviada exitosamente. Un asociado la revisará pronto."
          icon={<CheckCircle2 className="h-8 w-8" />}
          gradient="vibrant"
          className="border-green-200 bg-green-50/50"
        >
          <div className="flex justify-center pt-4">
            <Button 
              onClick={() => router.push('/dashboard/prestamos')}
              size="lg"
            >
              Volver a Préstamos
            </Button>
          </div>
        </AnimatedCard>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/prestamos">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Préstamos
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline">Solicitar Préstamo</h1>
        <p className="text-muted-foreground mt-2">
          Completa el formulario para solicitar un nuevo préstamo
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Form */}
        <div className="md:col-span-2">
          <AnimatedCard
            title="Información del Préstamo"
            description="Ingresa los detalles de tu solicitud"
            gradient="medium"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Monto */}
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    Monto a Solicitar <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-9"
                      min="0"
                      step="1000"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ingresa el monto que necesitas en pesos colombianos (COP)
                  </p>
                </div>

                {/* Plazo */}
                <div className="space-y-2">
                  <Label htmlFor="term">
                    Plazo (Meses) <span className="text-red-500">*</span>
                  </Label>
                  <Select value={term} onValueChange={setTerm} required>
                    <SelectTrigger id="term">
                      <SelectValue placeholder="Selecciona el plazo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 mes</SelectItem>
                      <SelectItem value="2">2 meses</SelectItem>
                      <SelectItem value="3">3 meses</SelectItem>
                      <SelectItem value="6">6 meses</SelectItem>
                      <SelectItem value="9">9 meses</SelectItem>
                      <SelectItem value="12">12 meses (1 año)</SelectItem>
                      <SelectItem value="18">18 meses</SelectItem>
                      <SelectItem value="24">24 meses (2 años)</SelectItem>
                      <SelectItem value="30">30 meses</SelectItem>
                      <SelectItem value="36">36 meses (3 años)</SelectItem>
                      <SelectItem value="48">48 meses (4 años)</SelectItem>
                      <SelectItem value="60">60 meses (5 años)</SelectItem>
                      <SelectItem value="72">72 meses (6 años)</SelectItem>
                      <SelectItem value="84">84 meses (7 años)</SelectItem>
                      <SelectItem value="96">96 meses (8 años)</SelectItem>
                      <SelectItem value="120">120 meses (10 años)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Elige en cuántos meses deseas pagar el préstamo (hasta 10 años)
                  </p>
                </div>

                {/* Propósito */}
                <div className="space-y-2">
                  <Label htmlFor="purpose">
                    Propósito <span className="text-red-500">*</span>
                  </Label>
                  <Select value={purpose} onValueChange={setPurpose} required>
                    <SelectTrigger id="purpose">
                      <SelectValue placeholder="Selecciona el propósito" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Gastos Personales</SelectItem>
                      <SelectItem value="educacion">Educación</SelectItem>
                      <SelectItem value="salud">Salud</SelectItem>
                      <SelectItem value="vivienda">Vivienda</SelectItem>
                      <SelectItem value="negocio">Negocio</SelectItem>
                      <SelectItem value="emergencia">Emergencia</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Descripción */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Descripción (Opcional)
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe brevemente para qué necesitas el préstamo..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Proporciona detalles adicionales que ayuden a evaluar tu solicitud
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/dashboard/prestamos')}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading || !amount || !term || !purpose}>
                    {loading ? 'Enviando...' : 'Enviar Solicitud'}
                  </Button>
                </div>
              </form>
          </AnimatedCard>
        </div>

        {/* Sidebar - Summary */}
        <div className="space-y-4">
          {/* Calculation Summary */}
          <AnimatedCard
            title="Resumen"
            icon={<Calculator className="h-5 w-5" />}
            gradient="vivid"
          >
              <div>
                <p className="text-sm text-muted-foreground">Monto Solicitado</p>
                <p className="text-2xl font-bold">
                  {amount ? formatCurrency(parseFloat(amount)) : formatCurrency(0)}
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">Tasa de Interés</p>
                <p className="text-lg font-semibold">{interestRate}% mensual</p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">Plazo</p>
                <p className="text-lg font-semibold">
                  {term ? `${term} meses` : 'No seleccionado'}
                </p>
              </div>

              {amount && term && (
                <>
                  <div className="border-t pt-4 bg-primary/5 -mx-6 px-6 py-4">
                    <p className="text-sm text-muted-foreground">Cuota Mensual</p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(monthlyPayment)}
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground">Total a Pagar</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(totalToRepay)}
                    </p>
                  </div>
                </>
              )}
          </AnimatedCard>

          {/* Information Card */}
          <AnimatedCard
            title="Información"
            icon={<AlertCircle className="h-5 w-5" />}
            gradient="intense"
          >
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Tu solicitud será revisada por un asociado en un plazo de 24-48 horas
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    La aprobación está sujeta a evaluación crediticia
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Los pagos mensuales se descuentan automáticamente
                  </p>
                </div>
              </div>
          </AnimatedCard>

          {/* Requirements Card */}
          <AnimatedCard
            title="Requisitos"
            gradient="light"
          >
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Ser miembro activo del fondo
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Tener al menos 3 meses de antigüedad
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                No tener préstamos vencidos
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Historial de ahorro regular
              </li>
            </ul>
          </AnimatedCard>
        </div>
      </div>
    </div>
  );
}
