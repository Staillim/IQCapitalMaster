'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/provider';
import { checkLoanEligibility, createLoanApplication } from '@/lib/loans-service';
import { LoanEligibility, CreateLoanApplicationData, LOAN_CONSTANTS } from '@/types/loans';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { calculateMonthlyPayment } from '@/types/loans';
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Calendar,
  FileText,
  Users,
  TrendingUp,
  Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

interface LoanApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface PotentialCodeudor {
  userId: string;
  name: string;
  email: string;
  phone: string;
}

// Helper para formatear moneda colombiana
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function LoanApplicationDialog({
  open,
  onOpenChange,
  onSuccess,
}: LoanApplicationDialogProps) {
  const { user } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [eligibility, setEligibility] = useState<LoanEligibility | null>(null);
  const [potentialCodeudores, setPotentialCodeudores] = useState<PotentialCodeudor[]>([]);
  const [loadingCodeudores, setLoadingCodeudores] = useState(false);

  // Form state
  const [amount, setAmount] = useState<number>(LOAN_CONSTANTS.MIN_LOAN_AMOUNT);
  const [term, setTerm] = useState(12); // 12 meses por defecto
  const [purpose, setPurpose] = useState('');
  const [selectedCodeudores, setSelectedCodeudores] = useState<string[]>([]);

  // Calculated values
  const monthlyPayment = calculateMonthlyPayment(
    amount,
    LOAN_CONSTANTS.MONTHLY_INTEREST_RATE,
    term
  );
  const totalInterest = monthlyPayment * term - amount;
  const totalAmount = amount + totalInterest;

  useEffect(() => {
    if (open && user) {
      loadEligibility();
      loadPotentialCodeudores();
    } else {
      // Reset form when dialog closes
      setAmount(LOAN_CONSTANTS.MIN_LOAN_AMOUNT);
      setTerm(12);
      setPurpose('');
      setSelectedCodeudores([]);
    }
  }, [open, user]);

  const loadEligibility = async () => {
    if (!user?.uid) return;

    try {
      setCheckingEligibility(true);
      const eligibilityData = await checkLoanEligibility(user.uid);
      setEligibility(eligibilityData);

      // Adjust amount if it exceeds max loan amount
      if (eligibilityData.maxLoanAmount < amount) {
        setAmount(Math.min(eligibilityData.maxLoanAmount, LOAN_CONSTANTS.MAX_LOAN_AMOUNT));
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al verificar elegibilidad',
      });
    } finally {
      setCheckingEligibility(false);
    }
  };

  const loadPotentialCodeudores = async () => {
    if (!user?.uid) return;

    try {
      setLoadingCodeudores(true);
      const { firestore } = initializeFirebase();

      // Get all active users except the current user
      const usersRef = collection(firestore, 'users');
      const q = query(
        usersRef,
        where('status', '==', 'activo')
      );

      const snapshot = await getDocs(q);
      const codeudores: PotentialCodeudor[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        // Exclude current user
        if (doc.id !== user.uid) {
          codeudores.push({
            userId: doc.id,
            name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            email: data.email || '',
            phone: data.phone || '',
          });
        }
      });

      setPotentialCodeudores(codeudores);
    } catch (error) {
      console.error('Error loading potential co-signers:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al cargar posibles co-deudores',
      });
    } finally {
      setLoadingCodeudores(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.uid || !eligibility?.isEligible) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No eres elegible para solicitar un préstamo',
      });
      return;
    }

    // Validations
    if (amount < LOAN_CONSTANTS.MIN_LOAN_AMOUNT) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `El monto mínimo es ${formatCurrency(LOAN_CONSTANTS.MIN_LOAN_AMOUNT)}`,
      });
      return;
    }

    if (amount > eligibility.maxLoanAmount) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `El monto máximo disponible es ${formatCurrency(eligibility.maxLoanAmount)}`,
      });
      return;
    }

    if (term < LOAN_CONSTANTS.MIN_TERM_MONTHS || term > LOAN_CONSTANTS.MAX_TERM_MONTHS) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `El plazo debe estar entre ${LOAN_CONSTANTS.MIN_TERM_MONTHS} y ${LOAN_CONSTANTS.MAX_TERM_MONTHS} meses`,
      });
      return;
    }

    if (!purpose.trim() || purpose.length < 10) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Describe el propósito del préstamo (mínimo 10 caracteres)',
      });
      return;
    }

    if (selectedCodeudores.length < LOAN_CONSTANTS.REQUIRED_CODEUDORES) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Debes seleccionar al menos ${LOAN_CONSTANTS.REQUIRED_CODEUDORES} co-deudores`,
      });
      return;
    }

    try {
      setLoading(true);

      // Get co-deudores data
      const codeudores = selectedCodeudores
        .map((userId) => {
          const codeudor = potentialCodeudores.find((c) => c.userId === userId);
          return codeudor
            ? {
                userId: codeudor.userId,
                name: codeudor.name,
                email: codeudor.email,
                phone: codeudor.phone,
              }
            : null;
        })
        .filter((c) => c !== null) as CreateLoanApplicationData['codeudores'];

      const applicationData: CreateLoanApplicationData = {
        userId: user.uid,
        applicantName: user.displayName || user.email || 'Usuario',
        amount,
        term,
        purpose: purpose.trim(),
        codeudores,
      };

      await createLoanApplication(applicationData);

      toast({
        title: 'Solicitud enviada',
        description: 'Tu solicitud de préstamo está pendiente de aprobación',
      });

      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error creating loan application:', error);
      toast({
        variant: 'destructive',
        title: 'Error al enviar solicitud',
        description: error.message || 'Intenta nuevamente',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCodeudor = (userId: string) => {
    setSelectedCodeudores((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Solicitar Préstamo
          </DialogTitle>
          <DialogDescription>
            Completa la información para solicitar un préstamo
          </DialogDescription>
        </DialogHeader>

        {checkingEligibility ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !eligibility?.isEligible ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>No eres elegible para préstamos:</strong>
              <ul className="list-disc list-inside mt-2">
                {eligibility?.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Eligibility Info */}
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>Eres elegible para préstamos</span>
                  <Badge variant="outline">
                    Puntaje: {eligibility.creditScore}/100
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Monto máximo: {formatCurrency(eligibility.maxLoanAmount)}
                </p>
              </AlertDescription>
            </Alert>

            {/* Amount Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Monto del Préstamo
                </Label>
                <span className="text-lg font-bold">{formatCurrency(amount)}</span>
              </div>
              <Slider
                id="amount"
                min={LOAN_CONSTANTS.MIN_LOAN_AMOUNT}
                max={Math.min(eligibility.maxLoanAmount, LOAN_CONSTANTS.MAX_LOAN_AMOUNT)}
                step={50000}
                value={[amount]}
                onValueChange={(value) => setAmount(value[0])}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(LOAN_CONSTANTS.MIN_LOAN_AMOUNT)}</span>
                <span>
                  {formatCurrency(Math.min(eligibility.maxLoanAmount, LOAN_CONSTANTS.MAX_LOAN_AMOUNT))}
                </span>
              </div>
            </div>

            {/* Term Selector */}
            <div className="space-y-2">
              <Label htmlFor="term" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Plazo (Meses)
              </Label>
              <Select value={term.toString()} onValueChange={(val) => setTerm(parseInt(val))}>
                <SelectTrigger id="term">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(
                    { length: LOAN_CONSTANTS.MAX_TERM_MONTHS - LOAN_CONSTANTS.MIN_TERM_MONTHS + 1 },
                    (_, i) => LOAN_CONSTANTS.MIN_TERM_MONTHS + i
                  ).map((months) => (
                    <SelectItem key={months} value={months.toString()}>
                      {months} {months === 1 ? 'mes' : 'meses'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label htmlFor="purpose" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Propósito del Préstamo
              </Label>
              <Textarea
                id="purpose"
                placeholder="Describe para qué necesitas el préstamo (mínimo 10 caracteres)..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
                maxLength={500}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {purpose.length}/500 caracteres
              </p>
            </div>

            {/* Co-deudores Selection */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Co-deudores (Selecciona al menos {LOAN_CONSTANTS.REQUIRED_CODEUDORES})
              </Label>

              {loadingCodeudores ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : potentialCodeudores.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No hay usuarios disponibles para ser co-deudores
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                  {potentialCodeudores.map((codeudor) => (
                    <div
                      key={codeudor.userId}
                      className={`flex items-center justify-between p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedCodeudores.includes(codeudor.userId)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => toggleCodeudor(codeudor.userId)}
                    >
                      <div>
                        <p className="font-medium">{codeudor.name}</p>
                        <p className="text-sm text-muted-foreground">{codeudor.email}</p>
                      </div>
                      {selectedCodeudores.includes(codeudor.userId) && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Seleccionados: {selectedCodeudores.length} de {LOAN_CONSTANTS.REQUIRED_CODEUDORES}{' '}
                requeridos
              </p>
            </div>

            {/* Loan Summary */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4" />
                <h4 className="font-semibold">Resumen del Préstamo</h4>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Monto solicitado</p>
                  <p className="font-medium">{formatCurrency(amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Plazo</p>
                  <p className="font-medium">{term} meses</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tasa de interés</p>
                  <p className="font-medium">{LOAN_CONSTANTS.MONTHLY_INTEREST_RATE * 100}% mensual</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cuota mensual</p>
                  <p className="font-bold text-primary">{formatCurrency(monthlyPayment)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total intereses</p>
                  <p className="font-medium">{formatCurrency(totalInterest)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total a pagar</p>
                  <p className="font-bold">{formatCurrency(totalAmount)}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  loading ||
                  selectedCodeudores.length < LOAN_CONSTANTS.REQUIRED_CODEUDORES ||
                  !purpose.trim() ||
                  purpose.length < 10
                }
                className="flex-1"
              >
                {loading ? 'Enviando...' : 'Enviar Solicitud'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
