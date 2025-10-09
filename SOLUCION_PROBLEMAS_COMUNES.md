# 🔧 Solución de Problemas Comunes

## ❌ Error: "Missing or insufficient permissions"

### Problema 1: Usuario Nuevo No Puede Acceder

**Error típico:**
```
FirebaseError: Missing or insufficient permissions
path: "/databases/(default)/documents/meetings"
```

**Causa:** El perfil del usuario no se creó correctamente en Firestore.

**Solución:**

1. **Verificar que el perfil existe en Firestore:**
   - Ve a Firebase Console → Firestore Database
   - Busca la colección `users`
   - Verifica que existe un documento con el UID del usuario
   - El documento debe tener estos campos:
     ```json
     {
       "id": "J3B5YF4wPMTBOOcTD9Gkibd6JV12",
       "email": "usuario@ejemplo.com",
       "firstName": "Harry",
       "lastName": "Vasque",
       "name": "Harry Vasque",
       "phone": "+123456789",
       "role": "cliente",
       "status": "activo",
       "registrationDate": Timestamp,
       "photoURL": ""
     }
     ```

2. **Si el documento NO existe, créalo manualmente:**
   - En Firestore Console, haz clic en "Add Document"
   - Collection ID: `users`
   - Document ID: Usa el UID del usuario (por ejemplo: `J3B5YF4wPMTBOOcTD9Gkibd6JV12`)
   - Agrega estos campos:
     - `id` (string): El UID del usuario
     - `email` (string): El email del usuario
     - `firstName` (string): Nombre
     - `lastName` (string): Apellido
     - `name` (string): Nombre completo
     - `phone` (string): Teléfono
     - `role` (string): `"cliente"` (o `"asociado"` o `"admin"`)
     - `status` (string): `"activo"`
     - `registrationDate` (timestamp): Fecha actual
     - `photoURL` (string): `""`

3. **Si el documento existe pero el status es 'pendiente':**
   - Haz clic en el documento del usuario
   - Edita el campo `status`
   - Cambia de `"pendiente"` a `"activo"`
   - Guarda

4. **Recargar la aplicación:**
   - Cierra sesión en la app
   - Vuelve a iniciar sesión
   - Ahora debería funcionar

---

### Problema 2: Usuario Admin No Puede Acceder

**Error típico:**
```
FirebaseError: Missing or insufficient permissions
Usuario admin no puede ver panel de administración
```

**Causa:** El usuario no tiene el rol correcto en su documento.

**Solución:**

1. **Verificar el rol en Firestore:**
   - Ve a Firebase Console → Firestore Database
   - Busca la colección `users`
   - Encuentra el documento del usuario admin
   - Verifica que `role` sea `"admin"` (no "cliente" ni "asociado")

2. **Cambiar el rol a admin:**
   - Haz clic en el documento del usuario
   - Edita el campo `role`
   - Cambia a `"admin"`
   - Asegúrate también que `status` sea `"activo"`
   - Guarda

3. **Recargar la aplicación:**
   - Cierra sesión
   - Vuelve a iniciar sesión como admin
   - Ahora tendrás acceso completo

---

## ❌ Error: Colección "reuniones" No Encontrada

**Error típico:**
```
FirebaseError: Missing or insufficient permissions
path: "/databases/(default)/documents/reuniones"
path: "/databases/(default)/documents/savingsAccounts"
path: "/databases/(default)/documents/savingsTransactions"
```

**Causa:** El código estaba usando nombres de colecciones que no estaban en las reglas.

**Solución:** ✅ **YA CORREGIDO** en los archivos:
- `src/app/dashboard/cliente/page.tsx` - "reuniones" → "meetings"
- `src/app/dashboard/reuniones/page.tsx` - "reuniones" → "meetings"
- `firestore.rules` - Agregadas reglas para:
  - `savingsAccounts`
  - `savingsTransactions`
  - `monthlySavingsSummaries`
  - `users/{userId}/transactions` (subcollection)

Si el error persiste:
1. **Desplegar las reglas actualizadas:**
   ```powershell
   firebase deploy --only firestore:rules
   ```
   O copiar y pegar el contenido de `firestore.rules` en Firebase Console

2. **Esperar 1-2 minutos** para que se propaguen las reglas

3. **Cerrar sesión y volver a entrar** en la aplicación

4. **Limpiar cache:** Ctrl + Shift + R para recargar forzadamente

5. **Verificar en Firebase Console:**
   - Ve a Firestore Database → Rules
   - Verifica que la fecha de "Last updated" sea reciente
   - Busca en el contenido las nuevas colecciones: `savingsAccounts`, `savingsTransactions`

---

## ❌ Error: "Cannot read properties of null"

**Error típico:**
```
TypeError: Cannot read properties of null (reading 'role')
TypeError: Cannot read properties of null (reading 'status')
```

**Causa:** El código intenta acceder a propiedades del usuario antes de que cargue.

**Solución:** Verifica que uses los hooks correctamente:

