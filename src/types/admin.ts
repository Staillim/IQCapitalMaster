/**
 * Tipos y interfaces para el panel de administración
 */

import { Timestamp } from 'firebase/firestore';

// ==================== CONFIGURACIÓN DEL SISTEMA ====================

export interface SystemConfig {
  id: string;
  // Tasas de interés
  interestRates: {
    asociado: number; // 2% por defecto
    cliente: number; // 2.5% por defecto
    lastUpdated: Timestamp;
    updatedBy: string; // userId del admin
  };
  // Cuotas y cobros
  fees: {
    minimumMonthlySavings: number; // Cuota mínima mensual de ahorro
    annualMaintenanceFee: number; // Cuota de manejo anual
    meetingAbsenceFine: number; // Multa por inasistencia (5000 COP por defecto)
    lastUpdated: Timestamp;
    updatedBy: string;
  };
  // Parámetros de préstamos
  loanParameters: {
    minAmount: number;
    maxAmount: number;
    minTermMonths: number;
    maxTermMonths: number;
    requireCodebtor: boolean;
    approvalRequiredAmount: number; // Monto sobre el cual se requiere aprobación
    lastUpdated: Timestamp;
    updatedBy: string;
  };
  // Parámetros de retiros
  withdrawalParameters: {
    advanceNoticeDays: number; // Días de anticipación (30 por defecto)
    penaltyPercentage: number; // Penalización por retiro anticipado
    minAmount: number;
    maxAmount: number;
    lastUpdated: Timestamp;
    updatedBy: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UpdateSystemConfigData {
  interestRates?: Partial<SystemConfig['interestRates']>;
  fees?: Partial<SystemConfig['fees']>;
  loanParameters?: Partial<SystemConfig['loanParameters']>;
  withdrawalParameters?: Partial<SystemConfig['withdrawalParameters']>;
  updatedBy: string;
}

// ==================== MÉTRICAS Y ESTADÍSTICAS ====================

export interface AdminDashboardMetrics {
  // Usuarios
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  inactiveUsers: number;
  usersByRole: {
    cliente: number;
    asociado: number;
    admin: number;
  };
  newUsersThisMonth: number;

  // Finanzas
  totalSavings: number;
  totalLoans: number;
  totalDebt: number;
  totalInterestEarned: number;
  totalFeesCollected: number;
  totalFines: number;

  // Préstamos
  activeLoans: number;
  pendingLoanApprovals: number;
  overdueLoans: number;
  averageLoanAmount: number;
  loanApprovalRate: number;

  // Ahorros
  activeSavingsAccounts: number;
  pendingWithdrawals: number;
  averageSavingsBalance: number;
  monthlySavingsGrowth: number;

  // Reuniones
  upcomingMeetings: number;
  averageAttendanceRate: number;
  totalFinesThisMonth: number;

  // Período
  lastUpdated: Timestamp;
}

export interface UserMetrics {
  userId: string;
  userName: string;
  email: string;
  role: 'cliente' | 'asociado' | 'admin';
  status: 'activo' | 'inactivo' | 'pendiente';
  
  // Métricas de ahorro
  totalSavings: number;
  totalWithdrawals: number;
  currentSavingsBalance: number;
  lastSavingDate?: Timestamp;
  monthlyContributionCompliance: number; // Porcentaje de meses con cuota completa

  // Métricas de préstamos
  totalLoansTaken: number;
  currentActiveLoans: number;
  totalLoanAmount: number;
  totalPaidAmount: number;
  totalOutstandingDebt: number;
  paymentHistory: 'excellent' | 'good' | 'fair' | 'poor';
  overduePayments: number;

  // Métricas de reuniones
  totalMeetingsAttended: number;
  totalMeetingsMissed: number;
  attendanceRate: number;
  totalFinesPaid: number;
  totalFinesPending: number;

  // Actividad
  registrationDate: Timestamp;
  lastActivityDate?: Timestamp;
  accountAge: number; // en meses
}

// ==================== APROBACIONES ====================

export interface LoanApproval {
  loanId: string;
  userId: string;
  userName: string;
  userRole: 'cliente' | 'asociado';
  amount: number;
  term: number; // meses
  interestRate: number;
  monthlyPayment: number;
  purpose: string;
  codebtorId?: string;
  codebtorName?: string;
  requestDate: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  reviewNotes?: string;
  
  // Análisis de riesgo
  userCreditScore: number;
  userSavingsBalance: number;
  userActiveLoans: number;
  userPaymentHistory: string;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: 'approve' | 'reject' | 'review';
}

export interface WithdrawalApproval {
  withdrawalId: string;
  userId: string;
  userName: string;
  amount: number;
  currentBalance: number;
  requestDate: Timestamp;
  scheduledDate: Timestamp;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  reviewNotes?: string;
  penaltyApplied: boolean;
  penaltyAmount?: number;
}

export interface ApprovalAction {
  approvalId: string;
  approvalType: 'loan' | 'withdrawal';
  action: 'approve' | 'reject';
  notes?: string;
  approvedBy: string;
}

// ==================== ACTIVIDAD Y AUDITORÍA ====================

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: 'cliente' | 'asociado' | 'admin';
  action: string; // "login", "registro_ahorro", "solicitud_prestamo", etc.
  category: 'auth' | 'savings' | 'loan' | 'meeting' | 'profile' | 'admin';
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Timestamp;
}

export interface AdminAction {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetUserId?: string;
  targetUserName?: string;
  category: 'user_management' | 'config' | 'approval' | 'system';
  description: string;
  changes?: Record<string, { before: any; after: any }>;
  timestamp: Timestamp;
}

// ==================== ALERTAS Y NOTIFICACIONES ====================

export interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'critical';
  category: 'loan' | 'savings' | 'meeting' | 'system' | 'user';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  userName?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Timestamp;
  createdAt: Timestamp;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'push' | 'sms';
  category: 'loan' | 'savings' | 'meeting' | 'system';
  subject: string;
  body: string;
  variables: string[]; // Variables que se pueden usar en el template
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==================== REPORTES ====================

export interface FinancialReport {
  id: string;
  reportType: 'monthly' | 'quarterly' | 'annual' | 'custom';
  period: {
    start: Timestamp;
    end: Timestamp;
  };
  
