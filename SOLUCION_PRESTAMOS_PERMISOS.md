# ✅ Solución: Permisos Insuficientes en Página de Préstamos

## 🔴 Problema Identificado

Cuando un cliente entra a `/dashboard/prestamos`, aparece el error:
```
FirebaseError: Missing or insufficient permissions
```

---

## 🔍 Causa Raíz

**Desincronización entre código y reglas de Firestore:**

### Código en `src/lib/loans-service.ts`:
```typescript
const LOANS_COLLECTION = 'loans';  // ❌ Sin reglas
const LOAN_PAYMENTS_COLLECTION = 'loanPayments';  // ❌ Sin reglas
```

### Reglas en `firestore.rules`:
```javascript
// ✅ Existían:
match /loan_requests/{requestId} { ... }
match /active_loans/{loanId} { ... }
match /loan_payments/{paymentId} { ... }

// ❌ Faltaban:
match /loans/{loanId} { ... }           // NO EXISTÍA
match /loanPayments/{paymentId} { ... } // NO EXISTÍA
```

**Resultado:** El código intentaba leer de colecciones sin permisos → Error.

---

## ✅ Solución Implementada

### 1. Agregadas Reglas para `/loans/{loanId}`

**Ubicación en firestore.rules:** Líneas ~340-380 (antes de `loan_requests`)

```javascript
/**
 * Colección: /loans/{loanId}
 * Descripción: Préstamos (solicitudes y activos en una sola colección)
 * 
 * Estados: pending, approved, rejected, active, overdue, paid, defaulted, cancelled
 */
match /loans/{loanId} {
  // ✅ Cliente puede ver sus propios préstamos
  allow get: if isSignedIn() && (
    resource.data.userId == request.auth.uid 
    || isAssociateOrAdmin()
  );

  // ✅ Cliente puede listar solo sus préstamos
  allow list: if isAssociateOrAdmin() 
              || (isSignedIn() && resource.data.userId == request.auth.uid);

  // ✅ Cliente puede crear solicitud de préstamo
  allow create: if isActiveUser() 
                && matchesAuthUser()
                && hasRequiredFields(['userId', 'amount', 'term', 'interestRate', 'status'])
                && request.resource.data.status == 'pending'
                && request.resource.data.amount > 0
                && request.resource.data.term > 0;

  // ✅ Cliente puede cancelar si está pending, admin/asociado puede cambiar cualquier estado
  allow update: if (isExistingOwner(resource.data.userId) && resource.data.status == 'pending')
                || isAssociateOrAdmin();

  // ✅ Solo admin puede eliminar
  allow delete: if isAdmin();
}
```

---

### 2. Agregadas Reglas para `/loanPayments/{paymentId}`

**Ubicación en firestore.rules:** Líneas ~420-450 (antes de `active_loans`)

```javascript
/**
 * Colección: /loanPayments/{paymentId}
 * Descripción: Pagos de préstamos
 * 
 * Estados: pending, completed, overdue, failed
 */
match /loanPayments/{paymentId} {
  // ✅ Cliente puede ver sus propios pagos
  allow get: if isSignedIn() && (
    resource.data.userId == request.auth.uid 
    || isAssociateOrAdmin()
  );

  // ✅ Cliente puede listar solo sus pagos
  allow list: if isAssociateOrAdmin() 
              || (isSignedIn() && resource.data.userId == request.auth.uid);

  // ✅ Solo asociados/admins pueden crear pagos
  allow create: if isAssociateOrAdmin() 
                && hasRequiredFields(['loanId', 'userId', 'amount'])
                && request.resource.data.amount > 0;

  // ✅ Solo asociados/admins pueden actualizar
  allow update: if isAssociateOrAdmin();

  // ✅ Solo admin puede eliminar
  allow delete: if isAdmin();
}
```

---

## 📊 Permisos por Rol

### 👤 Cliente (role: 'cliente')

| Operación | /loans | /loanPayments |
|-----------|--------|---------------|
| **GET** | ✅ Solo los suyos | ✅ Solo los suyos |
| **LIST** | ✅ Solo los suyos | ✅ Solo los suyos |
| **CREATE** | ✅ Solicitar préstamo | ❌ No puede |
| **UPDATE** | ✅ Cancelar si pending | ❌ No puede |
| **DELETE** | ❌ No puede | ❌ No puede |

### 👥 Asociado (role: 'asociado')