```typescript
const { user, isUserLoading } = useUser();

if (isUserLoading) {
  return <div>Cargando...</div>;
}

if (!user) {
  return <div>No hay usuario autenticado</div>;
}

// Ahora puedes usar user.uid, etc.
```

---

## ❌ Reglas de Firestore No Se Actualizan

**Síntoma:** Cambias las reglas pero siguen fallando los permisos.

**Solución:**

1. **Verificar que se desplegaron:**
   - Ve a Firebase Console → Firestore Database → Rules
   - Verifica la fecha de "Last updated"
   - Debe ser reciente

2. **Si usas Firebase CLI:**
   ```powershell
   firebase deploy --only firestore:rules
   ```

3. **Esperar propagación:**
   - Las reglas pueden tardar 1-2 minutos en propagarse
   - Cierra sesión, espera 1 minuto, vuelve a iniciar sesión

4. **Limpiar cache del navegador:**
   - Ctrl + Shift + R para recargar forzadamente
   - O abre ventana de incógnito

---

## ❌ Error: "Document doesn't exist" en getUserProfile()

**Error típico:**
```
Error in rules: get() returned null
Missing or insufficient permissions
```

**Causa:** Las reglas usan `get()` para obtener el perfil del usuario, pero el documento no existe.

**Solución:** ✅ **YA CORREGIDO** - Las reglas de `meetings` ahora solo requieren `isSignedIn()` en lugar de `isActiveUser()`.

Si el error persiste en otras colecciones:
1. Asegúrate de que el documento del usuario existe en `/users/{userId}`
2. Verifica que el documento tenga los campos `role` y `status`
3. Considera desplegar las reglas actualizadas

---

## 🔄 Proceso Completo de Registro de Usuario

Para que un usuario nuevo funcione correctamente:

### 1. Durante el Registro (Automático)
- ✅ Usuario se registra en Firebase Authentication
- ✅ Se guarda `registrationData` en sessionStorage
- ✅ Se crea documento en `/users/{userId}` con:
  - role: "cliente"
  - status: "activo"
  - Datos del formulario de registro

### 2. Verificación Manual (Si falla el automático)
- ⚠️ Si el usuario no puede acceder después de registrarse
- Ve a Firestore Console → `users` collection
- Verifica que existe el documento
- Si no existe, créalo manualmente (ver arriba)

### 3. Activación (Si status='pendiente')
- Si el usuario está en status "pendiente"
- Admin debe cambiarlo a "activo" en Firestore Console
- Usuario debe cerrar sesión y volver a entrar

---

## 📝 Checklist de Verificación Rápida

Cuando un usuario tiene problemas de permisos:

- [ ] ¿El usuario está autenticado? (Firebase Auth)
- [ ] ¿Existe el documento en `/users/{userId}`? (Firestore)
- [ ] ¿El documento tiene campo `role`? (cliente/asociado/admin)
- [ ] ¿El documento tiene campo `status`? (debe ser "activo")
- [ ] ¿Las reglas de Firestore están desplegadas?
- [ ] ¿La fecha de actualización de reglas es reciente?
- [ ] ¿El usuario cerró sesión y volvió a entrar?
- [ ] ¿Se limpió el cache del navegador?

---

## 🆘 Si Nada Funciona

### Reinicio Completo:

1. **Cerrar sesión en la app**

2. **Eliminar el usuario de Authentication:**
   - Firebase Console → Authentication → Users
   - Encuentra el usuario y elimínalo

3. **Eliminar el documento de Firestore:**
   - Firebase Console → Firestore → users
   - Encuentra el documento y elimínalo

4. **Registrarse de nuevo:**
   - Usa un email nuevo o espera unos minutos
   - Registra el usuario desde cero
   - Verifica inmediatamente en Firestore que se creó el documento

5. **Verificar manualmente:**
   - Abre Firestore Console
   - Verifica que el documento en `users` tiene:
     - role: "cliente"
     - status: "activo"
   - Si no, edítalo manualmente

---

## 🔍 Ver Logs de Error

### En el Navegador:
1. Abre DevTools (F12)
2. Ve a la pestaña Console
3. Busca errores en rojo
4. Copia el path exacto que está fallando

### En Firebase Console:
1. Ve a Firestore Database → Usage
2. Mira la sección "Security Rules Evaluations"
3. Verás qué reglas están bloqueando las peticiones

---

## 📞 Información de Debug Útil

Cuando reportes un problema, incluye:

1. **UID del usuario:**
   - Se ve en el error: `"uid": "J3B5YF4wPMTBOOcTD9Gkibd6JV12"`

2. **Path que está fallando:**
   - Ejemplo: `/databases/(default)/documents/meetings`

3. **Método HTTP:**
   - `"method": "list"` o `"get"` o `"create"`, etc.

4. **Captura de pantalla de Firestore Console:**
   - Mostrando el documento en `/users/{userId}`

5. **Fecha de última actualización de reglas:**
   - Se ve en Firestore Console → Rules

---

**Última actualización:** 9 de octubre de 2025  
**Versión de las reglas:** firestore.rules (564 líneas)
