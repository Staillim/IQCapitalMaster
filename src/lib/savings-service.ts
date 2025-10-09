/**
 * Servicios de Firestore para el módulo de Ahorros
 * Maneja todas las operaciones CRUD y lógica de negocio
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  runTransaction,
  increment,
  Firestore,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import {
  SavingsAccount,
  SavingsTransaction,
  TransactionType,
  AccountStatus,
  CreateDepositData,
  CreateWithdrawalData,
  TransactionResult,
  SAVINGS_CONSTANTS,
  MonthlySavingsSummary,
} from '@/types/savings';

// Inicializar Firebase y obtener Firestore
const { firestore: db } = initializeFirebase();

// Referencias a colecciones
const SAVINGS_ACCOUNTS_COLLECTION = 'savingsAccounts';
const SAVINGS_TRANSACTIONS_COLLECTION = 'savingsTransactions';
const MONTHLY_SUMMARIES_COLLECTION = 'monthlySavingsSummaries';

/**
 * Obtiene o crea una cuenta de ahorros para un usuario
 */
export async function getOrCreateSavingsAccount(userId: string): Promise<SavingsAccount> {
  const accountRef = doc(db, SAVINGS_ACCOUNTS_COLLECTION, userId);
  const accountSnap = await getDoc(accountRef);

  if (accountSnap.exists()) {
    return { id: accountSnap.id, ...accountSnap.data() } as SavingsAccount;
  }

  // Crear nueva cuenta de ahorros
  const newAccount: Omit<SavingsAccount, 'id'> = {
    userId,
    balance: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    status: AccountStatus.ACTIVE,
    monthlyContribution: 0,
    minMonthlyContribution: SAVINGS_CONSTANTS.MIN_MONTHLY_CONTRIBUTION,
    contributionStreak: 0,
    withdrawalsThisMonth: 0,
    maxWithdrawalsPerMonth: SAVINGS_CONSTANTS.MAX_WITHDRAWALS_PER_MONTH,
    totalFines: 0,
    finesPending: 0,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  await setDoc(accountRef, newAccount);
  return { id: userId, ...newAccount } as SavingsAccount;
}

/**
 * Obtiene una cuenta de ahorros por ID de usuario
 */
export async function getSavingsAccount(userId: string): Promise<SavingsAccount | null> {
  const accountRef = doc(db, SAVINGS_ACCOUNTS_COLLECTION, userId);
  const accountSnap = await getDoc(accountRef);

  if (!accountSnap.exists()) {
    return null;
  }

  return { id: accountSnap.id, ...accountSnap.data() } as SavingsAccount;
}

/**
 * Crea una transacción de depósito
 */
export async function createDeposit(data: CreateDepositData): Promise<TransactionResult> {
  const { userId, amount, concept, receiptUrl } = data;

  // Validaciones
  if (amount < SAVINGS_CONSTANTS.MIN_DEPOSIT_AMOUNT) {
    return {
      success: false,
      error: 'INVALID_AMOUNT',
      message: `El monto mínimo de depósito es ${SAVINGS_CONSTANTS.MIN_DEPOSIT_AMOUNT} COP`,
    };
  }

  try {
    // Usar transacción para garantizar consistencia
    const result = await runTransaction(db, async (transaction) => {
      const accountRef = doc(db, SAVINGS_ACCOUNTS_COLLECTION, userId);
      const accountSnap = await transaction.get(accountRef);

      let account: SavingsAccount;
      if (!accountSnap.exists()) {
        // Crear cuenta si no existe
        account = {
          id: userId,
          userId,
          balance: 0,
          totalDeposits: 0,
          totalWithdrawals: 0,
          status: AccountStatus.ACTIVE,
          monthlyContribution: 0,
          minMonthlyContribution: SAVINGS_CONSTANTS.MIN_MONTHLY_CONTRIBUTION,
          contributionStreak: 0,
          withdrawalsThisMonth: 0,
          maxWithdrawalsPerMonth: SAVINGS_CONSTANTS.MAX_WITHDRAWALS_PER_MONTH,
          totalFines: 0,
          finesPending: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        transaction.set(accountRef, account);
      } else {
        account = { id: accountSnap.id, ...accountSnap.data() } as SavingsAccount;
      }

      // Calcular nuevo balance
      const newBalance = account.balance + amount;

      // Crear transacción en subcollection (evita índices compuestos)
      const transactionsCollectionRef = collection(db, `savingsAccounts/${userId}/transactions`);
      const transactionRef = doc(transactionsCollectionRef);
      const newTransaction: Omit<SavingsTransaction, 'id'> = {
        accountId: userId,
        userId,
        type: TransactionType.DEPOSIT,
        amount,
        balance: newBalance,
        concept,
        metadata: receiptUrl ? { receiptUrl } : undefined,
        createdAt: serverTimestamp() as Timestamp,
        createdBy: userId,
      };

      transaction.set(transactionRef, newTransaction);

      // Actualizar cuenta
      const now = Timestamp.now();
      const currentMonth = `${now.toDate().getFullYear()}-${String(now.toDate().getMonth() + 1).padStart(2, '0')}`;
      
      transaction.update(accountRef, {
        balance: newBalance,
        totalDeposits: increment(amount),
        monthlyContribution: increment(amount),
        lastContributionDate: serverTimestamp(),
        lastTransactionId: transactionRef.id,
        updatedAt: serverTimestamp(),
      });

      return {
        transaction: { id: transactionRef.id, ...newTransaction } as SavingsTransaction,
        account: { ...account, balance: newBalance } as SavingsAccount,
      };
    });

    return {
      success: true,
      transaction: result.transaction,
      account: result.account,
      message: 'Depósito realizado exitosamente',
    };
  } catch (error) {
    console.error('Error creating deposit:', error);
    return {
      success: false,
      error: 'TRANSACTION_FAILED',
      message: 'Error al procesar el depósito. Por favor intenta nuevamente.',
    };
  }
}

/**
 * Crea una transacción de retiro
 */
export async function createWithdrawal(data: CreateWithdrawalData): Promise<TransactionResult> {
  const { userId, amount, concept, approvedBy } = data;

  // Validaciones básicas
  if (amount < SAVINGS_CONSTANTS.MIN_WITHDRAWAL_AMOUNT) {
    return {
      success: false,
      error: 'INVALID_AMOUNT',
      message: `El monto mínimo de retiro es ${SAVINGS_CONSTANTS.MIN_WITHDRAWAL_AMOUNT} COP`,
    };
  }

  try {
    const result = await runTransaction(db, async (transaction) => {
      const accountRef = doc(db, SAVINGS_ACCOUNTS_COLLECTION, userId);
      const accountSnap = await transaction.get(accountRef);

      if (!accountSnap.exists()) {
        throw new Error('ACCOUNT_NOT_FOUND');
      }

      const account = { id: accountSnap.id, ...accountSnap.data() } as SavingsAccount;

      // Validar retiros mensuales
      if (account.withdrawalsThisMonth >= account.maxWithdrawalsPerMonth) {
        throw new Error('MAX_WITHDRAWALS_REACHED');
      }

      // Calcular comisión del 2%
      const fee = amount * (SAVINGS_CONSTANTS.WITHDRAWAL_FEE_PERCENT / 100);
      const totalAmount = amount + fee;

      // Validar saldo suficiente
      if (account.balance < totalAmount) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // Calcular nuevo balance
      const newBalance = account.balance - totalAmount;

      // Crear transacción en subcollection (evita índices compuestos)
      const transactionsCollectionRef = collection(db, `savingsAccounts/${userId}/transactions`);
      const transactionRef = doc(transactionsCollectionRef);
      const newTransaction: Omit<SavingsTransaction, 'id'> = {
        accountId: userId,
        userId,
        type: TransactionType.WITHDRAWAL,
        amount: amount,
        balance: newBalance,
        concept,
        metadata: {
          fee,
          approvedBy: approvedBy || userId,
        },
        createdAt: serverTimestamp() as Timestamp,
        createdBy: userId,
      };

      transaction.set(transactionRef, newTransaction);

      // Actualizar cuenta
      transaction.update(accountRef, {
        balance: newBalance,
        totalWithdrawals: increment(totalAmount),
        withdrawalsThisMonth: increment(1),
        lastWithdrawalDate: serverTimestamp(),
        lastTransactionId: transactionRef.id,
        updatedAt: serverTimestamp(),
      });

      return {
        transaction: { id: transactionRef.id, ...newTransaction } as SavingsTransaction,
        account: { ...account, balance: newBalance } as SavingsAccount,
      };
    });

    return {
      success: true,
      transaction: result.transaction,
      account: result.account,
      message: `Retiro realizado exitosamente. Comisión aplicada: ${result.transaction?.metadata?.fee} COP`,
    };
  } catch (error: any) {
    console.error('Error creating withdrawal:', error);
    
    if (error.message === 'ACCOUNT_NOT_FOUND') {
      return {
        success: false,
        error: 'ACCOUNT_NOT_FOUND',
        message: 'No se encontró la cuenta de ahorros',
      };
    }
    
    if (error.message === 'MAX_WITHDRAWALS_REACHED') {
      return {
        success: false,
        error: 'MAX_WITHDRAWALS_REACHED',
        message: `Has alcanzado el límite de ${SAVINGS_CONSTANTS.MAX_WITHDRAWALS_PER_MONTH} retiros mensuales`,
      };
    }
    
    if (error.message === 'INSUFFICIENT_BALANCE') {
      return {
        success: false,
        error: 'INSUFFICIENT_BALANCE',
        message: 'Saldo insuficiente para realizar el retiro (incluyendo comisión del 2%)',
      };
    }

    return {
      success: false,
      error: 'TRANSACTION_FAILED',
      message: 'Error al procesar el retiro. Por favor intenta nuevamente.',
    };
  }
}

/**
 * Obtiene el historial de transacciones de un usuario
 * NOTA: Usa subcollection para evitar necesidad de índices compuestos
 */
export async function getTransactionHistory(
  userId: string,
  limitCount: number = 50
): Promise<SavingsTransaction[]> {
  // Opción 1: Usar subcollection (recomendado - no requiere índices)
  const transactionsRef = collection(db, `savingsAccounts/${userId}/transactions`);
  const q = query(
    transactionsRef,
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    userId, // Añadir userId manualmente
    ...doc.data(),
  })) as SavingsTransaction[];
}

