/**
 * @fileoverview Script de Migración para Agregar Campos Financieros a Usuarios Existentes
 * 
 * Este script actualiza todos los usuarios existentes en la base de datos
 * para agregarles los campos de resumen financiero.
 * 
 * IMPORTANTE: Ejecutar este script solo UNA VEZ después de desplegar las reglas actualizadas.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from '../src/firebase/config';

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Agrega campos financieros a un usuario
 */
async function addFinancialFieldsToUser(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      savingsBalance: 0,
      totalLoans: 0,
      activeLoans: 0,
      currentDebt: 0,
      totalPaid: 0,
      creditScore: 100, // Puntaje inicial perfecto
      lastTransactionDate: serverTimestamp(),
    });
    
    console.log(`✓ Usuario ${userId} actualizado con campos financieros`);
  } catch (error: any) {
    // Si el error es porque el campo ya existe, ignorarlo
    if (error.code === 'already-exists') {
      console.log(`⊙ Usuario ${userId} ya tiene campos financieros`);
    } else {
      console.error(`✗ Error actualizando usuario ${userId}:`, error.message);
    }
  }
}

/**
 * Migra todos los usuarios de la base de datos
 */
async function migrateAllUsers(): Promise<void> {
  console.log('🚀 Iniciando migración de usuarios...\n');
  
  try {
    // Obtener todos los usuarios
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const totalUsers = usersSnapshot.size;
    
    console.log(`📊 Total de usuarios encontrados: ${totalUsers}\n`);
    
    let success = 0;
    let failed = 0;
    let index = 0;
    
    // Procesar cada usuario
    for (const userDoc of usersSnapshot.docs) {
      index++;
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // Verificar si el usuario ya tiene los campos financieros
      if (userData.savingsBalance !== undefined) {
        console.log(`[${index}/${totalUsers}] ⊙ ${userId} - Ya migrado (${userData.firstName} ${userData.lastName})`);
        success++;
        continue;
      }
      
      console.log(`[${index}/${totalUsers}] ⏳ Migrando ${userId} (${userData.firstName} ${userData.lastName})...`);
      
      try {
        await addFinancialFieldsToUser(userId);
        success++;
      } catch (error) {
        failed++;
        console.error(`[${index}/${totalUsers}] ✗ Error en ${userId}:`, error);
      }
      
      // Pausa breve para no sobrecargar Firestore
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📈 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`✓ Exitosos: ${success}`);
    console.log(`✗ Fallidos: ${failed}`);
    console.log(`📊 Total: ${totalUsers}`);
    console.log('='.repeat(60));
    
    if (failed === 0) {
      console.log('\n🎉 ¡Migración completada exitosamente!');
    } else {
      console.log(`\n⚠️  Migración completada con ${failed} errores. Revisa los logs arriba.`);
    }
    
  } catch (error) {
    console.error('\n💥 Error fatal durante la migración:', error);
    throw error;
  }
}

/**
 * Migra un solo usuario específico (útil para pruebas)
 */
async function migrateOneUser(userId: string): Promise<void> {
  console.log(`🚀 Migrando usuario específico: ${userId}\n`);
  
  try {
    await addFinancialFieldsToUser(userId);
    console.log('\n✓ Migración de usuario individual completada');
  } catch (error) {
    console.error('\n✗ Error migrando usuario:', error);
    throw error;
  }
}

// ===================================================================
// PUNTO DE ENTRADA
// ===================================================================

const args = process.argv.slice(2);

if (args.length === 0) {
  // Sin argumentos: migrar todos los usuarios
  console.log('📝 Modo: Migración completa de todos los usuarios\n');
  migrateAllUsers()
    .then(() => {
      console.log('\n👋 Script finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script terminado con errores:', error);
      process.exit(1);
    });
} else if (args[0] === '--user' && args[1]) {
  // Con argumentos: migrar un usuario específico
  const userId = args[1];
  console.log(`📝 Modo: Migración de usuario específico\n`);
  migrateOneUser(userId)
    .then(() => {
      console.log('\n👋 Script finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script terminado con errores:', error);
      process.exit(1);
    });
} else {
  console.log(`
❌ Uso incorrecto del script

📖 USO:

1️⃣  Migrar todos los usuarios:
   npm run migrate-users

2️⃣  Migrar un usuario específico:
   npm run migrate-users -- --user USER_ID_AQUI

Ejemplo:
   npm run migrate-users -- --user abc123xyz456
  `);
  process.exit(1);
}
