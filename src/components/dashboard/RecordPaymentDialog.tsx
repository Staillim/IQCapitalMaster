'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { 
  DollarSign, 
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle2,
  Upload,
  CreditCard,
  Zap,
  TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getPaymentSchedule, createPayment } from '@/lib/loans-service';
import type { LoanPayment, PaymentSchedule } from '@/types/loans';
import { cn } from '@/lib/utils';

// Bancos colombianos
const COLOMBIAN_BANKS = [
  { value: 'nequi', label: '💜 Nequi', emoji: '💜' },
  { value: 'bancolombia', label: '🔴 Bancolombia', emoji: '🔴' },
  { value: 'davivienda', label: '🔵 Davivienda', emoji: '🔵' },
  { value: 'bbva', label: '💛 BBVA', emoji: '💛' },
  { value: 'banco_bogota', label: '🏦 Banco de Bogotá', emoji: '🏦' },
  { value: 'banco_popular', label: '🟠 Banco Popular', emoji: '🟠' },
  { value: 'scotiabank', label: '🔴 Scotiabank', emoji: '🔴' },
  { value: 'av_villas', label: '🟢 AV Villas', emoji: '🟢' },
  { value: 'bancoomeva', label: '🟡 Bancoomeva', emoji: '🟡' },
  { value: 'efectivo', label: '💵 Efectivo', emoji: '💵' },
  { value: 'otro', label: '➕ Otro', emoji: '➕' },
];

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loanId: string;
  paymentId?: string; // Optional: if specified, pay specific payment
  onSuccess?: () => void;
}

type PaymentType = 'single' | 'multiple' | 'extra_capital';