/**
 * Verifica y aplica multas por incumplimiento de cuota mensual
 * Esta función debe ser ejecutada mensualmente (puede ser un Cloud Function)
 */
export async function checkAndApplyMonthlyFines(userId: string): Promise<void> {
  const account = await getSavingsAccount(userId);
  if (!account) return;

  // Si la contribución mensual es menor al mínimo, aplicar multa
  if (account.monthlyContribution < account.minMonthlyContribution) {
    const fineAmount = SAVINGS_CONSTANTS.FINE_AMOUNT;
    
    // Crear transacción de multa
    const transactionRef = doc(collection(db, SAVINGS_TRANSACTIONS_COLLECTION));
    const fineTransaction: Omit<SavingsTransaction, 'id'> = {
      accountId: userId,
      userId,
      type: TransactionType.FINE,
      amount: fineAmount,
      balance: account.balance - fineAmount,
      concept: 'Multa por no cumplir cuota mensual mínima',
      metadata: {
        fineReason: `Contribución mensual: ${account.monthlyContribution} COP (Mínimo: ${account.minMonthlyContribution} COP)`,
      },
      createdAt: Timestamp.now(),
      createdBy: 'system',
    };

    await setDoc(transactionRef, fineTransaction);

    // Actualizar cuenta
    const accountRef = doc(db, SAVINGS_ACCOUNTS_COLLECTION, userId);
    await updateDoc(accountRef, {
      balance: increment(-fineAmount),
      totalFines: increment(fineAmount),
      finesPending: increment(fineAmount),
      monthlyContribution: 0, // Resetear para el nuevo mes
      contributionStreak: 0,
      updatedAt: serverTimestamp(),
    });
  } else {
    // Si cumplió, incrementar racha y resetear contribución mensual
    const accountRef = doc(db, SAVINGS_ACCOUNTS_COLLECTION, userId);
    await updateDoc(accountRef, {
      monthlyContribution: 0,
      contributionStreak: increment(1),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Resetea el contador de retiros mensuales
 * Debe ejecutarse al inicio de cada mes
 */
export async function resetMonthlyWithdrawals(userId: string): Promise<void> {
  const accountRef = doc(db, SAVINGS_ACCOUNTS_COLLECTION, userId);
  await updateDoc(accountRef, {
    withdrawalsThisMonth: 0,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Obtiene las transacciones de ahorro de un usuario
 * @param userId - ID del usuario
 * @param limitCount - Número máximo de transacciones a obtener (por defecto 10)
 * @returns Array de transacciones ordenadas por fecha (más recientes primero)
 */
export async function getSavingsTransactions(
  userId: string,
  limitCount: number = 10
): Promise<SavingsTransaction[]> {
  try {
    // Buscar en la subcollection de transacciones del usuario
    const accountRef = doc(db, SAVINGS_ACCOUNTS_COLLECTION, userId);
    const transactionsRef = collection(accountRef, 'transactions');
    const q = query(
      transactionsRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SavingsTransaction[];
  } catch (error) {
    console.error('Error getting savings transactions:', error);
    return [];
  }
}
