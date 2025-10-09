/**
 * Servicios de Firestore para el módulo de Préstamos
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
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import {
  LoanApplication,
  LoanPayment,
  LoanStatus,
  PaymentStatus,
  CreateLoanApplicationData,
  ApproveLoanData,
  CreatePaymentData,
  LoanOperationResult,
  LoanEligibility,
  LoanStats,
  PaymentSchedule,
  LOAN_CONSTANTS,
  calculateMonthlyPayment,
  generatePaymentSchedule,
  calculateCreditScore,
} from '@/types/loans';
import { getSavingsAccount } from './savings-service';

// Inicializar Firebase y obtener Firestore
const { firestore: db } = initializeFirebase();

// Referencias a colecciones
const LOANS_COLLECTION = 'loans';
const LOAN_PAYMENTS_COLLECTION = 'loanPayments';

/**
 * Verifica elegibilidad para solicitar préstamo
 */
export async function checkLoanEligibility(userId: string): Promise<LoanEligibility> {
  try {
    // Obtener cuenta de ahorros
    const savingsAccount = await getSavingsAccount(userId);
    
    if (!savingsAccount) {
      return {
        isEligible: false,
        reasons: ['No tienes una cuenta de ahorros activa'],
        maxLoanAmount: 0,
        requiredSavings: LOAN_CONSTANTS.MIN_SAVINGS_REQUIRED,
        hasActiveLoan: false,
        hasOverduePayments: false,
        creditScore: 0,
      };
    }

    const reasons: string[] = [];
    let isEligible = true;

    // Verificar saldo mínimo en ahorros
    if (savingsAccount.balance < LOAN_CONSTANTS.MIN_SAVINGS_REQUIRED) {
      isEligible = false;
      reasons.push(
        `Necesitas al menos ${LOAN_CONSTANTS.MIN_SAVINGS_REQUIRED.toLocaleString('es-CO')} COP en ahorros`
      );
    }

    // Verificar préstamos activos usando subcollection (evita índice compuesto)
    const activeLoansQuery = query(
      collection(db, `users/${userId}/loans`),
      where('status', 'in', [LoanStatus.ACTIVE, LoanStatus.OVERDUE, LoanStatus.APPROVED])
    );
    const activeLoansSnapshot = await getDocs(activeLoansQuery);
    const hasActiveLoan = !activeLoansSnapshot.empty;

    if (hasActiveLoan) {
      isEligible = false;
      reasons.push('Ya tienes un préstamo activo. Debes pagarlo antes de solicitar otro.');
    }

    // Verificar pagos atrasados usando subcollection de pagos del usuario
    const overdueQuery = query(
      collection(db, `users/${userId}/loanPayments`),
      where('status', '==', PaymentStatus.OVERDUE),
      limit(1)
    );
    const overdueSnapshot = await getDocs(overdueQuery);
    const hasOverduePayments = !overdueSnapshot.empty;

    if (hasOverduePayments) {
      isEligible = false;
      reasons.push('Tienes pagos atrasados. Debes ponerte al día antes de solicitar un nuevo préstamo.');
    }

    // Calcular estadísticas y puntaje crediticio
    const stats = await getLoanStats(userId);
    const creditScore = calculateCreditScore(stats);

    // Calcular monto máximo basado en ahorros (máximo 10x el saldo)
    const maxLoanAmount = Math.min(
      savingsAccount.balance * 10,
      LOAN_CONSTANTS.MAX_LOAN_AMOUNT
    );

    if (isEligible) {
      reasons.push('Cumples con todos los requisitos para solicitar un préstamo');
    }

    return {
      isEligible,
      reasons,
      maxLoanAmount,
      requiredSavings: LOAN_CONSTANTS.MIN_SAVINGS_REQUIRED,
      hasActiveLoan,
      hasOverduePayments,
      creditScore,
    };
  } catch (error) {
    console.error('Error checking eligibility:', error);
    return {
      isEligible: false,
      reasons: ['Error al verificar elegibilidad'],
      maxLoanAmount: 0,
      requiredSavings: LOAN_CONSTANTS.MIN_SAVINGS_REQUIRED,
      hasActiveLoan: false,
      hasOverduePayments: false,
      creditScore: 0,
    };
  }
}

/**
 * Crea una nueva solicitud de préstamo
 */
