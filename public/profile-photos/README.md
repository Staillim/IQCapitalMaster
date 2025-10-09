# Profile Photos

Esta carpeta está disponible para almacenar fotos de perfil localmente si se necesita.

## Implementación Actual

Actualmente, las fotos de perfil se guardan como **base64** directamente en Firestore en el campo `photoURL` del documento del usuario.

### Ventajas de base64:
- ✅ No requiere Firebase Storage
- ✅ Carga instantánea (no hay solicitud HTTP extra)
- ✅ Funciona offline con Firestore cache
- ✅ Más simple de implementar

### Limitaciones:
- ⚠️ Tamaño máximo recomendado: 1MB por imagen
- ⚠️ Afecta el tamaño del documento en Firestore
- ⚠️ No ideal para imágenes muy grandes

## Uso Futuro (Opcional)

Si en el futuro deseas guardar las imágenes como archivos en lugar de base64, puedes:

1. Usar esta carpeta para almacenar las imágenes
2. Guardar las imágenes con el patrón: `{userId}.jpg` o `{userId}_{timestamp}.jpg`
3. Referenciar la ruta en Firestore: `/profile-photos/{userId}.jpg`

## Ejemplo de estructura:
```
public/
  profile-photos/
    user123.jpg
    user456.png
    user789.jpg
```
