/**
 * @fileoverview Servicio de Sincronización de Datos de Usuario
 * 
 * Este servicio mantiene sincronizados los campos de resumen financiero
 * en el documento del usuario (/users/{userId}) con los datos reales
 * de las colecciones de ahorros y préstamos.
 */

import { 
  doc, 
  updateDoc, 
  serverTimestamp,
  getDoc,
  Timestamp 
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { getSavingsAccount } from './savings-service';
import { getLoanStats } from './loans-service';

// Inicializar Firebase
const { firestore: db } = initializeFirebase();

export interface UserFinancialSummary {
  savingsBalance?: number;
  totalLoans?: number;
  activeLoans?: number;
  currentDebt?: number;
  totalPaid?: number;
  creditScore?: number;
  lastTransactionDate?: Timestamp;
}

/**
 * Sincroniza los campos de resumen financiero del usuario
 * 
 * Este método obtiene los datos actualizados de ahorros y préstamos
 * y actualiza el documento del usuario con esta información.
 * 
 * @param userId - ID del usuario a sincronizar
 * @returns Promise con los datos sincronizados
 * 
 * @example
 * ```typescript
 * // Después de crear una transacción
 * await createDeposit(userId, amount);
 * await syncUserFinancialSummary(userId); // Actualizar resumen
 * ```
 */
export async function syncUserFinancialSummary(
  userId: string
): Promise<UserFinancialSummary> {
  try {
    // 1. Obtener balance de ahorros
    const savingsAccount = await getSavingsAccount(userId);
    const savingsBalance = savingsAccount?.balance || 0;
    
    // 2. Obtener estadísticas de préstamos
    const loanStats = await getLoanStats(userId);
    
    // 3. Preparar datos de resumen
    const summary: Record<string, any> = {
      savingsBalance,
      totalLoans: loanStats?.totalLoans || 0,
      activeLoans: loanStats?.activeLoans || 0,
      currentDebt: loanStats?.currentDebt || 0,
      totalPaid: loanStats?.totalPaid || 0,
      creditScore: loanStats?.creditScore || 0,
      lastTransactionDate: serverTimestamp()
    };
    
    // 4. Actualizar documento del usuario
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, summary);
    
    console.log(`✓ Usuario ${userId} sincronizado:`, summary);
    return summary as UserFinancialSummary;
  } catch (error) {
    console.error(`Error sincronizando usuario ${userId}:`, error);
    throw error;
  }
}

/**
 * Actualiza solo el balance de ahorros en el perfil del usuario
 * 
 * Método rápido para actualizar únicamente el balance sin recalcular
 * todas las estadísticas de préstamos.
 * 
 * @param userId - ID del usuario
 * @param newBalance - Nuevo balance de ahorros
 */
export async function updateUserSavingsBalance(
  userId: string,
  newBalance: number
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      savingsBalance: newBalance,
      lastTransactionDate: serverTimestamp()
    });
    
    console.log(`✓ Balance actualizado para ${userId}: ${newBalance}`);
  } catch (error) {
    console.error(`Error actualizando balance de ${userId}:`, error);
    throw error;
  }
}

/**
 * Actualiza solo las estadísticas de préstamos en el perfil del usuario
 * 
 * @param userId - ID del usuario
 */
export async function updateUserLoanStats(userId: string): Promise<void> {
  try {
    const loanStats = await getLoanStats(userId);
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      totalLoans: loanStats?.totalLoans || 0,
      activeLoans: loanStats?.activeLoans || 0,
      currentDebt: loanStats?.currentDebt || 0,
      totalPaid: loanStats?.totalPaid || 0,
      creditScore: loanStats?.creditScore || 0
    });
    
    console.log(`✓ Estadísticas de préstamos actualizadas para ${userId}`);
  } catch (error) {
    console.error(`Error actualizando préstamos de ${userId}:`, error);
    throw error;
  }
}

/**
 * Obtiene el resumen financiero del usuario desde su perfil
 * 
 * Este método es más rápido que calcular todo desde cero porque
 * lee directamente los campos de resumen del documento del usuario.
 * 
 * @param userId - ID del usuario
 * @returns Resumen financiero o null si no existe
 */
export async function getUserFinancialSummary(
  userId: string
): Promise<UserFinancialSummary | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return null;
    }
    
    const userData = userDoc.data();
    
    return {
      savingsBalance: userData.savingsBalance || 0,
      totalLoans: userData.totalLoans || 0,
      activeLoans: userData.activeLoans || 0,
      currentDebt: userData.currentDebt || 0,
      totalPaid: userData.totalPaid || 0,
      creditScore: userData.creditScore || 0,
      lastTransactionDate: userData.lastTransactionDate
    };
  } catch (error) {
    console.error(`Error obteniendo resumen de ${userId}:`, error);
    return null;
  }
}

/**
 * Verifica si el usuario tiene campos de resumen financiero
 * 
 * @param userId - ID del usuario
 * @returns true si tiene campos de resumen, false si necesita sincronización
 */
export async function hasFinancialSummary(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return false;
    }
    
    const userData = userDoc.data();
    
    // Verificar si tiene al menos el campo savingsBalance
    return userData.savingsBalance !== undefined;
  } catch (error) {
    console.error(`Error verificando resumen de ${userId}:`, error);
    return false;
  }
}

/**
 * Inicializa los campos de resumen financiero para un usuario nuevo
 * 
 * @param userId - ID del usuario
 */
export async function initializeUserFinancialSummary(
  userId: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      savingsBalance: 0,
      totalLoans: 0,
      activeLoans: 0,
      currentDebt: 0,
      totalPaid: 0,
      creditScore: 0,
      lastTransactionDate: serverTimestamp()
    });
    
    console.log(`✓ Resumen financiero inicializado para ${userId}`);
  } catch (error) {
    console.error(`Error inicializando resumen de ${userId}:`, error);
    throw error;
  }
}

/**
 * Migra todos los usuarios para agregar campos de resumen financiero
 * 
 * ADVERTENCIA: Este método es costoso y debe ejecutarse solo una vez
 * o en un script de migración separado.
 * 
 * @param userIds - Array de IDs de usuarios a migrar
 */
export async function migrateUsersFinancialSummary(
  userIds: string[]
): Promise<void> {
  console.log(`Iniciando migración de ${userIds.length} usuarios...`);
  
  let success = 0;
  let failed = 0;
  
  for (const userId of userIds) {
    try {
      await syncUserFinancialSummary(userId);
      success++;
      console.log(`[${success + failed}/${userIds.length}] ✓ ${userId}`);
    } catch (error) {
      failed++;
      console.error(`[${success + failed}/${userIds.length}] ✗ ${userId}:`, error);
    }
    
    // Pausa para evitar sobrecarga de Firestore
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\nMigración completada: ${success} exitosos, ${failed} fallidos`);
}