export async function createLoanApplication(
  data: CreateLoanApplicationData
): Promise<LoanOperationResult> {
  const { userId, applicantName, amount, term, purpose, codeudores } = data;

  // Validaciones básicas
  if (amount < LOAN_CONSTANTS.MIN_LOAN_AMOUNT || amount > LOAN_CONSTANTS.MAX_LOAN_AMOUNT) {
    return {
      success: false,
      error: 'INVALID_AMOUNT',
      message: `El monto debe estar entre ${LOAN_CONSTANTS.MIN_LOAN_AMOUNT.toLocaleString('es-CO')} y ${LOAN_CONSTANTS.MAX_LOAN_AMOUNT.toLocaleString('es-CO')} COP`,
    };
  }

  if (term < LOAN_CONSTANTS.MIN_TERM_MONTHS || term > LOAN_CONSTANTS.MAX_TERM_MONTHS) {
    return {
      success: false,
      error: 'INVALID_TERM',
      message: `El plazo debe estar entre ${LOAN_CONSTANTS.MIN_TERM_MONTHS} y ${LOAN_CONSTANTS.MAX_TERM_MONTHS} meses`,
    };
  }

  if (codeudores.length < LOAN_CONSTANTS.REQUIRED_CODEUDORES) {
    return {
      success: false,
      error: 'INSUFFICIENT_CODEUDORES',
      message: `Debes agregar al menos ${LOAN_CONSTANTS.REQUIRED_CODEUDORES} co-deudores`,
    };
  }

  // Verificar elegibilidad
  const eligibility = await checkLoanEligibility(userId);
  if (!eligibility.isEligible) {
    return {
      success: false,
      error: 'NOT_ELIGIBLE',
      message: eligibility.reasons.join('. '),
    };
  }

  try {
    // Calcular cuota mensual y totales
    const monthlyPayment = calculateMonthlyPayment(
      amount,
      LOAN_CONSTANTS.MONTHLY_INTEREST_RATE,
      term
    );
    const totalAmount = monthlyPayment * term;
    const totalInterest = totalAmount - amount;

    // Crear solicitud de préstamo en subcollection (evita índice compuesto)
    const loansCollectionRef = collection(db, `users/${userId}/loans`);
    const loanRef = doc(loansCollectionRef);
    const newLoan: Omit<LoanApplication, 'id'> = {
      userId,
      applicantName,
      amount,
      term,
      purpose,
      monthlyPayment,
      totalInterest,
      totalAmount,
      codeudores: codeudores.map(c => ({
        ...c,
        status: 'pending' as const,
      })),
      status: LoanStatus.PENDING,
      paidPayments: 0,
      totalPayments: term,
      remainingBalance: totalAmount,
      overduePayments: 0,
      overdueDays: 0,
      totalLateFees: 0,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    await setDoc(loanRef, newLoan);

    return {
      success: true,
      loan: { id: loanRef.id, ...newLoan } as LoanApplication,
      message: 'Solicitud de préstamo creada exitosamente. Espera la aprobación.',
    };
  } catch (error) {
    console.error('Error creating loan application:', error);
    return {
      success: false,
      error: 'CREATION_FAILED',
      message: 'Error al crear la solicitud de préstamo. Por favor intenta nuevamente.',
    };
  }
}

/**
 * Aprueba un préstamo y genera el plan de pagos
 */
export async function approveLoan(data: ApproveLoanData): Promise<LoanOperationResult> {
  const { loanId, approvedBy, disbursementMethod, bankAccount, notes } = data;

  try {
    const result = await runTransaction(db, async (transaction) => {
      const loanRef = doc(db, LOANS_COLLECTION, loanId);
      const loanSnap = await transaction.get(loanRef);

      if (!loanSnap.exists()) {
        throw new Error('LOAN_NOT_FOUND');
      }

      const loan = { id: loanSnap.id, ...loanSnap.data() } as LoanApplication;

      if (loan.status !== LoanStatus.PENDING) {
        throw new Error('LOAN_NOT_PENDING');
      }

      // Actualizar préstamo
      const now = Timestamp.now();
      transaction.update(loanRef, {
        status: LoanStatus.ACTIVE,
        approvedBy,
        approvedAt: now,
        disbursedAt: now,
        disbursementMethod,
        bankAccount,
        notes,
        nextPaymentDate: Timestamp.fromDate(
          new Date(now.toDate().setMonth(now.toDate().getMonth() + 1))
        ),
        updatedAt: serverTimestamp(),
      });

      // Generar plan de pagos
      const schedule = generatePaymentSchedule(
        loan.amount,
        LOAN_CONSTANTS.MONTHLY_INTEREST_RATE,
        loan.term,
        now.toDate()
      );

      // Crear registros de pagos
      for (const payment of schedule) {
        const paymentRef = doc(collection(db, LOAN_PAYMENTS_COLLECTION));
        const newPayment: Omit<LoanPayment, 'id'> = {
          loanId,
          paymentNumber: payment.paymentNumber,
          dueDate: Timestamp.fromDate(payment.dueDate),
          amount: payment.payment,
          principal: payment.principal,
          interest: payment.interest,
          balance: payment.balance,
          status: PaymentStatus.PENDING,
          createdAt: now,
        };
        transaction.set(paymentRef, newPayment);
      }

      return { ...loan, status: LoanStatus.ACTIVE };
    });

    return {
      success: true,
      loan: result,
      message: 'Préstamo aprobado y desembolsado exitosamente',
    };
  } catch (error: any) {
    console.error('Error approving loan:', error);

    if (error.message === 'LOAN_NOT_FOUND') {
      return {
        success: false,
        error: 'LOAN_NOT_FOUND',
        message: 'No se encontró el préstamo',
      };
    }

    if (error.message === 'LOAN_NOT_PENDING') {
      return {
        success: false,
        error: 'LOAN_NOT_PENDING',
        message: 'El préstamo no está pendiente de aprobación',
      };
    }

    return {
      success: false,
      error: 'APPROVAL_FAILED',
      message: 'Error al aprobar el préstamo. Por favor intenta nuevamente.',
    };
  }
}

/**
 * Registra un pago de cuota
 */
export async function createPayment(data: CreatePaymentData): Promise<LoanOperationResult> {
  const { loanId, paymentNumber, amount, paymentMethod, receiptUrl, notes } = data;

  try {
    const result = await runTransaction(db, async (transaction) => {
      // Obtener préstamo
      const loanRef = doc(db, LOANS_COLLECTION, loanId);
      const loanSnap = await transaction.get(loanRef);

      if (!loanSnap.exists()) {
        throw new Error('LOAN_NOT_FOUND');
      }

      const loan = { id: loanSnap.id, ...loanSnap.data() } as LoanApplication;

      // Obtener pago pendiente
      const paymentsQuery = query(
        collection(db, LOAN_PAYMENTS_COLLECTION),
        where('loanId', '==', loanId),
        where('paymentNumber', '==', paymentNumber)
      );
      const paymentsSnap = await getDocs(paymentsQuery);

      if (paymentsSnap.empty) {
        throw new Error('PAYMENT_NOT_FOUND');
      }

      const paymentDoc = paymentsSnap.docs[0];
      const payment = { id: paymentDoc.id, ...paymentDoc.data() } as LoanPayment;

      if (payment.status === PaymentStatus.PAID) {
        throw new Error('PAYMENT_ALREADY_PAID');
      }

      // Calcular días de atraso
      const now = Timestamp.now();
      const dueDate = payment.dueDate.toDate();
      const lateDays = Math.max(0, Math.floor((now.toMillis() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      const lateFee = lateDays > 0 ? lateDays * LOAN_CONSTANTS.LATE_FEE_PER_DAY : 0;

      // Actualizar pago
      const paymentRef = doc(db, LOAN_PAYMENTS_COLLECTION, paymentDoc.id);
      transaction.update(paymentRef, {
        status: PaymentStatus.PAID,
        paidAt: now,
        paidAmount: amount,
        lateDays,
        lateFee,
        paymentMethod,
        receiptUrl,
        notes,
      });

      // Actualizar préstamo
      const newRemainingBalance = loan.remainingBalance - amount;
      const newPaidPayments = loan.paidPayments + 1;
      const newStatus =
        newPaidPayments === loan.totalPayments ? LoanStatus.PAID : LoanStatus.ACTIVE;

      // Calcular próxima fecha de pago
      let nextPaymentDate = loan.nextPaymentDate;
      if (newStatus === LoanStatus.ACTIVE) {
        const currentDueDate = payment.dueDate.toDate();
        nextPaymentDate = Timestamp.fromDate(
          new Date(currentDueDate.setMonth(currentDueDate.getMonth() + 1))
        );
      }

      transaction.update(loanRef, {
        paidPayments: newPaidPayments,
        remainingBalance: Math.max(0, newRemainingBalance),
        lastPaymentDate: now,
        nextPaymentDate,
        totalLateFees: increment(lateFee),
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      return {
        ...payment,
        status: PaymentStatus.PAID,
        paidAt: now,
        paidAmount: amount,
        lateDays,
        lateFee,
      };
    });

    return {
      success: true,
      payment: result,
      message: `Pago registrado exitosamente${result.lateFee ? ` (incluye multa de ${result.lateFee} COP por atraso)` : ''}`,
    };
  } catch (error: any) {
    console.error('Error creating payment:', error);

    if (error.message === 'LOAN_NOT_FOUND') {
      return {
        success: false,
        error: 'LOAN_NOT_FOUND',
        message: 'No se encontró el préstamo',
      };
    }

    if (error.message === 'PAYMENT_NOT_FOUND') {
      return {
        success: false,
        error: 'PAYMENT_NOT_FOUND',
        message: 'No se encontró la cuota de pago',
      };
    }

    if (error.message === 'PAYMENT_ALREADY_PAID') {
      return {
        success: false,
        error: 'PAYMENT_ALREADY_PAID',
        message: 'Esta cuota ya fue pagada',
      };
    }

    return {
      success: false,
      error: 'PAYMENT_FAILED',
      message: 'Error al registrar el pago. Por favor intenta nuevamente.',
    };
  }
}

/**
 * Obtiene los préstamos de un usuario
 */
export async function getUserLoans(userId: string): Promise<LoanApplication[]> {
  // Usar subcollection para evitar índice compuesto (userId + createdAt)
  const loansQuery = query(
    collection(db, `users/${userId}/loans`),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(loansQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as LoanApplication[];
}

/**
 * Obtiene el plan de pagos de un préstamo
 */
export async function getPaymentSchedule(loanId: string): Promise<PaymentSchedule | null> {
  try {
    const loanRef = doc(db, LOANS_COLLECTION, loanId);
    const loanSnap = await getDoc(loanRef);

    if (!loanSnap.exists()) {
      return null;
    }

    const loan = { id: loanSnap.id, ...loanSnap.data() } as LoanApplication;

    const paymentsQuery = query(
      collection(db, LOAN_PAYMENTS_COLLECTION),
      where('loanId', '==', loanId),
      orderBy('paymentNumber', 'asc')
    );

    const paymentsSnap = await getDocs(paymentsQuery);
    const payments = paymentsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as LoanPayment[];

    return {
      loanId,
      payments,
      summary: {
        totalAmount: loan.totalAmount,
        totalPrincipal: loan.amount,
        totalInterest: loan.totalInterest,
        monthlyPayment: loan.monthlyPayment,
        term: loan.term,
      },
    };
  } catch (error) {
    console.error('Error getting payment schedule:', error);
    return null;
  }
}

/**
 * Obtiene estadísticas de préstamos de un usuario
 */
export async function getLoanStats(userId: string): Promise<LoanStats> {
  const loans = await getUserLoans(userId);

  let totalBorrowed = 0;
  let totalPaid = 0;
  let totalInterestPaid = 0;
  let currentDebt = 0;
  let overdueAmount = 0;
  let paymentsMade = 0;
  let paymentsOnTime = 0;
  let totalLateDays = 0;

  for (const loan of loans) {
    totalBorrowed += loan.amount;
    currentDebt += loan.remainingBalance;
    paymentsMade += loan.paidPayments;
    totalInterestPaid += (loan.paidPayments * loan.monthlyPayment) - (loan.amount * (loan.paidPayments / loan.totalPayments));

    // Obtener pagos del préstamo para calcular estadísticas
    const paymentsQuery = query(
      collection(db, LOAN_PAYMENTS_COLLECTION),
      where('loanId', '==', loan.id),
      where('status', '==', PaymentStatus.PAID)
    );
    const paymentsSnap = await getDocs(paymentsQuery);
    const payments = paymentsSnap.docs.map(doc => doc.data()) as LoanPayment[];

    for (const payment of payments) {
      totalPaid += payment.paidAmount || payment.amount;
      if (payment.lateDays === 0) {
        paymentsOnTime++;
      }
      totalLateDays += payment.lateDays || 0;
    }

    if (loan.status === LoanStatus.OVERDUE) {
      overdueAmount += loan.remainingBalance;
    }
  }

  const averageLateDays = paymentsMade > 0 ? totalLateDays / paymentsMade : 0;
  const creditScore = calculateCreditScore({
    totalLoans: loans.length,
    paymentsOnTime,
    paymentsMade,
    overdueAmount,
    averageLateDays,
  });

  return {
    totalLoans: loans.length,
    activeLoans: loans.filter(l => l.status === LoanStatus.ACTIVE || l.status === LoanStatus.OVERDUE).length,
    totalBorrowed,
    totalPaid,
    totalInterestPaid,
    currentDebt,
    overdueAmount,
    paymentsMade,
    paymentsOnTime,
    averageLateDays,
    creditScore,
  };
}
