/**
 * Tipos y estructuras de datos para el módulo de Préstamos
 * Fondo de Ahorros y Préstamos (FAP) - IQCapital Master
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Estado de una solicitud de préstamo
 */
export enum LoanStatus {
  PENDING = 'pending',           // Pendiente de aprobación
  APPROVED = 'approved',         // Aprobado pero no desembolsado
  ACTIVE = 'active',             // Activo (en pago)
  PAID = 'paid',                 // Completamente pagado
  OVERDUE = 'overdue',           // Con pagos atrasados
  DEFAULTED = 'defaulted',       // En mora (más de 2 cuotas atrasadas)
  REJECTED = 'rejected',         // Rechazado
  CANCELLED = 'cancelled',       // Cancelado por el usuario
}

/**
 * Estado de un pago/cuota
 */
export enum PaymentStatus {
  PENDING = 'pending',           // Pendiente de pago
  PAID = 'paid',                 // Pagado
  OVERDUE = 'overdue',           // Atrasado
  PARTIALLY_PAID = 'partially_paid', // Parcialmente pagado
}

/**
 * Co-deudor del préstamo
 */
export interface Codeudor {
  userId: string;                // ID del usuario co-deudor
  name: string;                  // Nombre completo
  email: string;                 // Email
  phone: string;                 // Teléfono
  acceptedAt?: Timestamp;        // Fecha de aceptación
  status: 'pending' | 'accepted' | 'rejected'; // Estado de la solicitud
}

/**
 * Cuota/Pago de un préstamo
 */
export interface LoanPayment {
  id: string;                    // ID único del pago
  loanId: string;                // ID del préstamo
  paymentNumber: number;         // Número de cuota (1, 2, 3...)
  dueDate: Timestamp;            // Fecha de vencimiento
  amount: number;                // Monto de la cuota
  principal: number;             // Capital amortizado
  interest: number;              // Interés de la cuota
  balance: number;               // Saldo restante después del pago
  status: PaymentStatus;         // Estado del pago
  paidAt?: Timestamp;            // Fecha de pago efectivo
  paidAmount?: number;           // Monto pagado (puede ser parcial)
  lateDays?: number;             // Días de atraso
  lateFee?: number;              // Multa por atraso
  paymentMethod?: string;        // Método de pago
  receiptUrl?: string;           // URL del comprobante
  notes?: string;                // Notas adicionales
  createdAt: Timestamp;          // Fecha de creación del registro
}

/**
 * Solicitud de préstamo
 */
export interface LoanApplication {
  id: string;                    // ID único de la solicitud
  userId: string;                // ID del solicitante
  applicantName: string;         // Nombre del solicitante
  
  // Detalles del préstamo
  amount: number;                // Monto solicitado
  term: number;                  // Plazo en meses
  purpose: string;               // Motivo/propósito del préstamo
  monthlyPayment: number;        // Cuota mensual calculada
  totalInterest: number;         // Total de intereses a pagar
  totalAmount: number;           // Total a pagar (capital + intereses)
  
  // Co-deudores
  codeudores: Codeudor[];        // Mínimo 2 co-deudores
  
  // Estado y aprobación
  status: LoanStatus;            // Estado de la solicitud
  approvedBy?: string;           // Usuario que aprobó
  approvedAt?: Timestamp;        // Fecha de aprobación
  rejectionReason?: string;      // Razón de rechazo si aplica
  
  // Desembolso
  disbursedAt?: Timestamp;       // Fecha de desembolso
  disbursementMethod?: string;   // Método de desembolso
  bankAccount?: string;          // Cuenta bancaria de desembolso
  
  // Seguimiento de pagos
  paidPayments: number;          // Número de cuotas pagadas
  totalPayments: number;         // Total de cuotas
  remainingBalance: number;      // Saldo pendiente
  lastPaymentDate?: Timestamp;   // Fecha del último pago
  nextPaymentDate?: Timestamp;   // Fecha del próximo pago
  
  // Atrasos
  overduePayments: number;       // Número de cuotas atrasadas
  overdueDays: number;           // Total de días de atraso
  totalLateFees: number;         // Total de multas acumuladas
  
  // Auditoría
  createdAt: Timestamp;          // Fecha de creación
  updatedAt: Timestamp;          // Última actualización
  notes?: string;                // Notas adicionales
}

/**
 * Plan de pagos (Tabla de amortización)
 */
export interface PaymentSchedule {
  loanId: string;
  payments: LoanPayment[];
  summary: {
    totalAmount: number;         // Total a pagar
    totalPrincipal: number;      // Total de capital
    totalInterest: number;       // Total de intereses
    monthlyPayment: number;      // Cuota mensual
    term: number;                // Plazo en meses
  };
}

/**
 * Datos para crear una solicitud de préstamo
 */
export interface CreateLoanApplicationData {
  userId: string;
  applicantName: string;
  amount: number;
  term: number;
  purpose: string;
  codeudores: Array<{
    userId: string;
    name: string;
    email: string;
    phone: string;
  }>;
}

/**
 * Datos para aprobar un préstamo
 */
export interface ApproveLoanData {
  loanId: string;
  approvedBy: string;
  disbursementMethod: string;
  bankAccount?: string;
  notes?: string;
}

/**
 * Datos para registrar un pago
 */
export interface CreatePaymentData {
  loanId: string;
  paymentNumber: number;
  amount: number;
  paymentMethod: string;
  receiptUrl?: string;
  notes?: string;
}

/**
 * Resultado de una operación de préstamo
 */
