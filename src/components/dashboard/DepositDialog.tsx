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
import { useToast } from '@/hooks/use-toast';
import { createDeposit } from '@/lib/savings-service';
import { SAVINGS_CONSTANTS } from '@/types/savings';
import { Loader2, Building2 } from 'lucide-react';

// Bancos disponibles en Colombia
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
  { value: 'otro', label: 'Otro banco', icon: '🏦' },
] as const;

const depositSchema = z.object({
  amount: z.string()
    .min(1, 'El monto es obligatorio')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= SAVINGS_CONSTANTS.MIN_DEPOSIT_AMOUNT,
      `El monto mínimo de depósito es ${SAVINGS_CONSTANTS.MIN_DEPOSIT_AMOUNT.toLocaleString('es-CO')} COP`
    ),
  bank: z.string().min(1, 'Selecciona el banco o método de pago'),
  concept: z.string()
    .min(5, 'El concepto debe tener al menos 5 caracteres')
    .max(200, 'El concepto no puede exceder 200 caracteres'),
  referenceNumber: z.string().optional(),
});

type DepositFormValues = z.infer<typeof depositSchema>;

interface DepositDialogProps {
  userId: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function DepositDialog({ userId, onSuccess, trigger }: DepositDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<DepositFormValues>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      amount: '',
      bank: '',
      concept: '',
      referenceNumber: '',
    },
  });

  const selectedBank = form.watch('bank');
  const amount = form.watch('amount');

  const formatCurrency = (value: string) => {
    const numValue = Number(value);
    if (isNaN(numValue)) return '';
    return numValue.toLocaleString('es-CO');
  };

  const onSubmit = async (data: DepositFormValues) => {
    setIsSubmitting(true);
    try {
      const bankInfo = BANKS.find(b => b.value === data.bank);
      const fullConcept = `${data.concept} - Banco: ${bankInfo?.label}${
        data.referenceNumber ? ` - Ref: ${data.referenceNumber}` : ''
      }`;

      const result = await createDeposit({
        userId,
        amount: Number(data.amount),
        concept: fullConcept,
      });

      if (result.success) {
        toast({
          title: '¡Depósito exitoso!',
          description: `Se han depositado ${formatCurrency(data.amount)} COP a tu cuenta de ahorros.`,
        });
        
        form.reset();
        setOpen(false);
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al procesar depósito',
          description: result.message || 'Por favor intenta nuevamente.',
        });
      }
    } catch (error) {
      console.error('Error creating deposit:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ocurrió un error al procesar el depósito. Por favor intenta nuevamente.',
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Realizar Depósito
          </DialogTitle>
          <DialogDescription>
            Registra un depósito a tu cuenta de ahorros del Fondo. 
            Monto mínimo: {SAVINGS_CONSTANTS.MIN_DEPOSIT_AMOUNT.toLocaleString('es-CO')} COP
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto a depositar</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        placeholder="15000"
                        className="pl-8"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                        }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        COP
                      </span>
                    </div>
                  </FormControl>
                  {amount && !isNaN(Number(amount)) && (
                    <FormDescription>
                      Monto: {formatCurrency(amount)} COP
                    </FormDescription>
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
                  <FormLabel>Banco o método de pago</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    Selecciona desde qué banco realizaste la transferencia
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedBank && selectedBank !== 'efectivo' && (
              <FormField
                control={form.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de referencia (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: 123456789"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Número de transacción o referencia bancaria
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
                      placeholder="Ej: Aporte mensual correspondiente a octubre 2025"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Describe brevemente el motivo del depósito
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
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Confirmar Depósito'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
