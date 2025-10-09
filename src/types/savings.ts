/**
 * Tipos y estructuras de datos para el módulo de Ahorros
 * Fondo de Ahorros y Préstamos (FAP) - IQCapital Master
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Tipo de transacción en el módulo de ahorros
 */
export enum TransactionType {
  DEPOSIT = 'deposit',      // Depósito
  WITHDRAWAL = 'withdrawal', // Retiro
  FINE = 'fine',            // Multa por incumplimiento
  INTEREST = 'interest',    // Intereses generados
}

/**
 * Estado de una cuenta de ahorros
 */
export enum AccountStatus {
  ACTIVE = 'active',       // Cuenta activa
  INACTIVE = 'inactive',   // Cuenta inactiva
  SUSPENDED = 'suspended', // Cuenta suspendida por incumplimiento
}

/**
 * Transacción individual de ahorro
 */
export interface SavingsTransaction {
  id: string;                    // ID único de la transacción
  accountId: string;             // ID de la cuenta de ahorros
  userId: string;                // ID del usuario propietario
  type: TransactionType;         // Tipo de transacción
  amount: number;                // Monto en COP
  balance: number;               // Balance después de la transacción
  concept: string;               // Concepto/descripción de la transacción
  metadata?: {                   // Metadatos adicionales
    fee?: number;                // Comisión aplicada (2% en retiros)
    fineReason?: string;         // Razón de la multa si aplica
    approvedBy?: string;         // Usuario que aprobó (para retiros)
    receiptUrl?: string;         // URL del comprobante si existe
  };
  createdAt: Timestamp;          // Fecha de creación
  createdBy: string;             // Usuario que creó la transacción
}

/**
 * Cuenta de ahorros de un usuario
 */
export interface SavingsAccount {
  id: string;                    // ID único de la cuenta
  userId: string;                // ID del usuario propietario
  balance: number;               // Saldo actual en COP
  totalDeposits: number;         // Total acumulado de depósitos
  totalWithdrawals: number;      // Total acumulado de retiros
  status: AccountStatus;         // Estado de la cuenta
  
  // Control mensual
  monthlyContribution: number;   // Cuota mensual actual
  minMonthlyContribution: number; // Cuota mensual mínima (15,000 COP)
  lastContributionDate?: Timestamp; // Última fecha de contribución
  contributionStreak: number;    // Meses consecutivos cumpliendo cuota
  
  // Control de retiros
  withdrawalsThisMonth: number;  // Número de retiros en el mes actual
  maxWithdrawalsPerMonth: number; // Máximo de retiros permitidos (2)
  lastWithdrawalDate?: Timestamp; // Fecha del último retiro
  
  // Multas y penalizaciones
  totalFines: number;            // Total acumulado de multas
  finesPending: number;          // Multas pendientes de pago
  
  // Auditoría
  createdAt: Timestamp;          // Fecha de creación de la cuenta
  updatedAt: Timestamp;          // Última actualización
  lastTransactionId?: string;    // ID de la última transacción
}

/**
 * Resumen mensual de ahorros (para reportes)
 */
export interface MonthlySavingsSummary {
  userId: string;
  month: string;                 // Formato: "YYYY-MM"
  totalDeposits: number;
  totalWithdrawals: number;
  netSavings: number;            // Depósitos - Retiros
  finesApplied: number;
  contributionMet: boolean;      // Si cumplió la cuota mínima
  withdrawalCount: number;
  finalBalance: number;
  createdAt: Timestamp;
}

/**
 * Datos para crear una nueva transacción de depósito
 */
export interface CreateDepositData {
  userId: string;
  amount: number;
  concept: string;
  receiptUrl?: string;
}

/**
 * Datos para crear una nueva transacción de retiro
 */
export interface CreateWithdrawalData {
  userId: string;
  amount: number;
  concept: string;
  approvedBy?: string;
}

/**
 * Resultado de una operación de transacción
 */
export interface TransactionResult {
  success: boolean;
  transaction?: SavingsTransaction;
  account?: SavingsAccount;
  error?: string;
  message: string;
}

/**
 * Estadísticas de ahorro de un usuario
 */
export interface SavingsStats {
  totalBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  averageMonthlyContribution: number;
  contributionStreak: number;
  accountAge: number;            // Meses desde creación
  finesPaid: number;
  lastActivity?: Timestamp;
}

/**
 * Constantes del módulo de ahorros
 */
export const SAVINGS_CONSTANTS = {
  MIN_MONTHLY_CONTRIBUTION: 15000,  // COP
  WITHDRAWAL_FEE_PERCENT: 2,        // 2% de comisión
  MAX_WITHDRAWALS_PER_MONTH: 2,
  FINE_AMOUNT: 10000,               // COP por incumplimiento mensual
  MIN_DEPOSIT_AMOUNT: 1000,         // COP mínimo por depósito
  MIN_WITHDRAWAL_AMOUNT: 5000,      // COP mínimo por retiro
} as const;
