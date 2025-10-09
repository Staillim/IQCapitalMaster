/**
 * Servicio para funcionalidades del panel de administración
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  increment,
  QueryConstraint,
  startAfter,
  DocumentSnapshot,
  getFirestore,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const { firestore: db } = initializeFirebase();
import type {
  SystemConfig,
  UpdateSystemConfigData,
  AdminDashboardMetrics,
  UserMetrics,
  LoanApproval,
  WithdrawalApproval,
  ApprovalAction,
  ActivityLog,
  AdminAction,
  SystemAlert,
  FinancialReport,
  MeetingConfig,
  ExportRequest,
  BulkOperation,
} from '@/types/admin';

// ==================== CONFIGURACIÓN DEL SISTEMA ====================

const SYSTEM_CONFIG_DOC_ID = 'main_config';

/**
 * Obtiene la configuración actual del sistema
 */
export async function getSystemConfig(): Promise<SystemConfig | null> {
  try {
    const docRef = doc(db, 'system_config', SYSTEM_CONFIG_DOC_ID);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SystemConfig;
    }
    
    // Si no existe, crear configuración por defecto
    const defaultConfig: Omit<SystemConfig, 'id'> = {
      interestRates: {
        asociado: 2.0,
        cliente: 2.5,
        lastUpdated: Timestamp.now(),
        updatedBy: 'system',
      },
      fees: {
        minimumMonthlySavings: 50000, // 50,000 COP
        annualMaintenanceFee: 20000, // 20,000 COP
        meetingAbsenceFine: 5000, // 5,000 COP
        lastUpdated: Timestamp.now(),
        updatedBy: 'system',
      },
      loanParameters: {
        minAmount: 100000, // 100,000 COP
        maxAmount: 5000000, // 5,000,000 COP
        minTermMonths: 1,
        maxTermMonths: 24,
        requireCodebtor: true,
        approvalRequiredAmount: 1000000, // Préstamos > 1M requieren aprobación
        lastUpdated: Timestamp.now(),
        updatedBy: 'system',
      },
      withdrawalParameters: {
        advanceNoticeDays: 30,
        penaltyPercentage: 10,
        minAmount: 50000,
        maxAmount: 10000000,
        lastUpdated: Timestamp.now(),
        updatedBy: 'system',
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    await setDoc(docRef, defaultConfig);
    return { id: SYSTEM_CONFIG_DOC_ID, ...defaultConfig } as SystemConfig;
  } catch (error) {
    console.error('Error getting system config:', error);
    throw error;
  }
}

/**
 * Actualiza la configuración del sistema
 */
export async function updateSystemConfig(
  data: UpdateSystemConfigData
): Promise<void> {
  try {
    const docRef = doc(db, 'system_config', SYSTEM_CONFIG_DOC_ID);
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    if (data.interestRates) {
      updateData['interestRates'] = {
        ...data.interestRates,
        lastUpdated: Timestamp.now(),
        updatedBy: data.updatedBy,
      };
    }

    if (data.fees) {
      updateData['fees'] = {
        ...data.fees,
        lastUpdated: Timestamp.now(),
        updatedBy: data.updatedBy,
      };
    }

    if (data.loanParameters) {
      updateData['loanParameters'] = {
        ...data.loanParameters,
        lastUpdated: Timestamp.now(),
        updatedBy: data.updatedBy,
      };
    }

    if (data.withdrawalParameters) {
      updateData['withdrawalParameters'] = {
        ...data.withdrawalParameters,
        lastUpdated: Timestamp.now(),
        updatedBy: data.updatedBy,
      };
    }

    await updateDoc(docRef, updateData);

    // Registrar acción del admin
    await logAdminAction({
      adminId: data.updatedBy,
      adminName: '', // Se puede obtener del contexto
      action: 'update_system_config',
      category: 'config',
      description: 'Actualizó la configuración del sistema',
      changes: { config: { before: 'previous', after: updateData } },
    });
  } catch (error) {
    console.error('Error updating system config:', error);
    throw error;
  }
}

// ==================== MÉTRICAS Y DASHBOARD ====================

/**
 * Obtiene las métricas del dashboard de admin
 */
export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  try {
    // Obtener todos los usuarios
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    // Calcular métricas de usuarios
    const totalUsers = users.length;
    const activeUsers = users.filter((u: any) => u.status === 'activo').length;
    const pendingUsers = users.filter((u: any) => u.status === 'pendiente').length;
    const inactiveUsers = users.filter((u: any) => u.status === 'inactivo').length;

    const usersByRole = {
      cliente: users.filter((u: any) => u.role === 'cliente').length,
      asociado: users.filter((u: any) => u.role === 'asociado').length,
      admin: users.filter((u: any) => u.role === 'admin').length,
    };

    // Usuarios nuevos este mes
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    const newUsersThisMonth = users.filter((u: any) => {
      const regDate = u.registrationDate?.toDate?.() || new Date(u.registrationDate);
      return regDate >= thisMonthStart;
    }).length;

    // TODO: Calcular métricas financieras desde las colecciones reales
    // Por ahora retornamos valores por defecto
    const metrics: AdminDashboardMetrics = {
      totalUsers,
      activeUsers,
      pendingUsers,
      inactiveUsers,
      usersByRole,
      newUsersThisMonth,
      
      // Métricas financieras (placeholder - implementar con datos reales)
      totalSavings: 0,
      totalLoans: 0,
      totalDebt: 0,
      totalInterestEarned: 0,
      totalFeesCollected: 0,
      totalFines: 0,
      
      // Préstamos (placeholder)
      activeLoans: 0,
      pendingLoanApprovals: 0,
      overdueLoans: 0,
      averageLoanAmount: 0,
      loanApprovalRate: 0,
      
      // Ahorros (placeholder)
      activeSavingsAccounts: 0,
      pendingWithdrawals: 0,
      averageSavingsBalance: 0,
      monthlySavingsGrowth: 0,
      
      // Reuniones (placeholder)
      upcomingMeetings: 0,
      averageAttendanceRate: 0,
      totalFinesThisMonth: 0,
      
      lastUpdated: Timestamp.now(),
    };

    return metrics;
  } catch (error) {
    console.error('Error getting admin dashboard metrics:', error);
    throw error;
  }
}

