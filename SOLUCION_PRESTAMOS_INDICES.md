# ✅ Solución: Índices Compuestos en Préstamos

## 🔴 Error:
```
FirebaseError: The query requires an index.
Collection: loans
Fields: userId + createdAt
```

## ✅ Solución: Subcollections

### Cambios en Estructura:

**ANTES (requería índice):**
```
/loans/{loanId}
  - userId: "abc123"
  - amount: 500000
  - createdAt: timestamp
```

**DESPUÉS (sin índice):**
```
/users/{userId}/loans/{loanId}
  - amount: 500000
  - createdAt: timestamp
```

---

## Código Actualizado

### 1. getUserLoans() - Línea ~471
```typescript
// ANTES
query(collection(db, 'loans'), where('userId', '==', userId), orderBy('createdAt', 'desc'))

// DESPUÉS  
query(collection(db, `users/${userId}/loans`), orderBy('createdAt', 'desc'))
```

### 2. checkLoanEligibility() - Línea ~81
```typescript
// ANTES
query(collection(db, 'loans'), where('userId', '==', userId), where('status', 'in', [...]))

// DESPUÉS
query(collection(db, `users/${userId}/loans`), where('status', 'in', [...]))
```

### 3. createLoanApplication() - Línea ~199
```typescript
// ANTES
doc(collection(db, 'loans'))

// DESPUÉS
doc(collection(db, `users/${userId}/loans`))
```

### 4. Pagos atrasados - Línea ~95
```typescript
// ANTES
query(collection(db, 'loanPayments'), where('userId', '==', userId), where('status', '==', 'overdue'))

// DESPUÉS
query(collection(db, `users/${userId}/loanPayments`), where('status', '==', 'overdue'))
```

---

## Reglas de Firestore Actualizadas

```javascript
// Subcollection para préstamos
match /users/{userId}/loans/{loanId} {
  allow get: if isOwner(userId) || isAssociateOrAdmin();
  allow list: if isOwner(userId) || isAssociateOrAdmin();
  allow create: if isOwner(userId) && matchesAuthUser();
  allow update: if isOwner(userId) || isAssociateOrAdmin();
  allow delete: if isAdmin();
}

// Subcollection para pagos de préstamos
match /users/{userId}/loanPayments/{paymentId} {
  allow get, list: if isOwner(userId) || isAssociateOrAdmin();
  allow create: if isAssociateOrAdmin();
  allow update: if isAssociateOrAdmin();
  allow delete: if isAdmin();
}
```

---

## 🚀 Desplegar

```powershell
firebase deploy --only firestore:rules
```

**Fecha:** 9 de octubre de 2025  
**Estado:** ✅ Listo
