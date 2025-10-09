# 🔧 Solución: Permisos Insuficientes en Ahorros y Reportes

## ❌ Problema Identificado

Cuando un cliente intenta acceder a las páginas de **Ahorros** (`/dashboard/ahorros`) y **Reportes** (`/dashboard/reportes`), recibe el error:

```
FirebaseError: Missing or insufficient permissions
```

### Causa Raíz

Las páginas estaban intentando acceder a colecciones de Firestore que **NO estaban definidas** en las reglas de seguridad (`firestore.rules`):

1. **`savingsAccounts`** - Cuentas de ahorro de usuarios
2. **`savingsTransactions`** - Transacciones de ahorro (depósitos y retiros)
3. **`monthlySavingsSummaries`** - Resúmenes mensuales de ahorro
4. **`users/{userId}/transactions`** - Transacciones legacy (para reportes)

---

## ✅ Solución Implementada

He agregado las reglas de seguridad para **4 nuevas colecciones** en `firestore.rules`:

### 1. Colección `savingsAccounts`

Almacena las cuentas de ahorro de cada usuario.

**Permisos:**
- ✅ Usuario puede ver su propia cuenta
- ✅ Usuario puede crear su propia cuenta
- ✅ Usuario puede actualizar su propia cuenta
- ✅ Admin puede ver y modificar todas las cuentas

**Reglas añadidas:**
```javascript
match /savingsAccounts/{userId} {
  allow get: if isOwner(userId) || isAdmin();
  allow list: if isAdmin();
  allow create: if isOwner(userId) && request.resource.data.userId == userId;
  allow update: if isOwner(userId) || isAdmin();
  allow delete: if isAdmin();
}
```

---

### 2. Colección `savingsTransactions`

Almacena todas las transacciones de ahorro (depósitos, retiros, etc.).

**Permisos:**
- ✅ Usuario puede ver sus propias transacciones
- ✅ Usuario puede crear transacciones (depósitos)
- ✅ Admin puede ver y crear cualquier transacción
- ✅ Solo admin puede actualizar o eliminar transacciones

**Reglas añadidas:**
```javascript
match /savingsTransactions/{transactionId} {
  allow get: if isSignedIn() && (
    resource.data.userId == request.auth.uid 
    || isAdmin()
  );

  allow list: if isAdmin() 
              || (isSignedIn() && resource.data.userId == request.auth.uid);

  allow create: if (isSignedIn() && matchesAuthUser()) || isAdmin();
  allow update: if isAdmin();
  allow delete: if isAdmin();
}
```

---

### 3. Colección `monthlySavingsSummaries`

Almacena resúmenes mensuales de ahorros por usuario (para reportes y estadísticas).

**Permisos:**
- ✅ Usuario puede ver sus propios resúmenes
- ✅ Admin puede ver todos los resúmenes
- ✅ Solo admin puede crear/actualizar resúmenes (generación automática)

**Reglas añadidas:**
```javascript
match /monthlySavingsSummaries/{summaryId} {
  allow get: if isSignedIn() && (
    resource.data.userId == request.auth.uid 
    || isAdmin()
  );

  allow list: if isAdmin() 
              || (isSignedIn() && resource.data.userId == request.auth.uid);

  allow create, update: if isAdmin();
  allow delete: if isAdmin();
}
```

---

### 4. Subcollection `users/{userId}/transactions`

Subcollection legacy usada por la página de reportes.

**Permisos:**
- ✅ Usuario puede ver y modificar solo sus propias transacciones
- ✅ Admin puede ver y modificar todas las transacciones

**Reglas añadidas:**
```javascript
match /users/{userId}/transactions/{transactionId} {
  allow read: if isOwner(userId) || isAdmin();
  allow write: if isOwner(userId) || isAdmin();
}
```

---

## 📝 Archivos Modificados

1. **`firestore.rules`** (Líneas añadidas: ~90)
   - Agregadas 4 nuevas secciones de reglas
   - Actualizado el encabezado con documentación de las nuevas colecciones

2. **`INSTRUCCIONES_FIREBASE_RULES.md`**
   - Actualizado de 11 a 16 colecciones protegidas
   - Actualizada la estructura de colecciones en Firestore

