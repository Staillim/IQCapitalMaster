# 🔒 Instrucciones para Desplegar Reglas de Firebase

## 📋 Resumen

Tu archivo `firestore.rules` ya está **completamente configurado** con reglas de seguridad para todo el sistema FAP. Este documento explica cómo desplegarlas a Firebase.

---

## ✅ Estado Actual

Tu archivo `firestore.rules` incluye:

- ✅ **16 colecciones protegidas** con reglas granulares
- ✅ **3 roles del sistema** (cliente, asociado, admin)
- ✅ **9 funciones de seguridad** auxiliares
- ✅ **Validaciones completas** de campos y estados
- ✅ **Auditoría y logs** inmutables
- ✅ **Principio de mínimo privilegio**

---

## 🚀 Pasos para Desplegar

### Opción 1: Consola de Firebase (Más Simple)

1. **Ir a Firebase Console:**
   - Abre tu navegador y ve a: https://console.firebase.google.com
   - Selecciona tu proyecto FAP/IQCapital

2. **Navegar a Firestore Rules:**
   - En el menú lateral, haz clic en **"Firestore Database"**
   - Ve a la pestaña **"Rules"** (Reglas)

3. **Copiar las reglas:**
   - Abre tu archivo `firestore.rules` local
   - Copia **TODO el contenido** del archivo (líneas 1-564)

4. **Pegar en la consola:**
   - Borra el contenido actual del editor en Firebase Console
   - Pega las nuevas reglas completas

5. **Publicar:**
   - Haz clic en el botón **"Publish"** (Publicar)
   - Confirma que deseas aplicar las nuevas reglas
   - ✅ ¡Listo! Las reglas están activas

---

### Opción 2: Firebase CLI (Recomendado para equipos)

#### Paso 1: Instalar Firebase CLI

```powershell
npm install -g firebase-tools
```

#### Paso 2: Iniciar sesión

```powershell
firebase login
```

Se abrirá tu navegador para autenticarte con tu cuenta de Google.

#### Paso 3: Inicializar proyecto (si no está inicializado)

```powershell
cd C:\Users\stail\Downloads\IQCapitalMaster-main\IQCapitalMaster-main
firebase init
```

**Selecciona:**
- ✅ Firestore (usa las flechas y espacio para seleccionar)
- Presiona Enter cuando te pregunte por el archivo de reglas (usa el existente: `firestore.rules`)

#### Paso 4: Desplegar solo las reglas

```powershell
firebase deploy --only firestore:rules
```

#### Verificar despliegue

```powershell
# Ver proyectos disponibles
firebase projects:list

# Ver configuración actual
firebase list
```

---

## 🔍 Verificar que las Reglas Funcionan

### 1. Verificación en Firebase Console

1. Ve a **Firestore Database → Rules**
2. Verifica que veas todas las colecciones:
   - users
   - withdrawal_requests
   - savings_transactions
   - loan_requests
   - active_loans
   - loan_payments
   - meetings
   - meeting_attendance
   - system_config
   - admin_logs
   - notifications

3. Revisa la fecha de última actualización (debe ser reciente)

### 2. Pruebas en la Aplicación

#### Como Cliente (role: "cliente")
✅ **Debe poder:**
- Ver su propio perfil
- Crear solicitudes de retiro
- Ver sus propias transacciones de ahorro
- Solicitar préstamos
- Ver reuniones programadas
- Ver su asistencia a reuniones

❌ **NO debe poder:**
- Ver perfiles de otros usuarios
- Aprobar préstamos
- Crear reuniones
- Ver configuración del sistema
- Acceder a logs administrativos

#### Como Asociado (role: "asociado")
✅ **Debe poder:**
- Todo lo que puede un cliente
- Aprobar/rechazar solicitudes de retiro
- Aprobar/rechazar solicitudes de préstamos
- Registrar transacciones de ahorro
- Crear y gestionar reuniones
- Registrar asistencia a reuniones
- Ver configuración del sistema

❌ **NO debe poder:**
- Cambiar configuración del sistema
- Eliminar usuarios
- Acceder a todos los logs (solo admin)

#### Como Admin (role: "admin")
✅ **Debe poder:**
- **TODO** lo anterior
- Listar todos los usuarios
- Cambiar roles de usuarios
- Eliminar usuarios
- Configurar sistema (tasas, cuotas, multas)
- Ver todos los logs administrativos
- Eliminar cualquier recurso

### 3. Pruebas Técnicas con Emulador (Opcional)