export default function RecordPaymentDialog({
  open,
  onOpenChange,
  loanId,
  paymentId,
  onSuccess,
}: RecordPaymentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [schedule, setSchedule] = useState<PaymentSchedule | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<LoanPayment | null>(null);

  // Form state
  const [paymentType, setPaymentType] = useState<PaymentType>('single');
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [bankReference, setBankReference] = useState<string>('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [numberOfPayments, setNumberOfPayments] = useState<number>(1);
  const [extraCapitalAmount, setExtraCapitalAmount] = useState<string>('');

  useEffect(() => {
    if (open && loanId) {
      loadSchedule();
    } else {
      // Reset form when closed
      resetForm();
    }
  }, [open, loanId]);

  useEffect(() => {
    if (schedule && paymentId) {
      const payment = schedule.payments.find(p => p.id === paymentId);
      if (payment) {
        setSelectedPayment(payment);
        setAmount(payment.amount.toString());
      }
    } else if (schedule) {
      // Auto-select next pending payment
      const nextPayment = schedule.payments.find(p => p.status === 'pending' || p.status === 'overdue');
      if (nextPayment) {
        setSelectedPayment(nextPayment);
        setAmount(nextPayment.amount.toString());
      }
    }
  }, [schedule, paymentId]);

  const loadSchedule = async () => {
    try {
      setLoadingSchedule(true);
      const data = await getPaymentSchedule(loanId);
      setSchedule(data);
    } catch (err) {
      console.error('Error loading schedule:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cargar el cronograma de pagos',
      });
    } finally {
      setLoadingSchedule(false);
    }
  };

  const resetForm = () => {
    setPaymentType('single');
    setAmount('');
    setPaymentDate(new Date());
    setPaymentMethod('');
    setBankReference('');
    setReceipt(null);
    setNotes('');
    setNumberOfPayments(1);
    setExtraCapitalAmount('');
    setSelectedPayment(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateLateFee = (): number => {
    if (!selectedPayment || selectedPayment.status !== 'overdue') return 0;
    return selectedPayment.lateFee || 0;
  };

  const calculateTotalAmount = (): number => {
    const baseAmount = parseFloat(amount) || 0;
    const lateFee = calculateLateFee();
    const extraCapital = paymentType === 'extra_capital' ? (parseFloat(extraCapitalAmount) || 0) : 0;
    return baseAmount + lateFee + extraCapital;
  };

  const getPendingPayments = (): LoanPayment[] => {
    if (!schedule) return [];
    return schedule.payments.filter(p => p.status === 'pending' || p.status === 'overdue');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'El archivo no puede superar 5MB',
        });
        return;
      }
      setReceipt(file);
    }
  };

  const handleSubmit = async () => {
    // Validations
    if (!selectedPayment && paymentType === 'single') {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Selecciona una cuota a pagar',
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ingresa un monto válido',
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Selecciona un método de pago',
      });
      return;
    }

    if (paymentMethod !== 'efectivo' && !bankReference) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ingresa la referencia bancaria',
      });
      return;
    }

    if (paymentType === 'extra_capital' && (!extraCapitalAmount || parseFloat(extraCapitalAmount) <= 0)) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ingresa el monto del abono a capital',
      });
      return;
    }

    try {
      setLoading(true);

      // Upload receipt if provided (TODO: implement file upload to Firebase Storage)
      let receiptUrl = '';
      if (receipt) {
        // For now, just store filename
        receiptUrl = receipt.name;
      }

      // Create payment record
      await createPayment({
        loanId,
        paymentNumber: selectedPayment!.paymentNumber,
        amount: calculateTotalAmount(),
        paymentMethod: COLOMBIAN_BANKS.find(b => b.value === paymentMethod)?.label || paymentMethod,
        receiptUrl: receiptUrl || undefined,
        notes: notes || undefined,
      });

      toast({
        title: '¡Pago registrado!',
        description: `Se ha registrado el pago de ${formatCurrency(calculateTotalAmount())}`,
      });

      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error('Error recording payment:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo registrar el pago. Intenta nuevamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingSchedule) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!schedule || !selectedPayment) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No hay cuotas pendientes por pagar
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  const pendingPayments = getPendingPayments();
  const lateFee = calculateLateFee();
  const totalAmount = calculateTotalAmount();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Registrar Pago
          </DialogTitle>
          <DialogDescription>
            Completa la información del pago realizado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Type Selection */}
          <div className="space-y-3">
            <Label>Tipo de Pago</Label>
            <RadioGroup value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single" className="cursor-pointer">
                  Pago de cuota única
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="multiple" id="multiple" />
                <Label htmlFor="multiple" className="cursor-pointer flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  Adelantar pagos (múltiples cuotas)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="extra_capital" id="extra_capital" />
                <Label htmlFor="extra_capital" className="cursor-pointer flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-green-600" />
                  Abono adicional al capital
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Payment Information Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cuota a Pagar</span>
                  <span className="font-semibold">#{selectedPayment.paymentNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Monto de la Cuota</span>
                  <span className="font-bold text-lg">{formatCurrency(selectedPayment.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Fecha de Vencimiento</span>
                  <span className="font-medium">
                    {format(
                      selectedPayment.dueDate instanceof Date ? selectedPayment.dueDate : (selectedPayment.dueDate as any).toDate(),
                      "d 'de' MMMM, yyyy",
                      { locale: es }
                    )}
                  </span>
                </div>
                {lateFee > 0 && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Mora acumulada:</strong> {formatCurrency(lateFee)}
                      {selectedPayment.lateDays && (
                        <span className="block mt-1 text-xs">
                          ({selectedPayment.lateDays} días de retraso)
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Multiple Payments Option */}
          {paymentType === 'multiple' && (
            <div className="space-y-2">
              <Label htmlFor="numberOfPayments">Número de Cuotas a Pagar</Label>
              <Select value={numberOfPayments.toString()} onValueChange={(v) => setNumberOfPayments(parseInt(v))}>
                <SelectTrigger id="numberOfPayments">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: Math.min(pendingPayments.length, 6) }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} cuota{n > 1 ? 's' : ''} - {formatCurrency(selectedPayment.amount * n)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Adelantar {numberOfPayments} cuota{numberOfPayments > 1 ? 's' : ''} reduce el plazo del préstamo
              </p>
            </div>
          )}

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Monto a Pagar *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
                placeholder="0"
                min={0}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Puedes pagar el monto completo o un pago parcial
            </p>
          </div>

          {/* Extra Capital Payment */}
          {paymentType === 'extra_capital' && (
            <div className="space-y-2">
              <Label htmlFor="extraCapital">Abono Adicional al Capital *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="extraCapital"
                  type="number"
                  value={extraCapitalAmount}
                  onChange={(e) => setExtraCapitalAmount(e.target.value)}
                  className="pl-7"
                  placeholder="0"
                  min={0}
                />
              </div>
              <Alert>
                <TrendingDown className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Un abono al capital reduce el saldo y los intereses futuros
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Payment Date */}
          <div className="space-y-2">
            <Label>Fecha de Pago *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !paymentDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? format(paymentDate, "d 'de' MMMM, yyyy", { locale: es }) : 'Selecciona una fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={(date) => date && setPaymentDate(date)}
                  disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Método de Pago *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Selecciona un banco o método" />
              </SelectTrigger>
              <SelectContent>
                {COLOMBIAN_BANKS.map((bank) => (
                  <SelectItem key={bank.value} value={bank.value}>
                    {bank.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bank Reference */}
          {paymentMethod && paymentMethod !== 'efectivo' && (
            <div className="space-y-2">
              <Label htmlFor="bankReference">Referencia Bancaria / Número de Transacción *</Label>
              <Input
                id="bankReference"
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
                placeholder="Ej: 123456789"
              />
            </div>
          )}

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label htmlFor="receipt">Comprobante de Pago (Opcional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="receipt"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="flex-1"
              />
              {receipt && (
                <Button variant="ghost" size="sm" onClick={() => setReceipt(null)}>
                  ✕
                </Button>
              )}
            </div>
            {receipt && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {receipt.name} ({(receipt.size / 1024).toFixed(1)} KB)
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Formatos aceptados: JPG, PNG, PDF (máx. 5MB)
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas Adicionales (Opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agrega cualquier nota o comentario sobre este pago..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {notes.length}/500 caracteres
            </p>
          </div>

          <Separator />

          {/* Payment Summary */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Resumen del Pago</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto de la Cuota</span>
                    <span className="font-medium">{formatCurrency(parseFloat(amount) || 0)}</span>
                  </div>
                  {lateFee > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Mora</span>
                      <span className="font-medium">{formatCurrency(lateFee)}</span>
                    </div>
                  )}
                  {paymentType === 'extra_capital' && parseFloat(extraCapitalAmount) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Abono a Capital</span>
                      <span className="font-medium">{formatCurrency(parseFloat(extraCapitalAmount))}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total a Pagar</span>
                    <span className="text-green-700">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Registrar Pago
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