3. **`SOLUCION_PROBLEMAS_COMUNES.md`**
   - Agregada solución para errores de colecciones faltantes
   - Instrucciones de despliegue actualizadas

---

## 🚀 Pasos para Aplicar la Solución

### Paso 1: Desplegar las Reglas Actualizadas

**Opción A: Firebase CLI** (Recomendado)
```powershell
# Desde la carpeta del proyecto
firebase deploy --only firestore:rules
```

**Opción B: Firebase Console**
1. Ve a https://console.firebase.google.com
2. Selecciona tu proyecto
3. Ve a Firestore Database → Rules
4. Copia y pega TODO el contenido de `firestore.rules`
5. Haz clic en "Publish"

---

### Paso 2: Esperar Propagación

⏱️ Las reglas pueden tardar **1-2 minutos** en propagarse globalmente.

---

### Paso 3: Verificar el Despliegue

1. **En Firebase Console:**
   - Ve a Firestore Database → Rules
   - Verifica que la fecha de "Last updated" sea reciente
   - Busca en el contenido las nuevas colecciones:
     - `savingsAccounts`
     - `savingsTransactions`
     - `monthlySavingsSummaries`

2. **En la aplicación:**
   - Cierra sesión
   - Limpia cache (Ctrl + Shift + R)
   - Vuelve a iniciar sesión

---

### Paso 4: Probar las Páginas

#### Como Cliente:

1. **Página de Ahorros** (`/dashboard/ahorros`)
   - Deberías ver tu cuenta de ahorros
   - Deberías poder registrar depósitos
   - Deberías poder solicitar retiros
   - Deberías ver el historial de transacciones

2. **Página de Reportes** (`/dashboard/reportes`)
   - Deberías ver gráficos de tus ahorros
   - Deberías ver estadísticas mensuales
   - Deberías poder exportar reportes

#### Como Admin:

- ✅ Acceso completo a todas las cuentas de ahorro
- ✅ Puede ver todas las transacciones
- ✅ Puede ver todos los resúmenes mensuales
- ✅ Puede crear/modificar/eliminar cualquier recurso

---

## 🔍 Verificar que Funciona

### Test 1: Acceder a Ahorros
1. Inicia sesión como cliente
2. Ve a `/dashboard/ahorros`
3. **Esperado:** Deberías ver tu cuenta de ahorros (puede estar vacía si es nueva)
4. **Si falla:** Verifica en la consola del navegador (F12) el error exacto

### Test 2: Acceder a Reportes
1. Inicia sesión como cliente
2. Ve a `/dashboard/reportes`
3. **Esperado:** Deberías ver gráficos y estadísticas
4. **Si falla:** Verifica que las reglas estén desplegadas

### Test 3: Crear Transacción
1. En la página de Ahorros
2. Intenta registrar un depósito
3. **Esperado:** La transacción se crea correctamente
4. **Si falla:** Verifica los permisos de `savingsTransactions`

---

## 📊 Estado Actual de las Reglas

### Total de Colecciones Protegidas: 16

| # | Colección | Propósito | Acceso Cliente | Acceso Admin |
|---|-----------|-----------|----------------|--------------|
| 1 | `users` | Perfiles de usuario | Solo propio | Todos |
| 2 | `savingsAccounts` | Cuentas de ahorro | Solo propia | Todas ✨ NUEVO |
| 3 | `savingsTransactions` | Transacciones de ahorro | Solo propias | Todas ✨ NUEVO |
| 4 | `monthlySavingsSummaries` | Resúmenes mensuales | Solo propios | Todos ✨ NUEVO |
| 5 | `withdrawal_requests` | Solicitudes de retiro | Solo propias | Todas |
| 6 | `savings_transactions` | Transacciones (admin) | Solo propias | Todas |
| 7 | `loan_requests` | Solicitudes de préstamos | Solo propias | Todas |
| 8 | `active_loans` | Préstamos activos | Solo propios | Todos |
| 9 | `loan_payments` | Pagos de préstamos | Solo propios | Todos |
| 10 | `meetings` | Reuniones | Todas (lectura) | Todas |
| 11 | `meeting_attendance` | Asistencia | Solo propia | Todas |
| 12 | `system_config` | Configuración | ❌ | Solo lectura |
| 13 | `admin_logs` | Logs administrativos | ❌ | Solo admin |
| 14 | `notifications` | Notificaciones | Solo propias | Todas |
| 15 | `reports` | Reportes generados | Solo propios | Todos |
| 16 | `users/{id}/transactions` | Transacciones legacy | Solo propias | Todas ✨ NUEVO |