  // Resumen financiero
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    totalAssets: number;
    totalLiabilities: number;
  };

  // Desglose de ingresos
  income: {
    interestEarned: number;
    maintenanceFees: number;
    fines: number;
    other: number;
  };

  // Desglose de egresos
  expenses: {
    loanDisbursements: number;
    withdrawals: number;
    administrative: number;
    other: number;
  };

  // Métricas de préstamos
  loans: {
    totalDisbursed: number;
    totalRepaid: number;
    activeLoans: number;
    overdueLoans: number;
    defaultRate: number;
  };

  // Métricas de ahorros
  savings: {
    totalDeposits: number;
    totalWithdrawals: number;
    netGrowth: number;
    activeAccounts: number;
  };

  generatedBy: string;
  generatedAt: Timestamp;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }[];
}

// ==================== CONFIGURACIÓN DE REUNIONES ====================

export interface MeetingConfig {
  id: string;
  defaultDuration: number; // minutos
  defaultType: 'presencial' | 'virtual';
  requiresConfirmation: boolean;
  reminderDaysBefore: number[];
  absenceFineEnabled: boolean;
  absenceFineAmount: number;
  lateArrivalMinutes: number; // Minutos de tolerancia
  lateArrivalFine: number;
  gpsValidationRadius: number; // metros para validación de ubicación
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ==================== EXPORTACIÓN DE DATOS ====================

export interface ExportRequest {
  id: string;
  requestedBy: string;
  exportType: 'users' | 'savings' | 'loans' | 'meetings' | 'transactions' | 'full';
  format: 'csv' | 'excel' | 'pdf' | 'json';
  filters?: Record<string, any>;
  dateRange?: {
    start: Timestamp;
    end: Timestamp;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  error?: string;
}

// ==================== BULK OPERATIONS ====================

export interface BulkOperation {
  id: string;
  operationType: 'update_role' | 'activate_users' | 'deactivate_users' | 'send_notification' | 'apply_fees';
  targetUserIds: string[];
  parameters: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  successCount: number;
  failureCount: number;
  errors?: { userId: string; error: string }[];
  executedBy: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}
