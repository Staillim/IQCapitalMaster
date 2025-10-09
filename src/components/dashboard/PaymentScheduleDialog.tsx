'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  CreditCard,
  Zap,
  History
} from 'lucide-react';
import { getPaymentSchedule } from '@/lib/loans-service';
import type { PaymentSchedule, LoanPayment, PaymentStatus } from '@/types/loans';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PaymentScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loanId: string;
  onPaymentClick?: (paymentId: string) => void;
  onAdvancePayment?: () => void;
  onCapitalPayment?: () => void;
}

export default function PaymentScheduleDialog({
  open,
  onOpenChange,
  loanId,
  onPaymentClick,
  onAdvancePayment,
  onCapitalPayment,
}: PaymentScheduleDialogProps) {
  const [schedule, setSchedule] = useState<PaymentSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');

  useEffect(() => {
    if (open && loanId) {
      loadSchedule();
    }
  }, [open, loanId]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPaymentSchedule(loanId);
      setSchedule(data);
    } catch (err) {
      console.error('Error loading payment schedule:', err);
      setError('Error al cargar el cronograma de pagos');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentStatusInfo = (status: PaymentStatus, dueDate: Date | any) => {
    const now = new Date();
    const dueDateObj = dueDate instanceof Date ? dueDate : dueDate.toDate();
    const isPastDue = now > dueDateObj;

    switch (status) {
      case 'paid':
        return {
          label: 'Pagada',
          color: 'bg-green-500',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50',
          icon: CheckCircle2,
        };
      case 'overdue':
        return {
          label: 'Vencida',
          color: 'bg-red-500',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50',
          icon: AlertCircle,
        };
      case 'partially_paid':
        return {
          label: 'Pago Parcial',
          color: 'bg-yellow-500',
          textColor: 'text-yellow-700',
          bgColor: 'bg-yellow-50',
          icon: Clock,
        };
      default:
        if (isPastDue) {
          return {
            label: 'Vencida',
            color: 'bg-red-500',
            textColor: 'text-red-700',
            bgColor: 'bg-red-50',
            icon: AlertCircle,
          };
        }
        return {
          label: 'Pendiente',
          color: 'bg-blue-500',
          textColor: 'text-blue-700',
          bgColor: 'bg-blue-50',
          icon: Calendar,
        };
    }
  };

  const getNextPaymentToPay = (): LoanPayment | null => {
    if (!schedule) return null;
    return schedule.payments.find(p => p.status === 'pending' || p.status === 'overdue') || null;
  };

  const getPaidPayments = (): LoanPayment[] => {
    if (!schedule) return [];
    return schedule.payments.filter(p => p.status === 'paid').sort((a, b) => {
      if (!a.paidAt || !b.paidAt) return 0;
      const aTime = a.paidAt instanceof Date ? a.paidAt.getTime() : (a.paidAt as any).toDate().getTime();
      const bTime = b.paidAt instanceof Date ? b.paidAt.getTime() : (b.paidAt as any).toDate().getTime();
      return bTime - aTime;
    });
  };

  const getPaymentProgress = () => {
    if (!schedule) return 0;
    const paid = schedule.payments.filter(p => p.status === 'paid').length;
    return (paid / schedule.payments.length) * 100;
  };

  const getPaidCount = () => {
    if (!schedule) return 0;
    return schedule.payments.filter(p => p.status === 'paid').length;
  };

  const getTotalCount = () => {
    return schedule?.payments.length || 0;
  };

  const isPaymentOnTime = (payment: LoanPayment): boolean => {
    if (!payment.paidAt) return true; // Not paid yet
    return payment.paidAt <= payment.dueDate;
  };

  const exportToPDF = () => {
    // TODO: Implement PDF export
    console.log('Exporting to PDF...');
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cronograma de Pagos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !schedule) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Cronograma de Pagos</DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'No se pudo cargar el cronograma de pagos'}
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  const nextPayment = getNextPaymentToPay();
  const paidPayments = getPaidPayments();
  const progress = getPaymentProgress();
  const paidCount = getPaidCount();
  const totalCount = getTotalCount();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Cronograma de Pagos</span>
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumen del Préstamo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Monto Total</p>
                <p className="text-xl font-bold">{formatCurrency(schedule.summary.totalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cuota Mensual</p>
                <p className="text-xl font-bold">{formatCurrency(schedule.summary.monthlyPayment)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Intereses</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(schedule.summary.totalInterest)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Plazo</p>
                <p className="text-xl font-bold">{schedule.summary.term} meses</p>
              </div>
            </div>

            {/* Progress Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-lg">
                    {paidCount} de {totalCount} cuotas pagadas
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {progress.toFixed(1)}% completado
                </span>
              </div>
              
              <Progress value={progress} className="h-3" />

              {/* Quick Actions */}
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onAdvancePayment}
                  className="flex-1"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Adelantar Pago
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onCapitalPayment}
                  className="flex-1"
                >
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Abonar al Capital
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'schedule' | 'history')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="schedule">
              <Calendar className="h-4 w-4 mr-2" />
              Cronograma
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              Historial de Pagos
            </TabsTrigger>
          </TabsList>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            {/* Next Payment to Pay */}
            {nextPayment && (
              <Card className="border-2 border-blue-500 shadow-lg">
                <CardHeader className="bg-blue-50">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    Próxima Cuota a Pagar
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Cuota #{nextPayment.paymentNumber}</p>
                        <p className="text-3xl font-bold">{formatCurrency(nextPayment.amount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Fecha de Vencimiento</p>
                        <p className="text-lg font-semibold">
                          {format(nextPayment.dueDate instanceof Date ? nextPayment.dueDate : (nextPayment.dueDate as any).toDate(), "d 'de' MMMM, yyyy", { locale: es })}
                        </p>
                      </div>
                      {nextPayment.status === 'overdue' && nextPayment.lateDays && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Vencida hace {nextPayment.lateDays} días
                            {nextPayment.lateFee && (
                              <span className="block mt-1">
                                Mora acumulada: {formatCurrency(nextPayment.lateFee)}
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-sm text-muted-foreground">Capital</span>
                        <span className="font-semibold">{formatCurrency(nextPayment.principal)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-sm text-muted-foreground">Interés</span>
                        <span className="font-semibold text-orange-600">{formatCurrency(nextPayment.interest)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-sm text-muted-foreground">Saldo Restante</span>
                        <span className="font-semibold">{formatCurrency(nextPayment.balance)}</span>
                      </div>
                      {nextPayment.lateFee && nextPayment.lateFee > 0 && (
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-sm text-red-600">Mora</span>
                          <span className="font-semibold text-red-600">{formatCurrency(nextPayment.lateFee)}</span>
                        </div>
                      )}
                      
                      <Button 
                        className="w-full mt-4" 
                        size="lg"
                        onClick={() => onPaymentClick?.(nextPayment.id)}
                      >
                        <DollarSign className="h-5 w-5 mr-2" />
                        Pagar Ahora
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Payments Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Todas las Cuotas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {schedule.payments.map((payment) => {
                    const dueDateObj = payment.dueDate instanceof Date ? payment.dueDate : (payment.dueDate as any).toDate();
                    const statusInfo = getPaymentStatusInfo(payment.status, dueDateObj);
                    const Icon = statusInfo.icon;
                    const isPaid = payment.status === 'paid';

                    return (
                      <div
                        key={payment.id}
                        className={`p-4 rounded-lg border ${isPaid ? statusInfo.bgColor : 'bg-white'} ${
                          payment.id === nextPayment?.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${statusInfo.bgColor}`}>
                              <Icon className={`h-5 w-5 ${statusInfo.textColor}`} />
                            </div>
                            <div>
                              <p className="font-semibold">Cuota #{payment.paymentNumber}</p>
                              <p className="text-sm text-muted-foreground">
                                Vence: {format(dueDateObj, "d 'de' MMM, yyyy", { locale: es })}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="font-bold text-lg">{formatCurrency(payment.amount)}</p>
                            <Badge variant="outline" className={statusInfo.textColor}>
                              {statusInfo.label}
                            </Badge>
                          </div>
                        </div>

                        {/* Expandable Details */}
                        <div className="mt-3 pt-3 border-t grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Capital</p>
                            <p className="font-semibold">{formatCurrency(payment.principal)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Interés</p>
                            <p className="font-semibold">{formatCurrency(payment.interest)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Saldo</p>
                            <p className="font-semibold">{formatCurrency(payment.balance)}</p>
                          </div>
                          {isPaid && payment.paidAt && (
                            <div>
                              <p className="text-muted-foreground">Pagado</p>
                              <p className="font-semibold">
                                {format(payment.paidAt instanceof Date ? payment.paidAt : (payment.paidAt as any).toDate(), "d/MM/yyyy", { locale: es })}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Historial de Pagos Realizados</CardTitle>
              </CardHeader>
              <CardContent>
                {paidPayments.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Aún no hay pagos realizados</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paidPayments.map((payment) => {
                      const onTime = isPaymentOnTime(payment);
                      const paidDueDateObj = payment.dueDate instanceof Date ? payment.dueDate : (payment.dueDate as any).toDate();
                      const paidAtObj = payment.paidAt ? (payment.paidAt instanceof Date ? payment.paidAt : (payment.paidAt as any).toDate()) : null;
                      
                      return (
                        <div
                          key={payment.id}
                          className="p-4 rounded-lg border bg-green-50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="p-2 rounded-full bg-green-100">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold">Cuota #{payment.paymentNumber}</p>
                                  {onTime ? (
                                    <Badge variant="outline" className="text-green-700 border-green-300">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      A tiempo
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-orange-700 border-orange-300">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Con retraso
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Vencía: {format(paidDueDateObj, "d 'de' MMMM, yyyy", { locale: es })}
                                </p>
                                {paidAtObj && (
                                  <p className="text-sm text-green-700 font-medium mt-1">
                                    Pagado: {format(paidAtObj, "d 'de' MMMM, yyyy", { locale: es })}
                                  </p>
                                )}
                                {!onTime && payment.lateDays && (
                                  <p className="text-sm text-orange-600 mt-1">
                                    Retraso de {payment.lateDays} días
                                    {payment.lateFee && ` - Mora: ${formatCurrency(payment.lateFee)}`}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="font-bold text-lg">{formatCurrency(payment.amount)}</p>
                              {payment.paymentMethod && (
                                <p className="text-sm text-muted-foreground">{payment.paymentMethod}</p>
                              )}
                            </div>
                          </div>

                          <Separator className="my-3" />

                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Capital</p>
                              <p className="font-semibold flex items-center gap-1">
                                <TrendingDown className="h-3 w-3 text-blue-600" />
                                {formatCurrency(payment.principal)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Interés</p>
                              <p className="font-semibold flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-orange-600" />
                                {formatCurrency(payment.interest)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Saldo Después</p>
                              <p className="font-semibold">{formatCurrency(payment.balance)}</p>
                            </div>
                          </div>

                          {payment.notes && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-sm text-muted-foreground">Nota: {payment.notes}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
