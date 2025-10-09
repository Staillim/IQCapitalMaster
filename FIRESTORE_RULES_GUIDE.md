# 🔒 Guía de Reglas de Seguridad Firestore - Sistema FAP

## 📋 Tabla de Contenidos
1. [Visión General](#visión-general)
2. [Estructura de Permisos](#estructura-de-permisos)
3. [Roles y Niveles de Acceso](#roles-y-niveles-de-acceso)
4. [Reglas por Colección](#reglas-por-colección)
5. [Funciones de Seguridad](#funciones-de-seguridad)
6. [Casos de Uso Comunes](#casos-de-uso-comunes)
7. [Testing de Reglas](#testing-de-reglas)
8. [Despliegue](#despliegue)

---

## 🎯 Visión General

Las reglas de Firestore implementadas para el sistema FAP siguen estos principios:

### Principios de Seguridad
1. **Mínimo Privilegio**: Los usuarios solo tienen acceso a lo estrictamente necesario
2. **Propiedad de Datos**: Los usuarios solo pueden ver/editar sus propios datos
3. **Separación de Roles**: Cada rol (cliente, asociado, admin) tiene permisos específicos
4. **Auditoría**: Todas las acciones administrativas se registran
5. **Validación Estricta**: Se validan tipos, campos requeridos y valores permitidos

### Arquitectura de Seguridad
```
┌─────────────────────────────────────────┐
│         FIRESTORE SECURITY              │
├─────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │ CLIENTE │  │ASOCIADO │  │  ADMIN  │ │
│  └────┬────┘  └────┬────┘  └────┬────┘ │
│       │            │             │      │
│  ┌────▼────────────▼─────────────▼────┐ │
│  │    FUNCIONES DE VALIDACIÓN         │ │
│  │  - isSignedIn()                    │ │
│  │  - isOwner()                       │ │
│  │  - isAdmin()                       │ │
│  │  - isAssociateOrAdmin()            │ │
│  └────────────────────────────────────┘ │
│                                         │
│  ┌────────────────────────────────────┐ │
│  │     COLECCIONES PROTEGIDAS         │ │
│  │  - users                           │ │
│  │  - withdrawal_requests             │ │
│  │  - loan_requests                   │ │
│  │  - meetings                        │ │
│  │  - system_config                   │ │
│  │  - admin_logs                      │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 👥 Roles y Niveles de Acceso

### 🔵 CLIENTE (Usuario Básico)
**Permisos:**
- ✅ Ver su propio perfil
- ✅ Actualizar su propio perfil (excepto rol)
- ✅ Crear solicitudes de retiro
- ✅ Ver sus propias solicitudes de retiro
- ✅ Ver sus transacciones de ahorro
- ✅ Crear solicitudes de préstamo
- ✅ Ver sus propios préstamos
- ✅ Ver reuniones programadas
- ✅ Ver su asistencia a reuniones
- ✅ Ver notificaciones propias

**Restricciones:**
- ❌ No puede ver datos de otros usuarios
- ❌ No puede aprobar préstamos o retiros
- ❌ No puede crear reuniones
- ❌ No puede acceder a configuración del sistema
- ❌ No puede ver logs administrativos

### 🟢 ASOCIADO
**Permisos (Incluye todos los de Cliente +):**
- ✅ Ver todas las solicitudes de retiro
- ✅ Aprobar/rechazar solicitudes de retiro
- ✅ Ver todas las solicitudes de préstamo
- ✅ Aprobar/rechazar préstamos
- ✅ Crear y registrar transacciones de ahorro
- ✅ Ver todos los préstamos activos
- ✅ Registrar pagos de préstamos
- ✅ Crear reuniones
- ✅ Registrar asistencia a reuniones
- ✅ Ver configuración del sistema
- ✅ Crear logs administrativos

**Restricciones:**
- ❌ No puede modificar configuración del sistema
- ❌ No puede eliminar registros
- ❌ No puede ver/modificar usuarios (excepto datos públicos)
- ❌ No puede listar todos los usuarios

### 🔴 ADMIN (Administrador)
**Permisos (Acceso Completo):**
- ✅ **CRUD completo** en todas las colecciones
- ✅ Listar todos los usuarios
- ✅ Modificar roles de usuarios
- ✅ Activar/desactivar usuarios
- ✅ Modificar configuración del sistema
- ✅ Ver todos los logs administrativos
- ✅ Eliminar registros cuando sea necesario
- ✅ Acceso de auditoría completo

---

## 📚 Reglas por Colección

### 1. `/users/{userId}` - Perfiles de Usuarios

**Estructura de Datos:**
```typescript
{
  id: string,
  email: string,
  firstName: string,
  lastName: string,
  phone: string,
  role: 'cliente' | 'asociado' | 'admin',
  status: 'activo' | 'inactivo' | 'pendiente',
  savingsBalance: number,
  totalSavingsDeposits: number,
  registrationDate: timestamp,
  photoURL?: string,
  address?: string,
  location?: { latitude: number, longitude: number },
  termsAccepted?: boolean,
  notifications?: { email: boolean, push: boolean, sms: boolean }
}
```

**Reglas de Acceso:**
| Operación | Cliente | Asociado | Admin |
|-----------|---------|----------|-------|
| GET (propio) | ✅ | ✅ | ✅ |
| GET (otros) | ❌ | ❌ | ✅ |
| LIST | ❌ | ❌ | ✅ |
| CREATE | ✅ (solo su perfil) | ✅ | ✅ |
| UPDATE (propio) | ✅ (no rol) | ✅ (no rol) | ✅ |
| UPDATE (otros) | ❌ | ❌ | ✅ |
| DELETE | ❌ | ❌ | ✅ |

**Validaciones:**
- ✅ Campo `id` debe coincidir con el userId del path
- ✅ Campos requeridos: id, email, firstName, lastName, role
- ✅ El usuario no puede cambiar su propio rol
- ✅ Solo admin puede cambiar roles de otros

---

### 2. `/withdrawal_requests/{requestId}` - Solicitudes de Retiro

**Estructura de Datos:**
```typescript
{
  id: string,
  userId: string,
  amount: number,
  currentBalance: number,
  requestDate: timestamp,
  scheduledDate: timestamp,
  reason: string,
  status: 'pending' | 'approved' | 'rejected' | 'completed',
  reviewNotes?: string,
  reviewedBy?: string,
  reviewedAt?: timestamp
}
```

**Reglas de Acceso:**
| Operación | Cliente | Asociado | Admin |
|-----------|---------|----------|-------|
| GET (propio) | ✅ | ✅ | ✅ |
| GET (otros) | ❌ | ✅ | ✅ |
| LIST (todas) | ❌ | ✅ | ✅ |
| LIST (propias) | ✅ | ✅ | ✅ |
| CREATE | ✅ | ✅ | ✅ |
| UPDATE (aprobar/rechazar) | ❌ | ✅ | ✅ |
| DELETE | ❌ | ❌ | ✅ |

**Validaciones:**
- ✅ Usuario solo puede crear solicitudes con su propio `userId`
- ✅ Estado inicial debe ser `pending`
- ✅ Monto debe ser mayor a 0
- ✅ Al aprobar/rechazar se requieren: `reviewedBy`, `reviewedAt`
- ✅ Solo se puede actualizar si el estado es `pending`

**Flujo de Aprobación:**
```
1. Cliente crea solicitud (status: 'pending')
   ↓
2. Asociado/Admin revisa
   ↓
3. Aprueba (status: 'approved') o Rechaza (status: 'rejected')
   ↓
4. Si aprobado → Admin procesa (status: 'completed')
```

---

### 3. `/savings_transactions/{transactionId}` - Transacciones de Ahorro

**Estructura de Datos:**
```typescript
{
  id: string,
  userId: string,
  type: 'deposit' | 'withdrawal',
  amount: number,
  date: timestamp,
  description: string,
  status: 'completed' | 'pending' | 'cancelled',
  location?: { lat: number, lng: number },
  signature?: string
}
```

**Reglas de Acceso:**
| Operación | Cliente | Asociado | Admin |
|-----------|---------|----------|-------|
| GET (propio) | ✅ | ✅ | ✅ |
| GET (otros) | ❌ | ❌ | ✅ |
| LIST (todas) | ❌ | ❌ | ✅ |
| LIST (propias) | ✅ | ✅ | ✅ |
| CREATE | ❌ | ✅ | ✅ |
| UPDATE | ❌ | ❌ | ✅ |
| DELETE | ❌ | ❌ | ✅ |

**Validaciones:**
- ✅ Tipo debe ser `deposit` o `withdrawal`
- ✅ Monto debe ser mayor a 0
- ✅ Estado debe ser `completed` o `pending`
- ✅ Solo asociados y admins pueden registrar transacciones

---

### 4. `/loan_requests/{requestId}` - Solicitudes de Préstamos

**Estructura de Datos:**
```typescript
{
  id: string,
  userId: string,
  amount: number,
  term: number,
  purpose: string,
  interestRate: number,
  monthlyPayment: number,
  totalToRepay: number,
  requestDate: timestamp,
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed',
  riskLevel?: 'low' | 'medium' | 'high',
  reviewNotes?: string,
  reviewedBy?: string,
  reviewedAt?: timestamp
}
```

**Reglas de Acceso:**
| Operación | Cliente | Asociado | Admin |
|-----------|---------|----------|-------|
| GET (propio) | ✅ | ✅ | ✅ |
| GET (otros) | ❌ | ✅ | ✅ |
| LIST (todas) | ❌ | ✅ | ✅ |
| LIST (propias) | ✅ | ✅ | ✅ |
| CREATE | ✅ | ✅ | ✅ |
| UPDATE (aprobar/rechazar) | ❌ | ✅ | ✅ |
| DELETE | ❌ | ❌ | ✅ |

**Validaciones:**
- ✅ Usuario solo puede crear solicitudes con su propio `userId`
- ✅ Estado inicial debe ser `pending`
- ✅ Monto y plazo deben ser mayores a 0
- ✅ Al aprobar/rechazar se requieren: `reviewedBy`, `reviewedAt`
- ✅ Campos requeridos: userId, amount, term, purpose, interestRate, requestDate, status

---

### 5. `/active_loans/{loanId}` - Préstamos Activos

**Estructura de Datos:**
```typescript
{
  id: string,
  userId: string,
  amount: number,
  term: number,
  interestRate: number,
  monthlyPayment: number,
  totalToRepay: number,
  totalPaid: number,
  remainingBalance: number,
  paymentsCompleted: number,
  nextPaymentDate: timestamp,
  status: 'active' | 'overdue' | 'completed',
  approvalDate: timestamp
}
```

**Reglas de Acceso:**
| Operación | Cliente | Asociado | Admin |
|-----------|---------|----------|-------|
| GET (propio) | ✅ | ✅ | ✅ |
| GET (otros) | ❌ | ✅ | ✅ |
| LIST (todas) | ❌ | ✅ | ✅ |
| LIST (propias) | ✅ | ✅ | ✅ |
| CREATE | ❌ | ✅ | ✅ |
| UPDATE | ❌ | ✅ | ✅ |
| DELETE | ❌ | ❌ | ✅ |

**Validaciones:**
- ✅ Estado inicial debe ser `active`
- ✅ Monto debe ser mayor a 0
- ✅ Solo asociados pueden crear préstamos activos (al aprobar solicitudes)

---

### 6. `/loan_payments/{paymentId}` - Pagos de Préstamos

**Estructura de Datos:**
```typescript
{
  id: string,
  loanId: string,
  userId: string,
  amount: number,
  paymentDate: timestamp,
  dueDate: timestamp,
  status: 'on-time' | 'late' | 'missed',
  lateFee?: number
}
```

**Reglas de Acceso:**
| Operación | Cliente | Asociado | Admin |
|-----------|---------|----------|-------|
| GET (propio) | ✅ | ✅ | ✅ |
| GET (otros) | ❌ | ✅ | ✅ |
| LIST (todas) | ❌ | ✅ | ✅ |
| LIST (propias) | ✅ | ✅ | ✅ |
| CREATE | ❌ | ✅ | ✅ |
| UPDATE | ❌ | ❌ | ✅ |
| DELETE | ❌ | ❌ | ✅ |

**Validaciones:**
- ✅ Monto debe ser mayor a 0
- ✅ Campos requeridos: loanId, userId, amount, paymentDate, dueDate, status

---

### 7. `/meetings/{meetingId}` - Reuniones

**Estructura de Datos:**
```typescript
{
  id: string,
  title: string,
  type: 'mensual' | 'extraordinaria' | 'general',
  date: timestamp,
  time: string,
  location: string,
  isVirtual: boolean,
  meetingLink?: string,
  description: string,
  fineAmount: number,
  status: 'upcoming' | 'in-progress' | 'completed' | 'cancelled',
  totalMembers: number,
  attendees: number,
  absent: number,
  createdAt: timestamp,
  createdBy: string
}
```

**Reglas de Acceso:**
| Operación | Cliente | Asociado | Admin |
|-----------|---------|----------|-------|
| GET | ✅ | ✅ | ✅ |
| LIST | ✅ | ✅ | ✅ |
| CREATE | ❌ | ✅ | ✅ |
| UPDATE | ❌ | ✅ | ✅ |
| DELETE | ❌ | ❌ | ✅ |

**Validaciones:**
- ✅ Tipo debe ser: `mensual`, `extraordinaria` o `general`
- ✅ Estado inicial debe ser `upcoming`
- ✅ Monto de multa debe ser >= 0
- ✅ Campos requeridos: title, type, date, time, location, description, fineAmount, status, totalMembers, createdAt, createdBy

---

### 8. `/meeting_attendance/{attendanceId}` - Asistencia

**Estructura de Datos:**
```typescript
{
  id: string,
  meetingId: string,
  userId: string,
  status: 'present' | 'absent' | 'late' | 'excused',
  checkInTime?: timestamp,
  notes?: string,
  fineApplied: boolean,
  fineAmount?: number
}
```

**Reglas de Acceso:**
| Operación | Cliente | Asociado | Admin |
|-----------|---------|----------|-------|
| GET (propio) | ✅ | ✅ | ✅ |
| GET (otros) | ❌ | ✅ | ✅ |
| LIST (todas) | ❌ | ✅ | ✅ |
| LIST (propias) | ✅ | ✅ | ✅ |
| CREATE | ❌ | ✅ | ✅ |
| UPDATE | ❌ | ✅ | ✅ |
| DELETE | ❌ | ❌ | ✅ |

**Validaciones:**
- ✅ Estado debe ser: `present`, `absent`, `late` o `excused`
- ✅ Campos requeridos: meetingId, userId, status, fineApplied

---

### 9. `/system_config/{configId}` - Configuración del Sistema

**Estructura de Datos:**
```typescript
{
  id: string,
  configType: 'interest_rates' | 'fees' | 'fines' | 'loan_limits' | 'general',
  data: object, // Configuración específica
  updatedAt: timestamp,
  updatedBy: string
}
```

**Reglas de Acceso:**
| Operación | Cliente | Asociado | Admin |
|-----------|---------|----------|-------|
| GET | ❌ | ✅ | ✅ |
| LIST | ❌ | ✅ | ✅ |
| CREATE | ❌ | ❌ | ✅ |
| UPDATE | ❌ | ❌ | ✅ |
| DELETE | ❌ | ❌ | ✅ |

**Tipos de Configuración:**
- `interest_rates`: Tasas de interés para préstamos
- `fees`: Cuotas de manejo y tarifas
- `fines`: Multas por inasistencia
- `loan_limits`: Límites de préstamos
- `general`: Configuración general del sistema

---

### 10. `/admin_logs/{logId}` - Logs Administrativos

**Estructura de Datos:**
```typescript
{
  id: string,
  action: string,
  performedBy: string,
  timestamp: timestamp,
  targetResource: string,
  details?: object
}
```

**Reglas de Acceso:**
| Operación | Cliente | Asociado | Admin |
|-----------|---------|----------|-------|
| GET | ❌ | ❌ | ✅ |
| LIST | ❌ | ❌ | ✅ |
| CREATE | ❌ | ✅ | ✅ |
| UPDATE | ❌ | ❌ | ❌ |
| DELETE | ❌ | ❌ | ❌ |

**Características:**
- 🔒 **Inmutables**: Los logs no se pueden modificar ni eliminar
- 📝 **Auditoría**: Registran todas las acciones administrativas
- 👤 **Trazabilidad**: Quién hizo qué y cuándo

---

### 11. `/notifications/{notificationId}` - Notificaciones

**Estructura de Datos:**
```typescript
{
  id: string,
  userId: string,
  title: string,
  description: string,
  type: 'info' | 'warning' | 'success' | 'error',
  read: boolean,
  createdAt: timestamp
}
```

**Reglas de Acceso:**
| Operación | Cliente | Asociado | Admin |
|-----------|---------|----------|-------|
| GET (propio) | ✅ | ✅ | ✅ |
| LIST (propias) | ✅ | ✅ | ✅ |
| CREATE | ❌ | ❌ | ✅ |
| UPDATE (marcar leída) | ✅ | ✅ | ✅ |
| DELETE (después 30 días) | ✅ | ✅ | ✅ |
| DELETE (cualquier momento) | ❌ | ❌ | ✅ |

**Validaciones:**
- ✅ Tipo debe ser: `info`, `warning`, `success` o `error`
- ✅ Usuario solo puede actualizar el campo `read`
- ✅ Usuario puede eliminar después de 30 días

---

## 🔧 Funciones de Seguridad

### Funciones Básicas

#### `isSignedIn()`
```javascript
function isSignedIn() {
  return request.auth != null;
}
```
Verifica que el usuario esté autenticado.

#### `isOwner(userId)`
```javascript
function isOwner(userId) {
  return isSignedIn() && request.auth.uid == userId;
}
```
Verifica que el usuario sea el propietario del recurso.

#### `isExistingOwner(userId)`
```javascript
function isExistingOwner(userId) {
  return isOwner(userId) && resource != null;
}
```
Verifica que el usuario sea propietario de un documento existente.

### Funciones Avanzadas

#### `getUserProfile()`
```javascript
function getUserProfile() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
}
```
Obtiene el perfil del usuario autenticado desde Firestore.
**⚠️ Advertencia:** Consume lecturas de Firestore.

#### `isAdmin()`
```javascript
function isAdmin() {
  return isSignedIn() && getUserProfile().role == 'admin';
}
```
Verifica que el usuario tenga rol de administrador.

#### `isAssociateOrAdmin()`
```javascript
function isAssociateOrAdmin() {
  return isSignedIn() && getUserProfile().role in ['asociado', 'admin'];
}
```
Verifica que el usuario sea asociado o administrador.

#### `isActiveUser()`
```javascript
function isActiveUser() {
  return isSignedIn() && getUserProfile().status == 'activo';
}
```
Verifica que el usuario esté activo en el sistema.

### Funciones de Validación

#### `hasRequiredFields(fields)`
```javascript
function hasRequiredFields(fields) {
  return request.resource.data.keys().hasAll(fields);
}
```
Valida que todos los campos requeridos estén presentes.

#### `matchesAuthUser()`
```javascript
function matchesAuthUser() {
  return request.resource.data.userId == request.auth.uid;
}
```
Verifica que el userId en el documento coincida con el usuario autenticado.

---

## 📝 Casos de Uso Comunes

### Caso 1: Cliente Solicita Retiro de Ahorros

**Flujo:**
1. Cliente autenticado (`isSignedIn() == true`)
2. Cliente crea documento en `/withdrawal_requests`
3. Validaciones:
   - ✅ `userId` coincide con `request.auth.uid`
   - ✅ `status` == 'pending'
   - ✅ `amount` > 0
   - ✅ Campos requeridos presentes
4. Documento creado exitosamente

**Código:**
```typescript
// Frontend
const db = getFirestore();
await addDoc(collection(db, 'withdrawal_requests'), {
  userId: currentUser.uid,
  amount: 500000,
  currentBalance: 2000000,
  requestDate: Timestamp.now(),
  scheduledDate: Timestamp.fromDate(new Date(Date.now() + 30*24*60*60*1000)),
  reason: 'Gastos médicos',
  status: 'pending'
});
```

### Caso 2: Asociado Aprueba Solicitud de Retiro

**Flujo:**
1. Asociado autenticado (`isAssociateOrAdmin() == true`)
2. Asociado actualiza documento en `/withdrawal_requests/{id}`
3. Validaciones:
   - ✅ Documento existe y `status` == 'pending'
   - ✅ Nuevo `status` en ['approved', 'rejected']
   - ✅ Campos `reviewedBy` y `reviewedAt` presentes
4. Documento actualizado exitosamente

**Código:**
```typescript
// Frontend
const requestRef = doc(db, 'withdrawal_requests', requestId);
await updateDoc(requestRef, {
  status: 'approved',
  reviewNotes: 'Aprobado - Balance suficiente',
  reviewedBy: currentUser.uid,
  reviewedAt: Timestamp.now()
});
```

### Caso 3: Admin Modifica Configuración del Sistema

**Flujo:**
1. Admin autenticado (`isAdmin() == true`)
2. Admin actualiza documento en `/system_config/{id}`
3. Validaciones:
   - ✅ Usuario tiene rol 'admin'
   - ✅ Campos `configType`, `updatedAt`, `updatedBy` presentes
4. Documento actualizado exitosamente

**Código:**
```typescript
// Frontend
const configRef = doc(db, 'system_config', 'interest_rates');
await updateDoc(configRef, {
  configType: 'interest_rates',
  data: {
    clientRate: 2.5,
    associateRate: 2.0
  },
  updatedAt: Timestamp.now(),
  updatedBy: currentUser.uid
});
```

### Caso 4: Usuario Intenta Ver Datos de Otro Usuario (DENEGADO)

**Flujo:**
1. Cliente autenticado intenta leer `/users/{otherUserId}`
2. Validación:
   - ❌ `isOwner(otherUserId)` == false
   - ❌ `isAdmin()` == false
3. **Acceso denegado**

### Caso 5: Cliente Intenta Aprobar un Préstamo (DENEGADO)

**Flujo:**
1. Cliente autenticado intenta actualizar `/loan_requests/{id}`
2. Validación:
   - ❌ `isAssociateOrAdmin()` == false
3. **Acceso denegado**

---

## 🧪 Testing de Reglas

### Configurar Emulador de Firestore

1. **Instalar Firebase Tools:**
```bash
npm install -g firebase-tools
```

2. **Inicializar emuladores:**
```bash
firebase init emulators
```

3. **Iniciar emuladores:**
```bash
firebase emulators:start
```

### Escribir Tests de Reglas

Crear archivo `firestore.test.js`:

```javascript
const { assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const firebase = require('@firebase/rules-unit-testing');

describe('Firestore Security Rules', () => {
  let db;
  let auth;

  beforeAll(async () => {
    // Inicializar con las reglas
    const projectId = 'test-project';
    await firebase.loadFirestoreRules({
      projectId,
      rules: fs.readFileSync('firestore.rules', 'utf8')
    });
  });

  // Test: Usuario puede leer su propio perfil
  test('Usuario puede leer su propio perfil', async () => {
    const db = firebase
      .initializeTestApp({ projectId: 'test', auth: { uid: 'user1' } })
      .firestore();
    
    const userDoc = db.collection('users').doc('user1');
    await assertSucceeds(userDoc.get());
  });

  // Test: Usuario NO puede leer perfil de otro
  test('Usuario NO puede leer perfil de otro', async () => {
    const db = firebase
      .initializeTestApp({ projectId: 'test', auth: { uid: 'user1' } })
      .firestore();
    
    const userDoc = db.collection('users').doc('user2');
    await assertFails(userDoc.get());
  });

  // Test: Admin puede listar usuarios
  test('Admin puede listar todos los usuarios', async () => {
    const db = firebase
      .initializeTestApp({ 
        projectId: 'test', 
        auth: { uid: 'admin1', role: 'admin' } 
      })
      .firestore();
    
    const usersCollection = db.collection('users');
    await assertSucceeds(usersCollection.get());
  });

  afterAll(async () => {
    await firebase.clearFirestoreData({ projectId: 'test' });
  });
});
```

### Ejecutar Tests

```bash
npm test
```

---

## 🚀 Despliegue

### 1. Validar Reglas Localmente

```bash
firebase emulators:start --only firestore
```

### 2. Desplegar a Firebase

```bash
# Desplegar solo las reglas
firebase deploy --only firestore:rules

# O desplegar todo el proyecto
firebase deploy
```

### 3. Verificar en Consola de Firebase

1. Ir a Firebase Console → Firestore Database
2. Click en "Rules" tab
3. Verificar que las reglas se hayan actualizado
4. Fecha de publicación debe ser reciente

### 4. Monitorear Errores de Seguridad

```bash
# Ver logs en tiempo real
firebase functions:log
```

O en Firebase Console:
- Firestore Database → Usage tab
- Ver "Security rule errors"

---

## ⚠️ Advertencias y Consideraciones

### Costos de `get()` en Reglas

Las funciones que usan `get()` como `getUserProfile()` **consumen lecturas de Firestore**.

**Optimización:**
- Minimizar uso de `get()` en reglas
- Denormalizar datos cuando sea posible
- Considerar Custom Claims para roles

### Custom Claims (Alternativa Recomendada)

En lugar de leer el rol desde Firestore, usa Custom Claims:

```javascript
// Backend (Cloud Function)
admin.auth().setCustomUserClaims(userId, { role: 'admin' });

// Reglas de Firestore
function isAdmin() {
  return request.auth.token.role == 'admin';
}
```

**Ventajas:**
- ✅ No consume lecturas de Firestore
- ✅ Más rápido
- ✅ Mejor rendimiento

**Desventajas:**
- ❌ Requiere Cloud Functions
- ❌ Los claims no se actualizan inmediatamente (requiere re-login)

### Límites de Firestore

- **Tamaño de documento**: 1 MB máximo
- **Profundidad de colección**: 100 niveles
- **Transacciones**: 500 documentos por transacción
- **Batch writes**: 500 operaciones por batch

---

## 📚 Referencias

- [Documentación oficial de Firestore Security Rules](https://firebase.google.com/docs/firestore/security/overview)
- [Guía de mejores prácticas](https://firebase.google.com/docs/firestore/security/best-practices)
- [Testing de reglas](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
- [Referencia de funciones](https://firebase.google.com/docs/reference/security/firestore)

---

## 📞 Soporte

Si encuentras problemas con las reglas de seguridad:

1. **Revisar logs de errores** en Firebase Console
2. **Probar en emulador local** antes de desplegar
3. **Consultar esta guía** para casos de uso específicos
4. **Contactar al equipo de desarrollo** para cambios críticos

---

**Última actualización:** Enero 2025  
**Versión:** 2.0  
**Autor:** Sistema FAP Development Team