```powershell
# Iniciar emulador de Firestore
firebase emulators:start --only firestore

# En otra terminal, ejecuta tu app apuntando al emulador
npm run dev
```

---

## 🗂️ Estructura de Colecciones en Firestore

Después de desplegar las reglas, asegúrate de que tu Firestore tenga estas colecciones:

```
📁 Firestore Database
│
├── 👥 users
│   ├── {userId}
│   │   ├── 📁 accounts (subcollection - legacy)
│   │   ├── 📁 transactions (subcollection - legacy para reportes)
│   │   └── 🔔 notifications (subcollection - legacy)
│
├── 💰 savingsAccounts (Cuentas de ahorro)
├── 💵 savingsTransactions (Transacciones de ahorro)
├── 📊 monthlySavingsSummaries (Resúmenes mensuales)
├── 🏦 withdrawal_requests (Solicitudes de retiro)
├── � savings_transactions (Transacciones admin)
├── 📝 loan_requests
├── 🏦 active_loans
├── 💳 loan_payments
├── 🗓️ meetings
├── ✅ meeting_attendance
├── ⚙️ system_config
├── 📋 admin_logs
└── 🔔 notifications (global)
```

---

## 🔐 Matriz de Permisos por Rol

| Colección | Cliente (read) | Cliente (write) | Asociado (read) | Asociado (write) | Admin (read) | Admin (write) |
|-----------|----------------|-----------------|-----------------|------------------|--------------|---------------|
| **users** | Solo propio | Solo propio | Solo propio | Solo propio | Todos | Todos |
| **withdrawal_requests** | Solo propias | Crear/Cancelar | Todas | Aprobar/Rechazar | Todas | Todas |
| **savings_transactions** | Solo propias | ❌ | Todas | Crear | Todas | Todas |
| **loan_requests** | Solo propias | Crear | Todas | Aprobar/Rechazar | Todas | Todas |
| **active_loans** | Solo propios | ❌ | Todos | Actualizar | Todos | Todos |
| **loan_payments** | Solo propios | ❌ | Todos | Crear | Todos | Todos |
| **meetings** | Todas | ❌ | Todas | Crear/Actualizar | Todas | Todas |
| **meeting_attendance** | Solo propia | ❌ | Todas | Crear/Actualizar | Todas | Todas |
| **system_config** | ❌ | ❌ | Ver | ❌ | Ver | Crear/Actualizar |
| **admin_logs** | ❌ | ❌ | ❌ | Crear | Ver | Crear |
| **notifications** | Solo propias | Marcar leída | Solo propias | Marcar leída | Todas | Todas |

**Leyenda:**
- ✅ = Permitido
- ❌ = Denegado
- "Solo propias" = Solo documentos donde `userId == auth.uid`
- "Todas" = Todos los documentos de la colección

---

## 📝 Validaciones Implementadas

### 1. Validaciones de Campos Requeridos

Todas las colecciones validan que los campos obligatorios estén presentes:

```javascript
// Ejemplo: Crear solicitud de retiro
hasRequiredFields(['userId', 'amount', 'currentBalance', 'requestDate', 'reason', 'status'])
```

### 2. Validaciones de Estados

Las transiciones de estado están controladas:

```javascript
// Solo se puede aprobar/rechazar si está en "pending"
resource.data.status == 'pending' && request.resource.data.status in ['approved', 'rejected']
```

### 3. Validaciones de Montos

```javascript
// Los montos deben ser mayores a 0
request.resource.data.amount > 0
```

### 4. Validaciones de Propiedad

```javascript
// El userId debe coincidir con el usuario autenticado
request.resource.data.userId == request.auth.uid
```

### 5. Inmutabilidad de Logs

```javascript
// Los logs NO se pueden actualizar ni eliminar
allow update, delete: if false;
```

---

## ⚠️ Advertencias Importantes

### 1. Costo de las Reglas con `get()`

Las reglas actuales usan `get()` para obtener el perfil del usuario:

```javascript
function getUserProfile() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
}
```

**Impacto:**
- Cada operación en Firestore hace una lectura adicional al documento `/users/{userId}`
- **Costo:** 1 lectura extra por cada operación

**Solución Recomendada (Futuro):**
Implementar **Custom Claims** en Authentication:

```javascript
// En Cloud Function al crear usuario:
admin.auth().setCustomUserClaims(uid, { 
  role: 'cliente', 
  status: 'activo' 
});

// En las reglas, acceder directamente:
function isAdmin() {
  return request.auth.token.role == 'admin';
}
// ✅ Sin lecturas adicionales
```