| Operación | /loans | /loanPayments |
|-----------|--------|---------------|
| **GET** | ✅ Todos | ✅ Todos |
| **LIST** | ✅ Todos | ✅ Todos |
| **CREATE** | ✅ Sí | ✅ Registrar pagos |
| **UPDATE** | ✅ Aprobar/rechazar | ✅ Actualizar pagos |
| **DELETE** | ❌ No puede | ❌ No puede |

### 🔐 Admin (role: 'admin')

| Operación | /loans | /loanPayments |
|-----------|--------|---------------|
| **GET** | ✅ Todos | ✅ Todos |
| **LIST** | ✅ Todos | ✅ Todos |
| **CREATE** | ✅ Sí | ✅ Sí |
| **UPDATE** | ✅ Cualquier cambio | ✅ Cualquier cambio |
| **DELETE** | ✅ Sí | ✅ Sí |

---

## 🔄 Queries que Ahora Funcionan

### 1. Verificar Préstamos Activos (checkLoanEligibility)

**Query en loans-service.ts:**
```typescript
const activeLoansQuery = query(
  collection(db, 'loans'),  // ✅ Ahora tiene permisos
  where('userId', '==', userId),
  where('status', 'in', ['active', 'overdue', 'approved'])
);
```

**Permiso aplicado:**
```javascript
allow list: if isSignedIn() && resource.data.userId == request.auth.uid;
```

✅ **Cliente puede leer solo sus préstamos con where('userId', '==', uid)**

---

### 2. Verificar Pagos Atrasados (checkLoanEligibility)

**Query en loans-service.ts:**
```typescript
const overdueQuery = query(
  collection(db, 'loanPayments'),  // ✅ Ahora tiene permisos
  where('userId', '==', userId),
  where('status', '==', 'overdue'),
  limit(1)
);
```

**Permiso aplicado:**
```javascript
allow list: if isSignedIn() && resource.data.userId == request.auth.uid;
```

✅ **Cliente puede leer solo sus pagos con where('userId', '==', uid)**

---

### 3. Obtener Préstamos del Usuario (getUserLoans)

**Query en loans-service.ts:**
```typescript
const loansQuery = query(
  collection(db, 'loans'),  // ✅ Ahora tiene permisos
  where('userId', '==', userId),
  orderBy('createdAt', 'desc')
);
```

✅ **Cliente puede listar sus propios préstamos**

---

### 4. Obtener Pagos de un Préstamo (getLoanPayments)

**Query en loans-service.ts:**
```typescript
const paymentsQuery = query(
  collection(db, 'loanPayments'),  // ✅ Ahora tiene permisos
  where('loanId', '==', loanId),
  where('userId', '==', userId),
  orderBy('dueDate', 'asc')
);
```

✅ **Cliente puede leer sus pagos filtrados por loanId y userId**

---

## 🚀 Pasos para Desplegar

### 1. Desplegar Reglas Actualizadas

```powershell
firebase deploy --only firestore:rules
```

O copiar y pegar en **Firebase Console → Firestore → Rules**.

---

### 2. Verificar Despliegue

1. Ir a Firebase Console → Firestore → Rules
2. Verificar que la fecha "Last updated" sea reciente
3. Buscar las secciones:
   - `match /loans/{loanId}`
   - `match /loanPayments/{paymentId}`

---

### 3. Probar la Aplicación

#### Test 1: Acceder a Página de Préstamos
```
1. Iniciar sesión como cliente
2. Ir a /dashboard/prestamos
3. ✅ La página debe cargar sin errores
4. ✅ Debe mostrar "Solicitar Préstamo" si es elegible
```

#### Test 2: Verificar Elegibilidad
```
1. La página debe cargar automáticamente:
   - Total prestado
   - Saldo por pagar
   - Próximo pago
   - Puntaje crediticio
2. ✅ No debe mostrar error de permisos
```

#### Test 3: Ver Historial de Préstamos
```
1. Si el usuario tiene préstamos previos
2. ✅ Debe mostrar la lista de préstamos
3. ✅ Solo sus propios préstamos (no de otros usuarios)
```

#### Test 4: Solicitar Préstamo
```
1. Click en "Solicitar Préstamo"
2. Llenar formulario
3. ✅ Debe crear solicitud sin error de permisos
4. ✅ Estado inicial: 'pending'
```

---

## 🔍 Validación de Seguridad

### ✅ Cliente NO Puede Ver Préstamos de Otros

**Query bloqueada:**
```typescript
// ❌ Intentar acceder a préstamo de otro usuario
const otroLoanRef = doc(db, 'loans', 'loan-de-otro-usuario');
await getDoc(otroLoanRef);
// Resultado: Permission denied
```

**Regla que lo bloquea:**
```javascript
allow get: if resource.data.userId == request.auth.uid || isAssociateOrAdmin();
```