/**
 * Obtiene métricas detalladas de un usuario específico
 */
export async function getUserMetrics(userId: string): Promise<UserMetrics | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return null;

    const userData = userDoc.data();
    
    // TODO: Calcular métricas reales desde las colecciones
    const metrics: UserMetrics = {
      userId,
      userName: userData.name || `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      role: userData.role,
      status: userData.status,
      
      // Métricas de ahorro (placeholder)
      totalSavings: 0,
      totalWithdrawals: 0,
      currentSavingsBalance: 0,
      monthlyContributionCompliance: 0,
      
      // Métricas de préstamos (placeholder)
      totalLoansTaken: 0,
      currentActiveLoans: 0,
      totalLoanAmount: 0,
      totalPaidAmount: 0,
      totalOutstandingDebt: 0,
      paymentHistory: 'excellent',
      overduePayments: 0,
      
      // Métricas de reuniones (placeholder)
      totalMeetingsAttended: 0,
      totalMeetingsMissed: 0,
      attendanceRate: 100,
      totalFinesPaid: 0,
      totalFinesPending: 0,
      
      // Actividad
      registrationDate: userData.registrationDate || Timestamp.now(),
      lastActivityDate: userData.lastActivityDate,
      accountAge: calculateAccountAge(userData.registrationDate),
    };

    return metrics;
  } catch (error) {
    console.error('Error getting user metrics:', error);
    throw error;
  }
}

function calculateAccountAge(registrationDate: any): number {
  if (!registrationDate) return 0;
  const regDate = registrationDate.toDate ? registrationDate.toDate() : new Date(registrationDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - regDate.getTime());
  const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
  return diffMonths;
}

// ==================== GESTIÓN DE USUARIOS ====================

/**
 * Activa o desactiva un usuario
 */
export async function toggleUserStatus(
  userId: string,
  newStatus: 'activo' | 'inactivo',
  adminId: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status: newStatus,
      updatedAt: Timestamp.now(),
    });

    await logAdminAction({
      adminId,
      adminName: '',
      action: newStatus === 'activo' ? 'activate_user' : 'deactivate_user',
      targetUserId: userId,
      category: 'user_management',
      description: `${newStatus === 'activo' ? 'Activó' : 'Desactivó'} el usuario`,
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    throw error;
  }
}

/**
 * Elimina un usuario (soft delete)
 */
export async function deleteUser(userId: string, adminId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status: 'eliminado',
      deletedAt: Timestamp.now(),
      deletedBy: adminId,
    });

    await logAdminAction({
      adminId,
      adminName: '',
      action: 'delete_user',
      targetUserId: userId,
      category: 'user_management',
      description: 'Eliminó el usuario',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

// ==================== APROBACIONES ====================

/**
 * Obtiene préstamos pendientes de aprobación
 */
export async function getPendingLoanApprovals(): Promise<LoanApproval[]> {
  try {
    // TODO: Implementar cuando exista la colección de préstamos
    return [];
  } catch (error) {
    console.error('Error getting pending loan approvals:', error);
    throw error;
  }
}

/**
 * Aprueba o rechaza un préstamo
 */
export async function processLoanApproval(
  approval: ApprovalAction
): Promise<void> {
  try {
    // TODO: Implementar cuando exista la colección de préstamos
    await logAdminAction({
      adminId: approval.approvedBy,
      adminName: '',
      action: approval.action === 'approve' ? 'approve_loan' : 'reject_loan',
      category: 'approval',
      description: `${approval.action === 'approve' ? 'Aprobó' : 'Rechazó'} una solicitud de préstamo`,
    });
  } catch (error) {
    console.error('Error processing loan approval:', error);
    throw error;
  }
}

// ==================== ACTIVIDAD Y AUDITORÍA ====================

/**
 * Registra una acción del administrador
 */
export async function logAdminAction(
  action: Omit<AdminAction, 'id' | 'timestamp'>
): Promise<void> {
  try {
    const actionsRef = collection(db, 'admin_actions');
    await setDoc(doc(actionsRef), {
      ...action,
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error logging admin action:', error);
    // No lanzar error para no bloquear la operación principal
  }
}

/**
 * Obtiene el historial de acciones del admin
 */
export async function getAdminActions(
  limitCount: number = 100
): Promise<AdminAction[]> {
  try {
    const actionsRef = collection(db, 'admin_actions');
    const q = query(actionsRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as AdminAction[];
  } catch (error) {
    console.error('Error getting admin actions:', error);
    throw error;
  }
}

/**
 * Obtiene el log de actividad de usuarios
 */
export async function getActivityLog(
  filters?: {
    userId?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
  },
  limitCount: number = 100
): Promise<ActivityLog[]> {
  try {
    const logsRef = collection(db, 'activity_logs');
    const constraints: QueryConstraint[] = [];

    if (filters?.userId) {
      constraints.push(where('userId', '==', filters.userId));
    }
    if (filters?.category) {
      constraints.push(where('category', '==', filters.category));
    }
    if (filters?.startDate) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
    }
    if (filters?.endDate) {
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(filters.endDate)));
    }

    constraints.push(orderBy('timestamp', 'desc'));
    constraints.push(limit(limitCount));

    const q = query(logsRef, ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ActivityLog[];
  } catch (error) {
    console.error('Error getting activity log:', error);
    throw error;
  }
}

// ==================== ALERTAS ====================

/**
 * Obtiene alertas del sistema
 * NOTA: Filtra 'resolved' en el cliente para evitar índice compuesto
 */
export async function getSystemAlerts(
  showResolved: boolean = false
): Promise<SystemAlert[]> {
  try {
    const alertsRef = collection(db, 'system_alerts');
    
    // Solo ordenar por createdAt (sin where) para evitar índice compuesto
    const q = query(
      alertsRef, 
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    
    const snapshot = await getDocs(q);
    
    // Filtrar 'resolved' en el cliente
    let alerts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as SystemAlert[];
    
    if (!showResolved) {
      alerts = alerts.filter(alert => !alert.resolved);
    }
    
    return alerts;
  } catch (error) {
    console.error('Error getting system alerts:', error);
    throw error;
  }
}

/**
 * Marca una alerta como resuelta
 */
export async function resolveAlert(
  alertId: string,
  adminId: string
): Promise<void> {
  try {
    const alertRef = doc(db, 'system_alerts', alertId);
    await updateDoc(alertRef, {
      resolved: true,
      resolvedBy: adminId,
      resolvedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    throw error;
  }
}

// ==================== OPERACIONES EN LOTE ====================

/**
 * Ejecuta una operación en lote sobre múltiples usuarios
 */
export async function executeBulkOperation(
  operation: Omit<BulkOperation, 'id' | 'status' | 'progress' | 'successCount' | 'failureCount' | 'createdAt'>
): Promise<string> {
  try {
    const operationsRef = collection(db, 'bulk_operations');
    const operationDoc = doc(operationsRef);
    
    const operationData: Omit<BulkOperation, 'id'> = {
      ...operation,
      status: 'pending',
      progress: 0,
      successCount: 0,
      failureCount: 0,
      createdAt: Timestamp.now(),
    };

    await setDoc(operationDoc, operationData);

    // TODO: Implementar procesamiento asíncrono (Cloud Functions)
    // Por ahora solo creamos el registro

    return operationDoc.id;
  } catch (error) {
    console.error('Error executing bulk operation:', error);
    throw error;
  }
}

/**
 * Obtiene el estado de una operación en lote
 */
export async function getBulkOperationStatus(
  operationId: string
): Promise<BulkOperation | null> {
  try {
    const operationDoc = await getDoc(doc(db, 'bulk_operations', operationId));
    if (!operationDoc.exists()) return null;
    
    return { id: operationDoc.id, ...operationDoc.data() } as BulkOperation;
  } catch (error) {
    console.error('Error getting bulk operation status:', error);
    throw error;
  }
}

// ==================== EXPORTACIÓN ====================

/**
 * Solicita la exportación de datos
 */
export async function requestDataExport(
  request: Omit<ExportRequest, 'id' | 'status' | 'createdAt'>
): Promise<string> {
  try {
    const exportsRef = collection(db, 'export_requests');
    const exportDoc = doc(exportsRef);
    
    const exportData: Omit<ExportRequest, 'id'> = {
      ...request,
      status: 'pending',
      createdAt: Timestamp.now(),
    };

    await setDoc(exportDoc, exportData);

    // TODO: Implementar procesamiento asíncrono (Cloud Functions)

    return exportDoc.id;
  } catch (error) {
    console.error('Error requesting data export:', error);
    throw error;
  }
}

export default {
  getSystemConfig,
  updateSystemConfig,
  getAdminDashboardMetrics,
  getUserMetrics,
  toggleUserStatus,
  deleteUser,
  getPendingLoanApprovals,
  processLoanApproval,
  logAdminAction,
  getAdminActions,
  getActivityLog,
  getSystemAlerts,
  resolveAlert,
  executeBulkOperation,
  getBulkOperationStatus,
  requestDataExport,
};