### 2. Activación de Usuarios

Los usuarios nuevos tienen `status: 'pendiente'` por defecto. **Debes activarlos manualmente:**

1. Como admin, ve a la colección `users` en Firestore Console
2. Busca el usuario
3. Cambia `status: 'pendiente'` a `status: 'activo'`
4. Ahora el usuario puede usar el sistema

**Alternativa Automática (Cloud Function):**

```javascript
// functions/index.js
exports.activateNewUser = functions.auth.user().onCreate(async (user) => {
  await admin.firestore().collection('users').doc(user.uid).update({
    status: 'activo'
  });
});
```

### 3. Primer Admin del Sistema

Para crear el primer admin, debes hacerlo manualmente:

1. Registra un usuario normalmente
2. Ve a Firestore Console → `users` → {userId}
3. Cambia:
   - `role: 'cliente'` → `role: 'admin'`
   - `status: 'pendiente'` → `status: 'activo'`
4. Este usuario ahora tiene permisos de admin

---

## 🧪 Testing de Reglas (Opcional)

Firebase permite probar las reglas antes de desplegarlas:

```javascript
// Ejemplo de test (en consola de Firebase)
{
  "path": "/users/user123",
  "method": "get",
  "auth": {"uid": "user123"},
  "expected": "allow"
}
```

---

## 📚 Recursos Adicionales

- **Documentación oficial:** https://firebase.google.com/docs/firestore/security/get-started
- **Referencia de reglas:** https://firebase.google.com/docs/reference/rules
- **Guía de testing:** https://firebase.google.com/docs/firestore/security/test-rules-emulator
- **Best practices:** https://firebase.google.com/docs/firestore/security/rules-conditions

---

## 🆘 Solución de Problemas

### Error: "Missing or insufficient permissions"

**Causa:** Las reglas están bloqueando la operación  
**Solución:**
1. Verifica que el usuario tenga el rol correcto
2. Verifica que el usuario esté activo (`status: 'activo'`)
3. Revisa los logs de Firestore en Console → Firestore → Usage

### Error: "Document doesn't exist"

**Causa:** Intentas acceder a un documento que no existe  
**Solución:**
1. Verifica que el documento exista en Firestore
2. Las reglas de `get` requieren que el documento exista

### Error: "PERMISSION_DENIED: Missing or insufficient permissions"

**Causa:** El usuario no tiene permisos para esa operación  
**Solución:**
1. Verifica el rol del usuario en `/users/{userId}`
2. Asegúrate de que `status == 'activo'`
3. Revisa que la operación esté permitida en la matriz de permisos arriba

### Las reglas no se actualizan

**Solución:**
1. Verifica que hayas hecho clic en "Publish" en la consola
2. Si usas CLI, ejecuta: `firebase deploy --only firestore:rules`
3. Espera 1-2 minutos para que se propaguen globalmente
4. Limpia el cache del navegador (Ctrl + Shift + R)

---

## ✅ Checklist de Despliegue

Antes de dar por completado:

- [ ] Reglas desplegadas en Firebase Console
- [ ] Fecha de actualización visible en Console
- [ ] Probado como cliente (puede ver solo sus datos)
- [ ] Probado como asociado (puede aprobar solicitudes)
- [ ] Probado como admin (puede ver todo)
- [ ] Primer usuario admin creado manualmente
- [ ] Usuarios activados (`status: 'activo'`)
- [ ] Sin errores en logs de Firestore

---

## 🎯 Próximos Pasos

1. **Desplegar las reglas** siguiendo los pasos arriba
2. **Crear primer admin** manualmente en Firestore
3. **Activar usuarios** cambiando status a 'activo'
4. **Probar funcionalidades** con diferentes roles
5. **Monitorear errores** en Firebase Console → Firestore → Usage
6. **(Futuro) Implementar Custom Claims** para reducir costos

---

**Documento generado:** 9 de octubre de 2025  
**Proyecto:** IQCapital Master - FAP  
**Archivo de reglas:** `firestore.rules` (564 líneas)

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa la sección "Solución de Problemas" arriba
2. Verifica los logs en Firebase Console
3. Consulta la documentación oficial de Firebase
4. Revisa el archivo `FIRESTORE_RULES_GUIDE.md` para más detalles

---

¡Las reglas están listas para usar! 🚀🔒