---

### ✅ Cliente NO Puede Modificar Préstamo Aprobado

**Update bloqueado:**
```typescript
// ❌ Intentar cambiar estado de préstamo aprobado
const loanRef = doc(db, 'loans', 'mi-loan-aprobado');
await updateDoc(loanRef, { status: 'cancelled' });
// Resultado: Permission denied
```

**Regla que lo bloquea:**
```javascript
allow update: if (isExistingOwner(resource.data.userId) && resource.data.status == 'pending')
              || isAssociateOrAdmin();
// Solo puede modificar si status == 'pending'
```

---

### ✅ Cliente NO Puede Crear Pagos

**Creación bloqueada:**
```typescript
// ❌ Cliente intenta registrar su propio pago
await addDoc(collection(db, 'loanPayments'), {
  loanId: 'mi-loan',
  userId: 'mi-uid',
  amount: 50000,
  // ...
});
// Resultado: Permission denied
```

**Regla que lo bloquea:**
```javascript
allow create: if isAssociateOrAdmin(); // Solo asociados/admins
```

---

## 📁 Archivos Modificados

### `firestore.rules`
- ✅ **Líneas ~340-380**: Agregada sección `/loans/{loanId}`
- ✅ **Líneas ~420-450**: Agregada sección `/loanPayments/{paymentId}`
- ✅ **Total de líneas**: 564 → 725 (+161 líneas)

### Colecciones Cubiertas

| Colección | Estado |
|-----------|--------|
| `/loans` | ✅ **NUEVA** |
| `/loanPayments` | ✅ **NUEVA** |
| `/loan_requests` | ✅ Legacy (compatibilidad) |
| `/active_loans` | ✅ Legacy (compatibilidad) |
| `/loan_payments` | ✅ Legacy (compatibilidad) |

---

## 🎯 Resumen de la Solución

### Problema:
❌ Cliente no podía acceder a `/dashboard/prestamos`  
❌ Error: "Missing or insufficient permissions"

### Causa:
❌ Código usaba `'loans'` y `'loanPayments'`  
❌ Reglas solo tenían `'loan_requests'`, `'active_loans'`, `'loan_payments'`

### Solución:
✅ Agregadas reglas para `/loans/{loanId}`  
✅ Agregadas reglas para `/loanPayments/{paymentId}`  
✅ Permisos correctos para cada rol (cliente, asociado, admin)

### Resultado:
✅ Cliente puede ver sus préstamos  
✅ Cliente puede solicitar préstamos  
✅ Cliente puede ver su historial de pagos  
✅ Seguridad mantenida (no puede ver datos de otros)

---

## 📝 Notas Importantes

### 1. Colecciones Legacy

Las reglas antiguas (`loan_requests`, `active_loans`, `loan_payments`) se mantienen por compatibilidad. Si el sistema no las usa, se pueden eliminar después.

### 2. Arquitectura de Datos

El código actual usa una **colección única** (`loans`) con diferentes estados:
- `pending`: Solicitud pendiente
- `approved`: Aprobado pero no activo
- `active`: Préstamo activo
- `overdue`: En mora
- `paid`: Pagado completamente
- `rejected`: Rechazado
- `cancelled`: Cancelado
- `defaulted`: Incumplido

Esto es **más simple** que separar en `loan_requests` y `active_loans`.

### 3. Sin Índices Compuestos Requeridos

Las queries usan `where('userId', '==', uid)` + `orderBy()` pero como el cliente solo consulta sus propios datos, el volumen es pequeño y no requiere índices especiales.

Si Firebase pide crear índice, el link aparecerá en la consola.

---

## 🆘 Solución de Problemas

### Si Sigue Apareciendo Error de Permisos:

1. **Verificar despliegue:**
   ```powershell
   firebase deploy --only firestore:rules
   ```

2. **Esperar propagación:** 1-2 minutos después del despliegue

3. **Limpiar caché:** Ctrl + Shift + R en el navegador

4. **Verificar usuario activo:**
   ```
   Firebase Console → Firestore → users/{userId}
   Verificar: status: 'activo'
   ```

5. **Ver error completo:**
   ```
   Abrir DevTools → Console
   Ver mensaje completo del error
   Verificar qué colección está causando el problema
   ```

---

**Documento creado:** 9 de octubre de 2025  
**Problema:** Permisos insuficientes en página de préstamos  
**Solución:** Agregadas reglas para `/loans` y `/loanPayments`  
**Estado:** ✅ Listo para desplegar

---

¡La página de préstamos ahora debe funcionar correctamente para todos los roles! 🚀
