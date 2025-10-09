'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { useToast } from '@/hooks/use-toast';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
  // User authentication state
  user: User | null;
  isUserLoading: boolean; // True during initial auth check
  userError: Error | null; // Error from auth listener
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult { // Renamed from UserAuthHookResult for consistency if desired, or keep as UserAuthHookResult
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

const createUserProfileDocument = async (firestore: Firestore, user: User, auth: Auth) => {
  const registrationDataString = sessionStorage.getItem('registrationData');
  if (!registrationDataString) {
    // Not a new registration or data is missing
    return;
  }
  
  try {
    const registrationData = JSON.parse(registrationDataString);
    const displayName = `${registrationData.firstName} ${registrationData.lastName}`;
    const userProfile = {
      id: user.uid,
      name: displayName,
      firstName: registrationData.firstName,
      lastName: registrationData.lastName,
      dateOfBirth: registrationData.dateOfBirth,
      email: user.email,
      phone: registrationData.phone,
      registrationDate: serverTimestamp(),
      role: 'cliente',
      status: 'activo', // Set default status to 'activo'
      photoURL: '',
      
      // 🆕 Campos financieros inicializados en cero
      savingsBalance: 0,
      totalLoans: 0,
      activeLoans: 0,
      currentDebt: 0,
      totalPaid: 0,
      creditScore: 100, // Puntaje inicial perfecto
      lastTransactionDate: serverTimestamp(),
    };

    const userDocRef = doc(firestore, 'users', user.uid);
    
    // Usar setDoc directamente con await para asegurar que se complete
    await setDoc(userDocRef, userProfile, { merge: true });

    // Update auth profile
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName });
    }

    // Clean up session storage
    sessionStorage.removeItem('registrationData');
    
    console.log('✅ User profile created successfully with financial summary for:', user.uid);
    console.log('📊 Financial fields:', {
      savingsBalance: userProfile.savingsBalance,
      totalLoans: userProfile.totalLoans,
      creditScore: userProfile.creditScore
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};


/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, // Start loading until first auth event
    userError: null,
  });

  // Effect to subscribe to Firebase auth state changes
  useEffect(() => {
    if (!auth || !firestore) { // If no Auth service instance, cannot determine user state
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth or Firestore service not provided.") });
      return;
    }

    setUserAuthState({ user: null, isUserLoading: true, userError: null }); // Reset on auth instance change

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => { // Auth state determined
        if (firebaseUser) {
          // Check if this is a new user (just registered)
          const isNewUser = firebaseUser.metadata.creationTime === firebaseUser.metadata.lastSignInTime;
          
          if (isNewUser) {
            // Usuario recién registrado - crear perfil completo
            try {
              await createUserProfileDocument(firestore, firebaseUser, auth);
              // Add a small delay to ensure Firestore has replicated the document
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
              console.error('Error in createUserProfileDocument:', error);
            }
          } else {
            // Usuario existente - verificar si tiene campos financieros
            try {
              const userDocRef = doc(firestore, 'users', firebaseUser.uid);
              const userDoc = await getDoc(userDocRef);
              
              if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Si no tiene campos financieros, agregarlos
                if (userData.savingsBalance === undefined) {
                  console.log('⚠️ Usuario sin campos financieros detectado. Agregando campos...');
                  
                  await setDoc(userDocRef, {
                    savingsBalance: 0,
                    totalLoans: 0,
                    activeLoans: 0,
                    currentDebt: 0,
                    totalPaid: 0,
                    creditScore: 100,
                    lastTransactionDate: serverTimestamp(),
                  }, { merge: true }); // merge: true para no sobrescribir otros campos
                  
                  console.log('✅ Campos financieros agregados automáticamente al usuario:', firebaseUser.uid);
                }
              }
            } catch (error) {
              console.error('Error al verificar/agregar campos financieros:', error);
            }
          }
        }
        setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
      },
      (error) => { // Auth listener error
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe(); // Cleanup
  }, [auth, firestore]); // Depends on the auth instance

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => { // Renamed from useAuthUser
  const { user, isUserLoading, userError } = useFirebase(); // Leverages the main hook
  return { user, isUserLoading, userError };
};
