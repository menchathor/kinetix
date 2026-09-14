# Smart Fit Tracker • Michael Meneses Mora

Aplicación web progresiva (**PWA**) modular y *Mobile-First* para el seguimiento del entrenamiento en Smart Fit, registro de sobrecarga progresiva, temporizador de descanso, plan nutricional clínico (hipotiroidismo medicado) y analíticas de evolución corporal.

---

## 🚀 Características Principales

1. **Entrenamiento en Vivo & Registro (Logging):**
   - Rutina de 4 días estructurada (Torso 1, Pierna 1, Torso 2, Pierna 2).
   - Infografías anatómicas vectoriales integradas para cada máquina.
   - Ajustes de asiento, postura y claves técnicas paso a paso.
   - Registro de series, peso (placas/libras) y repeticiones con botones rápidos `+` / `-`.
   - Consulta automática de tu marca anterior (ej: *«Base: 40 lb x 10 reps»*).

2. **Temporizador de Descanso Inteligente:**
   - Temporizador flotante con presets (60s, 90s, 120s) y botón `+15s`.
   - Se activa automáticamente al marcar una serie como completada.
   - Alerta con sonido (*Web Audio API*) y vibración háptica al finalizar.

3. **Nutrición & Hábitos Diarios:**
   - Checklist clínico de Levotiroxina (06:30 - 07:00) en ayunas.
   - Contador visual interactivo de hidratación (meta: 3.0 Litros).
   - Desglose detallado de las 4 comidas del plan (Desayuno con palta/pavo, Almuerzo, Pre-entreno sin grasas, Cena post-entreno con recarga de glucógeno).

4. **Evolución & Gráficas (Chart.js):**
   - Gráfica de evolución de peso y grasa visceral hacia la meta de recomposición (72 - 74 kg).
   - Gráfica de sobrecarga progresiva por máquina.
   - Modal para registrar nuevas mediciones de peso y contorno de cintura (cm).

5. **Modo Local-First & Conector Cloud:**
   - Funciona 100% offline dentro de Smart Fit con Service Worker.
   - Conector listo para sincronizar con **Supabase** o **Firebase** en la pestaña de Ajustes.
   - Descarga y restauración de copias de seguridad en formato `.json`.

---

## 📱 Probar en Red Local (Celular y PC)

El servidor local ya se encuentra activo en tu red:

* **En tu computadora:** Abre [http://localhost:8080](http://localhost:8080)
* **En tu celular (mismo Wi-Fi):** Abre `http://192.168.1.104:8080`

Para instalarla en tu teléfono:
* En **iPhone (Safari):** Toca el botón de Compartir y selecciona *«Agregar a pantalla de inicio»*.
* En **Android (Chrome):** Toca los tres puntos arriba a la derecha y selecciona *«Instalar aplicación»* o *«Agregar a la pantalla principal»*.

---

## 🌐 Despliegue en GitHub Pages (Paso a Paso)

Para acceder desde cualquier lugar del mundo sin estar en el mismo Wi-Fi:

1. **Crea un repositorio nuevo en GitHub** (público o privado):
   - Por ejemplo, nómbralo: `smartfit-tracker`
2. **Conecta y sube el código:**
   ```powershell
   git init
   git add .
   git commit -m "feat: initial commit Smart Fit Tracker PWA"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/smartfit-tracker.git
   git push -u origin main
   ```
3. **Activar GitHub Pages:**
   - En tu repositorio de GitHub, ve a **Settings** > **Pages**.
   - En *Build and deployment > Source*, selecciona **Deploy from a branch**.
   - Selecciona la rama `main` y la carpeta `/ (root)`, luego pulsa **Save**.
   - En 1 minuto tendrás tu enlace HTTPS público: `https://TU_USUARIO.github.io/smartfit-tracker/`
