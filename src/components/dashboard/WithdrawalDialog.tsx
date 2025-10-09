'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { createWithdrawal } from '@/lib/savings-service';
import { SAVINGS_CONSTANTS, SavingsAccount } from '@/types/savings';
import { Loader2, AlertTriangle, TrendingDown, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

// Bancos disponibles en Colombia para retiros
const BANKS = [
  { value: 'nequi', label: 'Nequi', icon: '💜' },
  { value: 'bancolombia', label: 'Bancolombia', icon: '🔴' },
  { value: 'davivienda', label: 'Davivienda', icon: '🔴' },
  { value: 'bbva', label: 'BBVA', icon: '🔵' },
  { value: 'banco_bogota', label: 'Banco de Bogotá', icon: '🔵' },
  { value: 'banco_popular', label: 'Banco Popular', icon: '🟠' },
  { value: 'scotiabank', label: 'Scotiabank Colpatria', icon: '🔴' },
  { value: 'av_villas', label: 'Banco AV Villas', icon: '🟢' },
  { value: 'bancoomeva', label: 'Bancoomeva', icon: '🟢' },
  { value: 'efectivo', label: 'Efectivo', icon: '💵' },
] as const;

const withdrawalSchema = z.object({
  amount: z.string()
    .min(1, 'El monto es obligatorio')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= SAVINGS_CONSTANTS.MIN_WITHDRAWAL_AMOUNT,
      `El monto mínimo de retiro es ${SAVINGS_CONSTANTS.MIN_WITHDRAWAL_AMOUNT.toLocaleString('es-CO')} COP`
    ),
  bank: z.string().min(1, 'Selecciona el banco de destino'),
  accountNumber: z.string()
    .min(4, 'El número de cuenta debe tener al menos 4 dígitos')
    .max(20, 'El número de cuenta no puede exceder 20 dígitos'),
  concept: z.string()
    .min(5, 'El concepto debe tener al menos 5 caracteres')
    .max(200, 'El concepto no puede exceder 200 caracteres'),
});

type WithdrawalFormValues = z.infer<typeof withdrawalSchema>;

interface WithdrawalDialogProps {
  userId: string;
  account: SavingsAccount;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function WithdrawalDialog({ userId, account, onSuccess, trigger }: WithdrawalDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount: '',
      bank: '',
      accountNumber: '',
      concept: '',
    },
  });

  const amount = form.watch('amount');
  const selectedBank = form.watch('bank');

  const formatCurrency = (value: number) => {
    return value.toLocaleString('es-CO');
  };

  const calculateFee = (amount: number) => {
    return amount * (SAVINGS_CONSTANTS.WITHDRAWAL_FEE_PERCENT / 100);
  };

  const numAmount = Number(amount) || 0;
  const fee = calculateFee(numAmount);
  const totalToDeduct = numAmount + fee;
  const canWithdraw = totalToDeduct <= account.balance;
  const hasWithdrawalsAvailable = account.withdrawalsThisMonth < account.maxWithdrawalsPerMonth;

  const onSubmit = async (data: WithdrawalFormValues) => {
    if (!canWithdraw) {
      toast({
        variant: 'destructive',
        title: 'Saldo insuficiente',
        description: 'No tienes saldo suficiente para cubrir el retiro y la comisión.',
      });
      return;
    }

    if (!hasWithdrawalsAvailable) {
      toast({
        variant: 'destructive',
        title: 'Límite de retiros alcanzado',
        description: `Has alcanzado el límite de ${SAVINGS_CONSTANTS.MAX_WITHDRAWALS_PER_MONTH} retiros mensuales.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const bankInfo = BANKS.find(b => b.value === data.bank);
      const fullConcept = `${data.concept} - Destino: ${bankInfo?.label} ${data.accountNumber}`;

      const result = await createWithdrawal({
        userId,
        amount: Number(data.amount),
        concept: fullConcept,
        approvedBy: userId,
      });

      if (result.success) {
        toast({
          title: '¡Retiro exitoso!',
          description: `Se han retirado ${formatCurrency(Number(data.amount))} COP (+ ${formatCurrency(fee)} COP de comisión).`,
        });
        
        form.reset();
        setOpen(false);
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al procesar retiro',
          description: result.message || 'Por favor intenta nuevamente.',
        });
      }
    } catch (error) {
      console.error('Error creating withdrawal:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ocurrió un error al procesar el retiro. Por favor intenta nuevamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Solicitar Retiro
          </DialogTitle>
          <DialogDescription>
            Solicita un retiro de tu cuenta de ahorros. Se aplicará una comisión del {SAVINGS_CONSTANTS.WITHDRAWAL_FEE_PERCENT}%.
          </DialogDescription>
        </DialogHeader>

        {/* Información de la cuenta */}
        <Card className="p-4 bg-muted/50">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saldo disponible:</span>
              <span className="font-semibold">{formatCurrency(account.balance)} COP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Retiros este mes:</span>
              <span className="font-semibold">
                {account.withdrawalsThisMonth} / {account.maxWithdrawalsPerMonth}
              </span>
            </div>
          </div>
        </Card>

        {/* Alertas */}
        {!hasWithdrawalsAvailable && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Has alcanzado el límite de {SAVINGS_CONSTANTS.MAX_WITHDRAWALS_PER_MONTH} retiros mensuales.
              Podrás realizar más retiros el próximo mes.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto a retirar</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        placeholder="50000"
                        className="pl-8"
                        {...field}
                        disabled={!hasWithdrawalsAvailable}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        COP
                      </span>
                    </div>
                  </FormControl>
                  {numAmount > 0 && (
                    <div className="space-y-1 text-sm">
                      <FormDescription>
                        Monto a retirar: {formatCurrency(numAmount)} COP
                      </FormDescription>
                      <FormDescription className="text-orange-600">
                        Comisión ({SAVINGS_CONSTANTS.WITHDRAWAL_FEE_PERCENT}%): {formatCurrency(fee)} COP
                      </FormDescription>
                      <FormDescription className="font-semibold">
                        Total a descontar: {formatCurrency(totalToDeduct)} COP
                      </FormDescription>
                      {!canWithdraw && (
                        <p className="text-destructive text-xs">
                          ⚠️ Saldo insuficiente para cubrir el retiro y la comisión
                        </p>
                      )}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banco de destino</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={!hasWithdrawalsAvailable}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el banco" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BANKS.map((bank) => (
                        <SelectItem key={bank.value} value={bank.value}>
                          <div className="flex items-center gap-2">
                            <span>{bank.icon}</span>
                            <span>{bank.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Selecciona el banco donde recibirás el dinero
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedBank && selectedBank !== 'efectivo' && (
              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de cuenta</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: 1234567890"
                        {...field}
                        disabled={!hasWithdrawalsAvailable}
                      />
                    </FormControl>
                    <FormDescription>
                      Número de cuenta bancaria o Nequi donde recibirás el dinero
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="concept"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concepto</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Retiro para gastos personales"
                      className="resize-none"
                      rows={3}
                      {...field}
                      disabled={!hasWithdrawalsAvailable}
                    />
                  </FormControl>
                  <FormDescription>
                    Describe el motivo del retiro
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !canWithdraw || !hasWithdrawalsAvailable}
                variant="destructive"
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Confirmar Retiro'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
