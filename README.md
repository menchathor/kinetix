# Kinetix • Michael Meneses Mora

Aplicación web progresiva (**PWA**) modular y *Mobile-First* para el seguimiento del entrenamiento de fuerza en máquinas, registro de sobrecarga progresiva, temporizador de descanso, plan nutricional clínico (hipotiroidismo medicado) y analíticas de evolución corporal.

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
   - Paleta dinámica con soporte de **Modo Claro** y **Modo Oscuro**.

5. **Modo Local-First & Conector Cloud:**
   - Funciona 100% offline en el gimnasio con Service Worker.
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

## 🌐 Enlace Oficial en Vivo (GitHub Pages)

La aplicación se encuentra publicada y disponible públicamente bajo **HTTPS seguro** en:

👉 **[https://menchathor.github.io/kinetix/](https://menchathor.github.io/kinetix/)**

* **En tu teléfono Android (Chrome):** Abre el enlace, pulsa los 3 puntos arriba a la derecha y selecciona **«Instalar aplicación»** (o acepta el banner flotante). Se instalará como app nativa a pantalla completa sin barras del navegador.
* **En tu iPhone (Safari):** Abre el enlace, pulsa el botón Compartir y selecciona **«Agregar a pantalla de inicio»**.
* **Repositorio de código:** [https://github.com/menchathor/kinetix](https://github.com/menchathor/kinetix)
