'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  DollarSign,
  Percent,
  Calendar,
  AlertCircle,
  Save,
  RotateCcw,
  TrendingUp,
  Wallet,
  CreditCard,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { getSystemConfig, updateSystemConfig } from '@/lib/admin-service';
import type { SystemConfig, UpdateSystemConfigData } from '@/types/admin';
import { useToast } from '@/hooks/use-toast';

export default function ConfigPage() {
  const router = useRouter();
  const firebaseContext = useFirebase();
  const user = firebaseContext?.user;
  const { toast } = useToast();

  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de formulario
  const [interestRateAsociado, setInterestRateAsociado] = useState('2.0');
  const [interestRateCliente, setInterestRateCliente] = useState('2.5');
  const [minimumMonthlySavings, setMinimumMonthlySavings] = useState('50000');
  const [annualMaintenanceFee, setAnnualMaintenanceFee] = useState('20000');
  const [meetingAbsenceFine, setMeetingAbsenceFine] = useState('5000');
  const [minLoanAmount, setMinLoanAmount] = useState('100000');
  const [maxLoanAmount, setMaxLoanAmount] = useState('5000000');
  const [minTermMonths, setMinTermMonths] = useState('1');
  const [maxTermMonths, setMaxTermMonths] = useState('24');
  const [approvalRequiredAmount, setApprovalRequiredAmount] = useState('1000000');
  const [advanceNoticeDays, setAdvanceNoticeDays] = useState('30');
  const [penaltyPercentage, setPenaltyPercentage] = useState('10');
  const [minWithdrawalAmount, setMinWithdrawalAmount] = useState('50000');
  const [maxWithdrawalAmount, setMaxWithdrawalAmount] = useState('10000000');

  useEffect(() => {
    if (!user) {
      router.push('/');
    } else {
      loadConfig();
    }
  }, [user, router]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const configData = await getSystemConfig();
      if (configData) {
        setConfig(configData);
        // Cargar valores en el formulario
        setInterestRateAsociado(configData.interestRates.asociado.toString());
        setInterestRateCliente(configData.interestRates.cliente.toString());
        setMinimumMonthlySavings(configData.fees.minimumMonthlySavings.toString());
        setAnnualMaintenanceFee(configData.fees.annualMaintenanceFee.toString());
        setMeetingAbsenceFine(configData.fees.meetingAbsenceFine.toString());
        setMinLoanAmount(configData.loanParameters.minAmount.toString());
        setMaxLoanAmount(configData.loanParameters.maxAmount.toString());
        setMinTermMonths(configData.loanParameters.minTermMonths.toString());
        setMaxTermMonths(configData.loanParameters.maxTermMonths.toString());
        setApprovalRequiredAmount(configData.loanParameters.approvalRequiredAmount.toString());
        setAdvanceNoticeDays(configData.withdrawalParameters.advanceNoticeDays.toString());
        setPenaltyPercentage(configData.withdrawalParameters.penaltyPercentage.toString());
        setMinWithdrawalAmount(configData.withdrawalParameters.minAmount.toString());
        setMaxWithdrawalAmount(configData.withdrawalParameters.maxAmount.toString());
      }
    } catch (err: any) {
      console.error('Error loading config:', err);
      setError(err.message || 'Error al cargar la configuración');
      toast({
        title: 'Error',
        description: 'No se pudo cargar la configuración del sistema',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.uid) return;

    try {
      setSaving(true);
      setError(null);

      const updateData: UpdateSystemConfigData = {
        interestRates: {
          asociado: parseFloat(interestRateAsociado),
          cliente: parseFloat(interestRateCliente),
        },
        fees: {
          minimumMonthlySavings: parseFloat(minimumMonthlySavings),
          annualMaintenanceFee: parseFloat(annualMaintenanceFee),
          meetingAbsenceFine: parseFloat(meetingAbsenceFine),
        },
        loanParameters: {
          minAmount: parseFloat(minLoanAmount),
          maxAmount: parseFloat(maxLoanAmount),
          minTermMonths: parseInt(minTermMonths),
          maxTermMonths: parseInt(maxTermMonths),
          requireCodebtor: true,
          approvalRequiredAmount: parseFloat(approvalRequiredAmount),
        },
        withdrawalParameters: {
          advanceNoticeDays: parseInt(advanceNoticeDays),
          penaltyPercentage: parseFloat(penaltyPercentage),
          minAmount: parseFloat(minWithdrawalAmount),
          maxAmount: parseFloat(maxWithdrawalAmount),
        },
        updatedBy: user.uid,
      };

      await updateSystemConfig(updateData);
      await loadConfig(); // Recargar configuración

      toast({
        title: 'Configuración guardada',
        description: 'Los cambios se han aplicado correctamente',
      });
    } catch (err: any) {
      console.error('Error saving config:', err);
      setError(err.message || 'Error al guardar la configuración');
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Settings className="mr-2 h-8 w-8" />
            Configuración del Sistema
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los parámetros operativos del Fondo de Ahorros y Préstamos
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/admin')}>
          Volver
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Última Actualización */}
      {config && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            <span className="font-semibold">Última actualización:</span>{' '}
            {formatDate(config.updatedAt)}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="interest" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="interest">
            <Percent className="mr-2 h-4 w-4" />
            Tasas de Interés
          </TabsTrigger>
          <TabsTrigger value="fees">
            <DollarSign className="mr-2 h-4 w-4" />
            Cuotas y Multas
          </TabsTrigger>
          <TabsTrigger value="loans">
            <CreditCard className="mr-2 h-4 w-4" />
            Préstamos
          </TabsTrigger>
          <TabsTrigger value="withdrawals">
            <Wallet className="mr-2 h-4 w-4" />
            Retiros
          </TabsTrigger>
        </TabsList>

        {/* Tasas de Interés */}
        <TabsContent value="interest" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Tasas de Interés para Préstamos
              </CardTitle>
              <CardDescription>
                Configura las tasas de interés aplicadas a los préstamos según el tipo de usuario
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="interestRateAsociado">
                    Tasa de Interés - Asociados
                    <Badge variant="outline" className="ml-2">
                      Mensual
                    </Badge>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="interestRateAsociado"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={interestRateAsociado}
                      onChange={(e) => setInterestRateAsociado(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-2xl font-bold text-muted-foreground">%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Interés aplicado mensualmente a préstamos de asociados
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interestRateCliente">
                    Tasa de Interés - Clientes
                    <Badge variant="outline" className="ml-2">
                      Mensual
                    </Badge>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="interestRateCliente"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={interestRateCliente}
                      onChange={(e) => setInterestRateCliente(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-2xl font-bold text-muted-foreground">%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Interés aplicado mensualmente a préstamos de clientes
                  </p>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Las tasas de interés se aplican mensualmente. Un préstamo de{' '}
                  {formatCurrency(1000000)} a {interestRateAsociado}% generaría{' '}
                  {formatCurrency(parseFloat(interestRateAsociado) * 10000)} de interés mensual.
                </AlertDescription>
              </Alert>

              {config && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Última actualización: {formatDate(config.interestRates.lastUpdated)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cuotas y Multas */}
        <TabsContent value="fees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5" />
                Cuotas y Multas
              </CardTitle>
              <CardDescription>
                Configura los montos de cuotas obligatorias y multas por incumplimientos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="minimumMonthlySavings">
                    Cuota Mínima Mensual de Ahorro
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-muted-foreground">$</span>
                    <Input
                      id="minimumMonthlySavings"
                      type="number"
                      step="1000"
                      min="0"
                      value={minimumMonthlySavings}
                      onChange={(e) => setMinimumMonthlySavings(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">COP</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Monto mínimo que cada usuario debe ahorrar mensualmente
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="annualMaintenanceFee">
                    Cuota de Manejo Anual
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-muted-foreground">$</span>
                    <Input
                      id="annualMaintenanceFee"
                      type="number"
                      step="1000"
                      min="0"
                      value={annualMaintenanceFee}
                      onChange={(e) => setAnnualMaintenanceFee(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">COP</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cuota cobrada anualmente por mantenimiento de cuenta
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meetingAbsenceFine">
                    Multa por Inasistencia a Reuniones
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-muted-foreground">$</span>
                    <Input
                      id="meetingAbsenceFine"
                      type="number"
                      step="1000"
                      min="0"
                      value={meetingAbsenceFine}
                      onChange={(e) => setMeetingAbsenceFine(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">COP</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Multa aplicada por cada reunión a la que no asista el usuario
                  </p>
                </div>
              </div>

              {config && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Última actualización: {formatDate(config.fees.lastUpdated)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Préstamos */}
        <TabsContent value="loans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Parámetros de Préstamos
              </CardTitle>
              <CardDescription>
                Configura los límites y requisitos para solicitudes de préstamos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="minLoanAmount">Monto Mínimo de Préstamo</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-muted-foreground">$</span>
                    <Input
                      id="minLoanAmount"
                      type="number"
                      step="10000"
                      min="0"
                      value={minLoanAmount}
                      onChange={(e) => setMinLoanAmount(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">COP</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxLoanAmount">Monto Máximo de Préstamo</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-muted-foreground">$</span>
                    <Input
                      id="maxLoanAmount"
                      type="number"
                      step="10000"
                      min="0"
                      value={maxLoanAmount}
                      onChange={(e) => setMaxLoanAmount(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">COP</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minTermMonths">Plazo Mínimo (Meses)</Label>
                  <Input
                    id="minTermMonths"
                    type="number"
                    min="1"
                    max="120"
                    value={minTermMonths}
                    onChange={(e) => setMinTermMonths(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxTermMonths">Plazo Máximo (Meses)</Label>
                  <Input
                    id="maxTermMonths"
                    type="number"
                    min="1"
                    max="120"
                    value={maxTermMonths}
                    onChange={(e) => setMaxTermMonths(e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="approvalRequiredAmount">
                    Monto que Requiere Aprobación Manual
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-muted-foreground">$</span>
                    <Input
                      id="approvalRequiredAmount"
                      type="number"
                      step="10000"
                      min="0"
                      value={approvalRequiredAmount}
                      onChange={(e) => setApprovalRequiredAmount(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">COP</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Préstamos superiores a este monto requerirán aprobación de un administrador
                  </p>
                </div>
              </div>

              {config && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Última actualización: {formatDate(config.loanParameters.lastUpdated)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retiros */}
        <TabsContent value="withdrawals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className="mr-2 h-5 w-5" />
                Parámetros de Retiros
              </CardTitle>
              <CardDescription>
                Configura los requisitos y penalizaciones para retiros de ahorros
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="advanceNoticeDays">
                    Días de Anticipación Requeridos
                    <Badge variant="outline" className="ml-2">
                      <Clock className="mr-1 h-3 w-3" />
                      Días
                    </Badge>
                  </Label>
                  <Input
                    id="advanceNoticeDays"
                    type="number"
                    min="0"
                    max="365"
                    value={advanceNoticeDays}
                    onChange={(e) => setAdvanceNoticeDays(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Días que el usuario debe solicitar con anticipación un retiro
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="penaltyPercentage">
                    Penalización por Retiro Anticipado
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="penaltyPercentage"
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={penaltyPercentage}
                      onChange={(e) => setPenaltyPercentage(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-2xl font-bold text-muted-foreground">%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Porcentaje de penalización sobre ganancias si no cumple plazo
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minWithdrawalAmount">Monto Mínimo de Retiro</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-muted-foreground">$</span>
                    <Input
                      id="minWithdrawalAmount"
                      type="number"
                      step="10000"
                      min="0"
                      value={minWithdrawalAmount}
                      onChange={(e) => setMinWithdrawalAmount(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">COP</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxWithdrawalAmount">Monto Máximo de Retiro</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-muted-foreground">$</span>
                    <Input
                      id="maxWithdrawalAmount"
                      type="number"
                      step="10000"
                      min="0"
                      value={maxWithdrawalAmount}
                      onChange={(e) => setMaxWithdrawalAmount(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">COP</span>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Si un usuario retira sin cumplir los {advanceNoticeDays} días de anticipación,
                  perderá el {penaltyPercentage}% de sus ganancias generadas.
                </AlertDescription>
              </Alert>

              {config && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Última actualización: {formatDate(config.withdrawalParameters.lastUpdated)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Botones de Acción */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Los cambios afectarán todas las operaciones futuras del sistema
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={loadConfig}
                disabled={saving}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restablecer
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
