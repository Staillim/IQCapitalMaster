'use client';
import {
  Auth, // Import Auth type for type hinting
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  // Assume getAuth and app are initialized elsewhere
} from 'firebase/auth';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  // CRITICAL: Call signInAnonymously directly. Do NOT use 'await signInAnonymously(...)'.
  signInAnonymously(authInstance);
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  // CRITICAL: Call createUserWithEmailAndPassword directly. Do NOT use 'await createUserWithEmailAndPassword(...)'.
  createUserWithEmailAndPassword(authInstance, email, password)
    .catch((error) => {
      // Capturar errores y emitir evento personalizado
      const errorMessage = getFirebaseErrorMessage(error.code);
      
      window.dispatchEvent(
        new CustomEvent('firebase-auth-error', {
          detail: { code: error.code, message: errorMessage }
        })
      );
      
      console.error('Error al crear cuenta:', errorMessage);
    });
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  // CRITICAL: Call signInWithEmailAndPassword directly. Do NOT use 'await signInWithEmailAndPassword(...)'.
  signInWithEmailAndPassword(authInstance, email, password)
    .catch((error) => {
      // Capturar errores y emitir evento personalizado para mostrar mensaje amigable
      const errorMessage = getFirebaseErrorMessage(error.code);
      
      // Emitir evento personalizado que será capturado por FirebaseErrorListener
      window.dispatchEvent(
        new CustomEvent('firebase-auth-error', {
          detail: { code: error.code, message: errorMessage }
        })
      );
      
      console.error('Error de autenticación:', errorMessage);
    });
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/**
 * Traduce códigos de error de Firebase a mensajes amigables en español
 */
function getFirebaseErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    'auth/invalid-credential': 'Correo electrónico o contraseña incorrectos',
    'auth/user-not-found': 'No existe una cuenta con este correo electrónico',
    'auth/wrong-password': 'La contraseña es incorrecta',
    'auth/invalid-email': 'El correo electrónico no es válido',
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
    'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta de nuevo más tarde',
    'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
    'auth/email-already-in-use': 'Ya existe una cuenta con este correo electrónico',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/operation-not-allowed': 'Operación no permitida',
    'auth/requires-recent-login': 'Por seguridad, debes iniciar sesión nuevamente',
  };

  return errorMessages[errorCode] || 'Error al iniciar sesión. Intenta de nuevo';
}