export interface LoanOperationResult {
  success: boolean;
  loan?: LoanApplication;
  payment?: LoanPayment;
  schedule?: PaymentSchedule;
  error?: string;
  message: string;
}

/**
 * Estadísticas de préstamos de un usuario
 */
export interface LoanStats {
  totalLoans: number;            // Total de préstamos solicitados
  activeLoans: number;           // Préstamos activos
  totalBorrowed: number;         // Total prestado acumulado
  totalPaid: number;             // Total pagado
  totalInterestPaid: number;     // Total de intereses pagados
  currentDebt: number;           // Deuda actual total
  overdueAmount: number;         // Monto en mora
  paymentsMade: number;          // Pagos realizados
  paymentsOnTime: number;        // Pagos puntuales
  averageLateDays: number;       // Promedio de días de atraso
  creditScore: number;           // Puntaje crediticio (0-100)
}

/**
 * Criterios de elegibilidad para préstamo
 */
export interface LoanEligibility {
  isEligible: boolean;
  reasons: string[];             // Razones de elegibilidad/no elegibilidad
  maxLoanAmount: number;         // Monto máximo que puede solicitar
  requiredSavings: number;       // Ahorro mínimo requerido
  hasActiveLoan: boolean;        // Si tiene préstamo activo
  hasOverduePayments: boolean;   // Si tiene pagos atrasados
  creditScore: number;           // Puntaje crediticio
}

/**
 * Constantes del módulo de préstamos
 */
export const LOAN_CONSTANTS = {
  // Tasas de interés
  MONTHLY_INTEREST_RATE: 2,      // 2% mensual
  ANNUAL_INTEREST_RATE: 24,      // 24% anual (2% * 12)
  
  // Límites de préstamo
  MIN_LOAN_AMOUNT: 100000,       // COP mínimo
  MAX_LOAN_AMOUNT: 5000000,      // COP máximo
  
  // Plazos
  MIN_TERM_MONTHS: 3,            // Mínimo 3 meses
  MAX_TERM_MONTHS: 24,           // Máximo 24 meses
  
  // Co-deudores
  REQUIRED_CODEUDORES: 2,        // Mínimo 2 co-deudores
  MAX_CODEUDORES: 3,             // Máximo 3 co-deudores
  
  // Elegibilidad
  MIN_SAVINGS_REQUIRED: 50000,   // COP mínimo en ahorros
  MIN_MEMBERSHIP_MONTHS: 3,      // Meses mínimos de membresía
  MAX_ACTIVE_LOANS: 1,           // Máximo de préstamos activos simultáneos
  
  // Multas y penalizaciones
  LATE_FEE_PER_DAY: 1000,        // COP por día de atraso
  MAX_LATE_DAYS: 60,             // Días máximos antes de default
  DEFAULT_PENALTY_PERCENT: 10,   // 10% de penalización por default
  
  // Requisitos de pago
  MIN_PAYMENT_PERCENT: 50,       // Mínimo 50% del pago si es parcial
} as const;

/**
 * Helper para calcular cuota mensual con interés compuesto
 * Fórmula: M = P * [i(1 + i)^n] / [(1 + i)^n - 1]
 * Donde:
 * M = Cuota mensual
 * P = Capital (monto del préstamo)
 * i = Tasa de interés mensual (decimal)
 * n = Número de pagos (meses)
 */
export function calculateMonthlyPayment(
  principal: number,
  monthlyRate: number,
  termMonths: number
): number {
  const rate = monthlyRate / 100;
  const payment =
    principal * (rate * Math.pow(1 + rate, termMonths)) / (Math.pow(1 + rate, termMonths) - 1);
  return Math.round(payment);
}

/**
 * Helper para generar plan de pagos
 */
export function generatePaymentSchedule(
  principal: number,
  monthlyRate: number,
  termMonths: number,
  startDate: Date = new Date()
): Array<{
  paymentNumber: number;
  dueDate: Date;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}> {
  const monthlyPayment = calculateMonthlyPayment(principal, monthlyRate, termMonths);
  const rate = monthlyRate / 100;
  let balance = principal;
  const schedule = [];

  for (let i = 1; i <= termMonths; i++) {
    const interest = Math.round(balance * rate);
    const principalPayment = monthlyPayment - interest;
    balance = Math.max(0, balance - principalPayment);

    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      paymentNumber: i,
      dueDate,
      payment: monthlyPayment,
      principal: principalPayment,
      interest,
      balance,
    });
  }

  return schedule;
}

/**
 * Helper para calcular puntaje crediticio
 */
export function calculateCreditScore(stats: {
  totalLoans: number;
  paymentsOnTime: number;
  paymentsMade: number;
  overdueAmount: number;
  averageLateDays: number;
}): number {
  let score = 100;

  // Penalizar por pagos atrasados
  if (stats.paymentsMade > 0) {
    const onTimePercent = (stats.paymentsOnTime / stats.paymentsMade) * 100;
    if (onTimePercent < 80) score -= 20;
    else if (onTimePercent < 90) score -= 10;
    else if (onTimePercent < 95) score -= 5;
  }

  // Penalizar por mora actual
  if (stats.overdueAmount > 0) {
    score -= 30;
  }

  // Penalizar por días promedio de atraso
  if (stats.averageLateDays > 10) score -= 20;
  else if (stats.averageLateDays > 5) score -= 10;
  else if (stats.averageLateDays > 0) score -= 5;

  return Math.max(0, Math.min(100, score));
}
