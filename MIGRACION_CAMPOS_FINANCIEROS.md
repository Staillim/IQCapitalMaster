# 🔧 Migración de Campos Financieros en Usuarios

## ⚠️ Problema

Los usuarios existentes **NO tienen** los campos de resumen financiero en su documento. Solo los **nuevos usuarios** (creados después de actualizar el código) tendrán estos campos automáticamente.

## ✅ Solución

Hay **3 formas** de agregar los campos a los usuarios existentes:

---

## Opción 1: Script Automático de Migración (Recomendado)

### Pasos:

1. **Instalar dependencias** (si aún no lo has hecho):
```bash
npm install
```

2. **Ejecutar el script de migración** (migra TODOS los usuarios):
```bash
npx tsx scripts/migrate-financial-fields.ts
```

3. **Migrar un usuario específico** (para pruebas):
```bash
npx tsx scripts/migrate-financial-fields.ts --user USER_ID_AQUI
```

### Resultado Esperado:

```
🚀 Iniciando migración de usuarios...

📊 Total de usuarios encontrados: 5

[1/5] ⏳ Migrando user123 (Juan Pérez)...
✓ Usuario user123 actualizado con campos financieros
[2/5] ⊙ user456 - Ya migrado (María García)
[3/5] ⏳ Migrando user789 (Carlos López)...
✓ Usuario user789 actualizado con campos financieros

============================================================
📈 RESUMEN DE MIGRACIÓN
============================================================
✓ Exitosos: 5
✗ Fallidos: 0
📊 Total: 5
============================================================

🎉 ¡Migración completada exitosamente!
```

---

## Opción 2: Migración Manual desde Firebase Console

Si prefieres hacerlo manualmente (para pocos usuarios):

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Firestore Database**
4. Abre la colección `users`
5. Para cada usuario, haz clic en **Editar**
6. Agrega estos campos:

```json
{
  "savingsBalance": 0,
  "totalLoans": 0,
  "activeLoans": 0,
  "currentDebt": 0,
  "totalPaid": 0,
  "creditScore": 100,
  "lastTransactionDate": [Timestamp actual]
}
```

---

## Opción 3: Dejar que se Agreguen Automáticamente

Los campos se pueden agregar automáticamente cuando:

1. **Nuevo usuario se registra** → Campos se crean automáticamente ✅
2. **Usuario hace una transacción** → Puedes llamar a `syncUserFinancialSummary()` en el código
3. **Usuario inicia sesión** → Puedes agregar lógica para verificar y crear campos si faltan

### Ejemplo: Agregar en el Login

Edita `src/firebase/provider.tsx` para agregar campos automáticamente al iniciar sesión:

```typescript
// En la función createUserProfileDocument
const unsubscribe = onAuthStateChanged(
  auth,
  async (firebaseUser) => {
    if (firebaseUser) {
      // Verificar si el usuario tiene campos financieros
      const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Si no tiene campos financieros, agregarlos
        if (userData.savingsBalance === undefined) {
          await updateDoc(doc(firestore, 'users', firebaseUser.uid), {
            savingsBalance: 0,
            totalLoans: 0,
            activeLoans: 0,
            currentDebt: 0,
            totalPaid: 0,
            creditScore: 100,
            lastTransactionDate: serverTimestamp(),
          });
          console.log('✓ Campos financieros agregados al usuario:', firebaseUser.uid);
        }
      }
    }
    setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
  },
  // ... resto del código
);
```

---

## 🎯 ¿Cuál Opción Elegir?

| Opción | Ventajas | Desventajas | Recomendado Para |
|--------|----------|-------------|------------------|
| **1. Script Automático** | Rápido, migra todos a la vez | Requiere ejecutar comando | **Usuarios existentes (5+)** ✅ |
| **2. Manual Console** | Control total, visual | Lento para muchos usuarios | Pocos usuarios (1-3) |
| **3. Automático en Login** | Sin intervención manual | Los usuarios deben iniciar sesión | Nuevo sistema en producción |

---

## 📊 Verificación Post-Migración

Después de ejecutar la migración, verifica en Firebase Console:

1. Abre Firestore Database
2. Ve a `users/{cualquier-usuario}`
3. Deberías ver estos campos:

```
users/abc123xyz
  ├─ id: "abc123xyz"
  ├─ firstName: "Juan"
  ├─ lastName: "Pérez"
  ├─ email: "juan@example.com"
  ├─ role: "cliente"
  ├─ savingsBalance: 0           ← ✅ Nuevo
  ├─ totalLoans: 0                ← ✅ Nuevo
  ├─ activeLoans: 0               ← ✅ Nuevo
  ├─ currentDebt: 0               ← ✅ Nuevo
  ├─ totalPaid: 0                 ← ✅ Nuevo
  ├─ creditScore: 100             ← ✅ Nuevo
  └─ lastTransactionDate: [...]   ← ✅ Nuevo
```

---

## 🚨 Troubleshooting

### Error: "Permission denied"

**Causa:** Las reglas de Firestore no están desplegadas.

**Solución:**
```bash
firebase deploy --only firestore:rules
```

### Error: "Module not found"

**Causa:** Falta instalar `tsx` para ejecutar TypeScript.

**Solución:**
```bash
npm install -D tsx
```

### Los campos siguen sin aparecer

**Causa:** El script se ejecutó pero hubo errores.

**Solución:** Revisa los logs del script. Si hay errores de permisos, asegúrate de:
1. Haber desplegado las reglas actualizadas
2. Ejecutar el script con credenciales de admin (si aplica)

---

## ✅ Checklist de Migración

- [ ] Desplegar reglas de Firestore (`firebase deploy --only firestore:rules`)
- [ ] Ejecutar script de migración (`npx tsx scripts/migrate-financial-fields.ts`)
- [ ] Verificar en Firebase Console que los campos existen
- [ ] Probar creando un nuevo usuario (debe tener campos automáticamente)
- [ ] Probar dashboard de asociado/cliente (debe mostrar datos)

---

## 📝 Notas Importantes

1. **Usuarios nuevos**: Automáticamente tendrán los campos ✅
2. **Usuarios existentes**: Necesitan migración manual (este script) ⚠️
3. **Sincronización**: Los campos se actualizarán automáticamente con transacciones 🔄
4. **Retrocompatibilidad**: El código actual sigue funcionando si faltan campos (usa `|| 0`) ✅

---

## 🆘 ¿Necesitas Ayuda?

Si tienes problemas con la migración:

1. Verifica que las reglas estén desplegadas
2. Revisa los logs del script
3. Verifica que tengas permisos de escritura en Firestore
4. Prueba migrando un solo usuario primero con `--user USER_ID`
