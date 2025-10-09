# IQ Capital Master - Sistema de Ahorros y Préstamos

Sistema completo de gestión para Fondos de Ahorros y Préstamos (FAP) construido con Next.js 15, Firebase y diseño moderno con animaciones.

## 🚀 Características

- ✨ **Diseño Moderno**: Interfaz con animaciones fluidas, efectos shimmer, orbes flotantes y partículas
- 🎨 **8 Gradientes de Color**: Sistema de colores categorizado para diferentes módulos
- 💰 **Módulo de Ahorros**: Gestión completa de cuentas de ahorro, depósitos y retiros
- 🏦 **Módulo de Préstamos**: Solicitud, aprobación y seguimiento de préstamos
- 📊 **Reportes y Analytics**: Dashboard con métricas financieras en tiempo real
- 👥 **3 Roles de Usuario**: Cliente, Asociado y Administrador
- 🔐 **Seguridad**: Reglas completas de Firestore con validación de permisos
- 📱 **Responsive**: Diseño adaptable a todos los dispositivos

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 15.3.3 con App Router y Turbopack
- **UI**: React 18.3.1 + TypeScript 5.7.3
- **Estilos**: Tailwind CSS con animaciones personalizadas
- **Backend**: Firebase (Auth + Firestore)
- **Componentes**: Shadcn UI con Radix UI
- **Iconos**: Lucide React
- **Deploy**: Netlify con optimizaciones para Next.js

## 📦 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/Staillim/IQCapitalMaster.git
cd IQCapitalMaster

# Instalar dependencias
npm install

# Copiar variables de entorno (opcional)
cp .env.example .env.local

# Iniciar servidor de desarrollo
npm run dev
```

El servidor estará disponible en `http://localhost:9002`

## 🔧 Configuración de Firebase

La configuración de Firebase está incluida en `src/firebase/config.ts`. No necesitas configurar variables de entorno manualmente a menos que quieras sobrescribir los valores.

### Variables de Entorno Opcionales

Si deseas usar variables de entorno en lugar de la configuración hardcoded:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_dominio.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
```

## 🌐 Deploy en Netlify

### Configuración Automática

El proyecto incluye `netlify.toml` con la configuración optimizada. Solo necesitas:

1. Conectar tu repositorio de GitHub a Netlify
2. Netlify detectará automáticamente Next.js
3. El build se ejecutará con: `npm run build`

### Configuración Manual (si es necesario)

**Build settings:**
- Build command: `npm run build`
- Publish directory: `.next`
- Node version: `20`

**Environment Variables (opcionales):**
Las variables de Firebase ya están en el código, pero puedes sobrescribirlas en Netlify:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`

## 📁 Estructura del Proyecto

```
├── src/
│   ├── app/                      # App Router de Next.js
│   │   ├── dashboard/           # Módulos del dashboard
│   │   │   ├── cliente/         # Dashboard de clientes
│   │   │   ├── asociado/        # Dashboard de asociados
│   │   │   ├── admin/           # Dashboard de administradores
│   │   │   ├── ahorros/         # Módulo de ahorros
│   │   │   ├── prestamos/       # Módulo de préstamos
│   │   │   └── reuniones/       # Módulo de reuniones
│   │   ├── register/            # Registro de usuarios
│   │   └── forgot-password/     # Recuperación de contraseña
│   ├── components/              # Componentes reutilizables
│   │   ├── ui/                  # Componentes base de UI
│   │   │   └── animated-card.tsx # Card con animaciones
│   │   └── dashboard/           # Componentes específicos
│   ├── firebase/                # Configuración de Firebase
│   │   ├── config.ts           # Credenciales de Firebase
│   │   ├── provider.tsx        # Context provider
│   │   └── firestore/          # Hooks de Firestore
│   ├── hooks/                   # Custom React hooks
│   └── lib/                     # Utilidades
├── firestore.rules              # Reglas de seguridad (810 líneas)
├── netlify.toml                # Configuración de Netlify
└── tailwind.config.ts          # Configuración de Tailwind

```

## 🎨 Animaciones Personalizadas

El proyecto incluye 8 animaciones CSS personalizadas:

- **shimmer**: Efecto de brillo deslizante (2s)
- **pulse-slow**: Pulso suave con opacidad (3s)
- **pulse-slower**: Pulso más lento (4s)
- **float**: Partículas flotantes (3s)
- **float-delay-1/2/3**: Variantes con delays
- **glow**: Resplandor dinámico (2s)
- **gradient-shift**: Cambio de gradiente (3s)

## 👥 Roles del Sistema

### Cliente
- Ver saldo y transacciones
- Solicitar préstamos
- Realizar depósitos y retiros
- Ver reuniones programadas

### Asociado
- Todo lo del Cliente, más:
- Aprobar/rechazar solicitudes de préstamos
- Gestionar reuniones
- Registrar asistencias

### Administrador
- Acceso completo al sistema
- Gestión de usuarios
- Configuración del sistema
- Reportes avanzados
- Logs de auditoría

## 🔒 Seguridad

El proyecto implementa:
- Reglas de seguridad completas en Firestore (810 líneas)
- Validación de permisos por rol
- Auditoría de acciones administrativas
- Principio de mínimo privilegio
- Validación de integridad de datos

## 📊 Módulos Principales

### Ahorros
- Cuentas de ahorro individuales
- Depósitos y retiros
- Seguimiento de contribuciones mensuales
- Historial de transacciones

### Préstamos
- Solicitud de préstamos con calculadora
- Aprobación/rechazo por asociados
- Seguimiento de pagos
- Cálculo de intereses
- Historial de préstamos

### Reuniones
- Programación de reuniones
- Control de asistencia
- Aplicación de multas
- Notificaciones

## 🚀 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Servidor de desarrollo en puerto 9002

# Build
npm run build        # Build de producción

# Producción
npm start            # Servidor de producción

# Linting
npm run lint         # Verificar código con ESLint
```

## 🐛 Solución de Problemas

### Error: "Firebase: Need to provide options"
Este error es normal durante el build y se maneja automáticamente. El sistema usa fallback a la configuración hardcoded.

### Error: "useSearchParams() should be wrapped in a suspense boundary"
Ya está solucionado con Suspense wrapper en todas las páginas que lo necesitan.

## 📝 Licencia

Este proyecto es privado y está bajo desarrollo activo.

## 👨‍💻 Desarrollo

Para contribuir al proyecto:

1. Crea una rama nueva: `git checkout -b feature/nueva-funcionalidad`
2. Haz tus cambios y commits: `git commit -m "✨ Agregar nueva funcionalidad"`
3. Push a la rama: `git push origin feature/nueva-funcionalidad`
4. Abre un Pull Request

## 📞 Soporte

Para cualquier pregunta o problema, contacta al equipo de desarrollo.

---

Desarrollado con ❤️ usando Next.js y Firebase
