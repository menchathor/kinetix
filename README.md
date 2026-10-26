# Kinetix • Entrenamiento & Recomposición

PWA **local-first**, *mobile-first* y offline para seguimiento de entrenamiento de fuerza en máquinas, descanso activo, nutrición y evolución corporal.

> **v1.17** — Tema claro por defecto con modo oscuro opcional, tipografía móvil más legible, controles homogéneos, steppers de series con iconos SVG, borrado de series extra con deshacer y sincronización local-first segura.

---

## 🚀 Características

### Entrenamiento
- Rutina de 4 días (Torso 1, Pierna 1, Torso 2, Pierna 2) con 3 días de descanso activo.
- 22 máquinas de fuerza + cardio finisher, con infografías en WebP, ajuste de asiento y claves técnicas.
- Registro de series, peso (kg/placa) y reps con steppers simétricos y botones `+` / `-` de tamaño consistente.
- Las series agregadas por error se pueden eliminar con **Deshacer**; las series base de la rutina quedan protegidas.
- Referencia automática de la marca anterior y sugerencia de **sobrecarga progresiva** (“Smart Coach”).
- Historial editable, duración de sesión y borrado con confirmación.

### Interfaz
- **Tema claro por defecto** y modo oscuro opcional desde Ajustes.
- Etiquetas móviles con un mínimo de 11 px y campos de formulario con altura consistente.
- Iconos SVG en las acciones de las series (menos, más, check, papelera).

### Descanso
- Temporizador flotante con presets, `+15 s`, pausa y barra de progreso.
- Resiste bloqueo de pantalla (timestamp + Wake Lock), se restaura al recargar y notifica al terminar.
- Audio con Web Audio API, vibración y notificación del sistema cuando la pestaña está oculta.

### Nutrición
- Macros objetivo, pauta clínica y 4 comidas con equivalencias.
- Seguimiento diario de **medicación, hidratación y comidas**.
- Se sincroniza por día y se restaura en otros dispositivos.

### Evolución
- Gráficas de peso (Chart.js) y de sobrecarga por máquina.
- Comparativa de recomposición calculada desde las mediciones (sin valores hardcodeados).
- Registro de bioimpedancia (InBody / báscula hogar), notas y borrado.
- Perfil clínico y metas editables desde Ajustes.

### PWA / Offline
- Service Worker con precache del shell, CSS, Chart.js local, módulos y todas las ilustraciones (≈1,4 MB).
- Sin CDNs en runtime: Tailwind compilado y Chart.js fijado a una versión local.
- Instalable en Android/iOS, con `manifest` completo y atajos.

### Nube
- Convex como respaldo opcional, protegido por **clave de sincronización**.
- Merge *last-write-wins* por `updatedAt` (nunca “la nube pisa lo local” a ciegas).
- **Tombstones** para que una eliminación hecha offline no resucite.
- Pull paginado del historial completo, nutrición y perfil.
- Respaldo/restauración JSON con entrenamientos, mediciones, nutrición, perfil y pesos.

---

## 🧱 Arquitectura

```
index.html                 Shell + variables CSS + tema sin FOUC
sw.js                      Service Worker (network-first código / cache-first assets)
manifest.json              PWA
assets/
  css/tailwind.css         Tailwind compilado (no editar a mano)
  css/input.css            Fuente de Tailwind + utilidades custom
  vendor/chart.umd.min.js  Chart.js 4.4.7 fijado
  images/*.webp            Ilustraciones optimizadas
js/
  app.js                   Router SPA, tema, timer UI, auto-sync, SW
  state.js                 Estado global y sesión activa
  config.js                URL Convex, versión, unidad, logger
  data/initialData.js      Rutinas, nutrición y perfil por defecto
  services/
    db.js                  localStorage + espejo IndexedDB + sync
    convex.js              Cliente HTTP de Convex con clave
    merge.js               Merge puro y testeable
    timer.js               Temporizador resiliente
  modules/
    workout.js             Controlador del entreno
    workout-render.js      Plantillas del entreno
    workout-utils.js       Helpers compartidos
    nutrition.js           Guía + seguimiento diario
    analytics.js           Gráficas y mediciones
    settings.js            Perfil, clave, sync, backup
  utils/escape.js          Escape HTML / URLs seguras
  ui/toast.js              Toasts + confirmaciones accesibles
convex/
  schema.ts                Tablas e índices
  lib/auth.ts              Validación de la clave
  workouts.ts measurements.ts nutrition.ts sync.ts profile.ts
  _generated/              Generado por Convex (no editar)
tests/                     Tests con node:test
```

---

## 🛠️ Desarrollo

Requisitos: Node 20+.

```bash
npm install
npm run dev          # http://localhost:8080
npm run build:css    # recompila assets/css/tailwind.css
npm test             # tests de merge/escape
npm run lint         # ESLint
npm run check        # lint + tests
```

El servidor de desarrollo es un script propio sin dependencias (`scripts/dev-server.mjs`).

### Convex

```bash
npx convex dev       # desarrollo: empuja schema/funciones
npx convex deploy    # producción
```

Configura la clave de sincronización **en el deployment**, nunca en el repositorio:

```bash
npx convex env set KINETIX_SYNC_KEY "<clave-larga-y-aleatoria>"
```

Luego abre **Ajustes → Clave de Sincronización** y pégala en cada dispositivo. Sin clave, la app funciona 100% local y no toca la nube.

> La clave compartida cierra el acceso anónimo a los datos, pero **no es un sistema multiusuario**. Si el proyecto se abre a más personas, migrar a Convex Auth con ownership por usuario.

### Privacidad

- Los datos personales (perfil, mediciones, entrenamientos, nutrición) viven en `localStorage`, en el espejo IndexedDB y —si configuras la clave— en Convex.
- El repositorio ya no incluye el nombre, la condición clínica ni el historial de mediciones del usuario.
- El contenido de la guía nutricional sigue siendo específico del plan; si el repo se vuelve público para terceros, conviene parametrizarlo.
- El respaldo JSON contiene datos de salud: trátalo como un archivo sensible.

---

## 🔄 Flujo de sincronización

1. **Pull** de entrenamientos (paginado), mediciones, pesos, nutrición y perfil.
2. **Merge** por `updatedAt`; en empate gana local. Los tombstones bloquean registros borrados.
3. **Push** sólo de lo que cambió o no existe en la nube, más las eliminaciones pendientes.
4. Persistencia local + espejo IndexedDB + `navigator.storage.persist()`.

Esto evita dos fallos clásicos: pisar cambios offline con una nube vieja y resucitar registros eliminados.

---

## 🧪 Calidad

- `node:test` para merge, normalización, tombstones y escape.
- ESLint flat config.
- GitHub Actions: lint, tests y verificación de que el CSS compilado esté actualizado.
- Sin frameworks ni build de JS: módulos ES nativos, fáciles de inspeccionar y cachear.

---

## 📱 Instalación

- **Android / Chrome:** abrir la URL, menú ⋮ → “Instalar aplicación”.
- **iPhone / Safari:** Compartir → “Agregar a pantalla de inicio”.

---

## 📌 Limitaciones conocidas

- La autenticación es una clave compartida, no cuentas por usuario.
- El espejo IndexedDB es de recuperación; la fuente rápida sigue siendo `localStorage`.
- El contenido nutricional y clínico es una guía personal, no un consejo médico.
- Si cambias de unidad (kg/lb), los valores históricos no se convierten automáticamente: la app trabaja en **kg/placa**.

---

## 📄 Licencia

ISC.