---

## ⚠️ Notas Importantes

### 1. Estructura de Datos

Las páginas de Ahorros y Reportes usan una estructura diferente a la del panel de Admin:

**Admin usa:**
- `withdrawal_requests`
- `savings_transactions`

**Cliente usa:**
- `savingsAccounts`
- `savingsTransactions`
- `monthlySavingsSummaries`

Ambas estructuras son válidas y coexisten.

---

### 2. Creación Automática de Documentos

La primera vez que un usuario accede a `/dashboard/ahorros`:
- Se crea automáticamente su documento en `savingsAccounts`
- Con balance inicial de $0
- Con estado "activo"

**Código relevante:**
```typescript
// src/lib/savings-service.ts
export async function getOrCreateSavingsAccount(userId: string): Promise<SavingsAccount> {
  const accountRef = doc(db, SAVINGS_ACCOUNTS_COLLECTION, userId);
  const accountSnap = await getDoc(accountRef);
  
  if (!accountSnap.exists()) {
    // Crear nueva cuenta
    const newAccount: SavingsAccount = {
      userId,
      balance: 0,
      status: 'activo',
      createdAt: Timestamp.now(),
      // ...
    };
    await setDoc(accountRef, newAccount);
  }
  
  return accountSnap.data() as SavingsAccount;
}
```

---

### 3. Sincronización de Datos

Si un usuario tiene transacciones en ambas estructuras:
- **NO hay sincronización automática** entre `savings_transactions` y `savingsTransactions`
- Son dos sistemas independientes
- Esto es normal durante la fase de desarrollo

---

## 🆘 Si Todavía No Funciona

### Checklist de Diagnóstico:

- [ ] ¿Desplegaste las reglas actualizadas?
- [ ] ¿La fecha de "Last updated" en Firebase Console es reciente?
- [ ] ¿Esperaste 1-2 minutos después de desplegar?
- [ ] ¿Cerraste sesión y volviste a entrar?
- [ ] ¿Limpiaste el cache del navegador? (Ctrl + Shift + R)
- [ ] ¿El usuario tiene `status: 'activo'` en su perfil?
- [ ] ¿El documento `/users/{userId}` existe?
- [ ] ¿Revisaste la consola del navegador (F12) para ver el error exacto?

---

### Ver el Error Exacto:

1. Abre DevTools (F12)
2. Ve a la pestaña Console
3. Intenta acceder a Ahorros o Reportes
4. Copia el error completo que aparece en rojo
5. Busca la línea que dice `"path":` - ese es el recurso que está fallando

**Ejemplo:**
```json
{
  "path": "/databases/(default)/documents/savingsAccounts/J3B5YF4wPMT...",
  "method": "get"
}
```

Si el path es diferente a `savingsAccounts`, `savingsTransactions` o `monthlySavingsSummaries`, repórtalo.

---

## 📞 Información para Reportar Problemas

Si el error persiste después de seguir todos los pasos, incluye:

1. **UID del usuario:**
   ```
   J3B5YF4wPMTBOOcTD9Gkibd6JV12
   ```

2. **Path exacto que falla:**
   ```
   /databases/(default)/documents/savingsAccounts/...
   ```

3. **Método HTTP:**
   ```
   "method": "get" / "list" / "create"
   ```

4. **Captura de pantalla de Firebase Console:**
   - Mostrando la sección de Rules
   - Con la fecha de última actualización visible

5. **Captura de la consola del navegador:**
   - Error completo en rojo

---

**Documento creado:** 9 de octubre de 2025  
**Archivo de reglas:** `firestore.rules` (677 líneas)  
**Colecciones protegidas:** 16 (+5 nuevas)

---

¡Las reglas están actualizadas y listas! 🚀🔒
