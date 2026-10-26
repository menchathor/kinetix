// Módulo de Rutina de Entrenamiento, Guía Visual y Registro en Vivo
import { INITIAL_DATA } from '../data/initialData.js';
import { state } from '../state.js';
import { db } from '../services/db.js';
import { timer } from '../services/timer.js';
import { escapeHtml } from '../utils/escape.js';
import { showToast, confirmAction } from '../ui/toast.js';
import { icon } from '../ui/icons.js';

import { renderStaticExerciseCard, renderStaticCardioCard, renderLiveExerciseCard, renderLiveCardioCard, renderCompletedExerciseCard, renderWeeklyScheduleSelector, renderRestDayScreen } from './workout-render.js';
import { getExerciseDefinition, restSeconds } from './workout-utils.js';

let undoToastRemove = null;

function getWeekStart(dateLike) {
  if (!dateLike) return null;
  const value = typeof dateLike === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateLike)
    ? new Date(`${dateLike}T12:00:00`)
    : new Date(dateLike);
  if (Number.isNaN(value.getTime())) return null;
  const day = (value.getDay() + 6) % 7; // lunes = 0
  value.setDate(value.getDate() - day);
  value.setHours(0, 0, 0, 0);
  return value;
}

// Racha semanal: semanas consecutivas con al menos una sesión guardada.
function computeWeeklyStreak(logs) {
  const counts = new Map();
  (logs || []).forEach((log) => {
    const start = getWeekStart(log?.date || log?.startTime || log?.endTime);
    if (!start) return;
    const key = start.getTime();
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const thisWeek = getWeekStart(new Date());
  const thisWeekKey = thisWeek.getTime();
  let cursor = thisWeekKey;
  if (!counts.get(cursor)) cursor -= weekMs;

  let weeks = 0;
  while ((counts.get(cursor) || 0) > 0) {
    weeks += 1;
    cursor -= weekMs;
  }

  const dots = [];
  for (let i = 6; i >= 0; i -= 1) {
    dots.push((counts.get(thisWeekKey - i * weekMs) || 0) > 0);
  }

  return { weeks, currentWeekCount: counts.get(thisWeekKey) || 0, dots };
}

function renderWeeklyStreak(streak) {
  const weekLabel = streak.weeks === 1 ? 'semana' : 'semanas';
  const sessionLabel = streak.currentWeekCount === 1 ? 'sesión' : 'sesiones';
  return `
    <div class="bg-[var(--card)] rounded-2xl p-3 border border-[var(--border)] shadow-xs flex items-center justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <span class="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/25 flex items-center justify-center shrink-0">
          ${icon('flame', 'w-5 h-5')}
        </span>
        <div class="min-w-0">
          <p class="text-[13px] font-bold text-[var(--foreground)] truncate">
            ${streak.weeks === 0 ? 'Empieza tu racha' : `Racha: ${streak.weeks} ${weekLabel}`}
          </p>
          <p class="text-[12px] text-[var(--muted-foreground)] truncate">
            ${streak.weeks === 0 ? 'Completa tu primera sesión' : `${streak.currentWeekCount} ${sessionLabel} esta semana`}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-1 shrink-0" role="img" aria-label="Últimas 7 semanas: ${streak.dots.map(d => d ? 'con sesión' : 'sin sesión').join(', ')}">
        ${streak.dots.map(active => `<span class="w-2 h-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-[var(--border)]'}"></span>`).join('')}
      </div>
    </div>
  `;
}

export function renderWorkoutModule(container, preserveScroll = false) {
  const previousScrollY = window.scrollY;
  const isLive = !!state.activeWorkout;
  const profile = db.getProfile();
  const streak = computeWeeklyStreak(db.getWorkoutLogs());
  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const todayName = daysOfWeek[new Date().getDay()];
  const currentDayId = isLive ? state.activeWorkout.routineId : state.selectedDay;
  const isRestDay = !isLive && INITIAL_DATA.restDays && !!INITIAL_DATA.restDays[currentDayId];

  // Si se ha seleccionado un día de descanso y no hay entrenamiento en vivo, mostrar pantalla de descanso
  if (isRestDay) {
    const restDay = INITIAL_DATA.restDays[currentDayId];
    container.innerHTML = `
      <div class="space-y-4 max-w-3xl mx-auto pb-24">
        <!-- Selector Semanal con indicador HOY -->
        ${renderWeeklyScheduleSelector(currentDayId, todayName)}

        <!-- Pantalla Divertida de Descanso & Regeneración -->
        ${renderRestDayScreen(restDay)}
      </div>
    `;
    attachRestDayEvents(container);
    return;
  }

  const routine = INITIAL_DATA.routines[currentDayId] || INITIAL_DATA.routines.torso1;

  // Clasificar ejercicios en pendientes y completados si la sesión está en vivo
  let pendingExercises = [];
  let completedExercises = [];

  if (isLive && state.activeWorkout.exercises) {
    state.activeWorkout.exercises.forEach((ex, idx) => {
      const isComplete = ex.sets && ex.sets.length > 0 && ex.sets.every(s => s.completed);
      const item = {
        exercise: ex,
        originalIndex: idx,
        definition: getExerciseDefinition(routine, ex.exerciseId)
      };
      if (isComplete) {
        completedExercises.push(item);
      } else {
        pendingExercises.push(item);
      }
    });
  }

  const totalExercises = isLive ? state.activeWorkout.exercises.length : routine.exercises.length;
  const completedCount = completedExercises.length;
  const progressPercent = isLive && totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;
  const strengthCount = (isLive ? state.activeWorkout.exercises : routine.exercises).filter(e => !e.isCardio).length;
  const cardioItem = isLive ? state.activeWorkout.exercises.find(e => e.isCardio) : routine.exercises.find(e => e.isCardio);
  const isCardioDone = isLive ? (cardioItem && cardioItem.sets && cardioItem.sets.every(s => s.completed)) : false;

  container.innerHTML = `
    <div class="space-y-4 max-w-3xl mx-auto pb-24">
      
      <!-- Selector de Días Semanal (Solo visible cuando no hay sesión en curso) -->
      ${!isLive ? renderWeeklyScheduleSelector(currentDayId, todayName) : `
        <!-- Banner de Sesión en Vivo -->
        <div class="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 rounded-2xl p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="relative flex h-3 w-3">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <p class="text-sm font-bold text-[var(--foreground)]">Entrenamiento en Curso: ${escapeHtml(routine.name)}</p>
                <p class="text-[13px] text-[var(--muted-foreground)]">${escapeHtml(routine.dayName)} • Sesión 18:00 hrs</p>
              </div>
            </div>
            <div class="flex gap-2">
              <button id="btnFinishWorkout" class="btn-touch bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs px-3 rounded-lg shadow-sm transition-all inline-flex items-center gap-1.5">
                ${icon('check', 'w-4 h-4')} Terminar
              </button>
              <button id="btnCancelWorkout" class="btn-touch w-11 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all inline-flex items-center justify-center" title="Descartar" aria-label="Descartar sesión">
                ${icon('x', 'w-5 h-5')}
              </button>
            </div>
          </div>

          <!-- Barra de Progreso de la Sesión -->
          <div class="mt-3 pt-2.5 border-t border-emerald-500/30">
            <div class="flex items-center justify-between text-[11px] mb-1">
              <span class="text-[var(--muted-foreground)]">
                <b>${completedCount}</b> de <b>${totalExercises}</b> actividades listas (${progressPercent}%)
              </span>
              <span class="font-bold ${isCardioDone ? 'text-emerald-500' : 'text-amber-500'} inline-flex items-center gap-1">
                ${icon('activity', 'w-3.5 h-3.5')} Cardio: ${isCardioDone ? 'Listo' : 'Pendiente'}
              </span>
            </div>
            <div class="w-full h-1.5 bg-[var(--accent)] rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full" style="width: ${progressPercent}%"></div>
            </div>
          </div>
        </div>
      `}

      <!-- Cabecera de la Rutina y Enfoque -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-xs font-bold border border-amber-500/20">
                ${escapeHtml(routine.dayName)}
              </span>
              <h2 class="text-lg font-bold text-[var(--foreground)]">${escapeHtml(routine.name)}</h2>
            </div>
            <p class="text-[13px] text-[var(--muted-foreground)] mt-1">${escapeHtml(routine.focus)}</p>
          </div>

          ${!isLive ? `
            <button id="btnStartWorkout" class="btn-touch bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
              ${icon('zap', 'w-4 h-4')} <span>Iniciar sesión de hoy</span>
            </button>
          ` : ''}
        </div>

        <!-- Resumen del Programa Diario (Visible de inmediato al tope para no tener dudas) -->
        <div class="grid grid-cols-1 xs:grid-cols-2 gap-2 mt-3 pt-3 border-t border-[var(--border)]">
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)] flex items-center gap-2.5">
            <span class="text-[var(--muted-foreground)]">${icon('dumbbell', 'w-5 h-5')}</span>
            <div>
              <span class="text-[11px] text-[var(--muted-foreground)] block">Fuerza en Máquinas</span>
              <b class="text-xs text-[var(--foreground)]">${strengthCount} Ejercicios</b>
            </div>
          </div>
          <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-2.5">
            <span class="text-amber-500">${icon('activity', 'w-5 h-5')}</span>
            <div>
              <span class="text-[11px] text-amber-500 font-bold block">Cardio Finisher</span>
              <b class="text-xs text-[var(--foreground)]">20 min Zona 2 (Al Final)</b>
            </div>
          </div>
        </div>
      </div>

      ${!isLive ? renderWeeklyStreak(streak) : ''}

      <!-- ============================================================ -->
      <!-- VISTA MODO PREVIA (NO EN VIVO): Todos los ejercicios en orden -->
      <!-- ============================================================ -->
      ${!isLive ? `
        <div class="space-y-4">
          ${routine.exercises.map((ex, exIndex) => {
            const prevLog = db.getLastExerciseLog(ex.id);
            if (ex.isCardio) {
              return renderStaticCardioCard(ex, exIndex);
            }
            return renderStaticExerciseCard(ex, exIndex, prevLog);
          }).join('')}
        </div>
      ` : `
        <!-- ============================================================ -->
        <!-- VISTA EN VIVO (ACTIVA): Pendientes arriba, Completados abajo -->
        <!-- ============================================================ -->
        <div class="space-y-4">
          
          <!-- 1. ACTIVIDADES PENDIENTES / EN CURSO -->
          ${pendingExercises.length > 0 ? `
            <div class="space-y-1 mb-2">
              <div class="flex items-center justify-between px-1">
                <span class="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Por Realizar (${pendingExercises.length})
                </span>
                <span class="text-[10px] text-[var(--muted-foreground)]">Al completarlos bajan automáticamente</span>
              </div>
            </div>

            <div class="space-y-4">
              ${pendingExercises.map(item => {
                const prevLog = db.getLastExerciseLog(item.exercise.exerciseId);
                if (item.exercise.isCardio || item.definition.isCardio) {
                  return renderLiveCardioCard(item.exercise, item.originalIndex, item.definition);
                }
                return renderLiveExerciseCard(item.exercise, item.originalIndex, item.definition, prevLog);
              }).join('')}
            </div>
          ` : `
            <!-- Banner si ya completó todo -->
            <div class="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-1.5">
              <span class="inline-flex text-emerald-500">${icon('trophy', 'w-8 h-8')}</span>
              <h3 class="text-sm font-bold text-emerald-500">¡Sesión Completa! Rutina y Cardio finalizados</h3>
              <p class="text-[13px] text-[var(--muted-foreground)]">
                ¡Gran trabajo, ${escapeHtml(profile.name)}! Pulsa el botón "Terminar" arriba para guardar en tu historial evolutivo.
              </p>
            </div>
          `}

          <!-- 2. ACTIVIDADES COMPLETADAS (ABAJO PARA NO ESTORBAR) -->
          ${completedExercises.length > 0 ? `
            <div class="mt-6 pt-4 border-t border-[var(--border)] space-y-3">
              <div class="flex items-center justify-between px-1">
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">${icon('check', 'w-4 h-4')}</span>
                  <h3 class="text-xs uppercase font-bold tracking-wider text-emerald-500">
                    Completados (${completedExercises.length} de ${totalExercises})
                  </h3>
                </div>
                <span class="text-[10px] text-[var(--muted-foreground)]">Toca "Editar" si necesitas corregir</span>
              </div>

              <div class="space-y-2">
                ${completedExercises.map(item => {
                  return renderCompletedExerciseCard(item.exercise, item.originalIndex, item.definition);
                }).join('')}
              </div>
            </div>
          ` : ''}

        </div>
      `}

    </div>
  `;

  // Attach Event Listeners
  attachWorkoutEvents(container, currentDayId);

  // Si se solicitó preservar scroll, restaurarlo de inmediato
  if (preserveScroll) {
    requestAnimationFrame(() => {
      window.scrollTo({ top: previousScrollY, behavior: 'instant' });
    });
  }
}

// --------------------------------------------------------------------------
// COMPONENTES DE RENDERIZADO
// --------------------------------------------------------------------------


// MANEJO DE EVENTOS (ZERO JUMP & ZERO FLICKER)
// --------------------------------------------------------------------------
function attachWorkoutEvents(container, currentDayId) {
  // Cambio de día en tabs (vista previa)
  container.querySelectorAll('.day-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = btn.getAttribute('data-day');
      state.setSelectedDay(day);
    });
  });

  // Toggle de Tips e Infografías
  container.querySelectorAll('.tips-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-toggle');
      const targetEl = document.getElementById(targetId);
      const arrowEl = document.getElementById(`arrow-${targetId}`);
      if (targetEl) {
        const isHidden = targetEl.classList.contains('hidden');
        targetEl.classList.toggle('hidden');
        btn.setAttribute('aria-expanded', String(isHidden));
        if (arrowEl) arrowEl.classList.toggle('rotate-180', isHidden);
      }
    });
  });

  // Expandir editor en actividades completadas
  container.querySelectorAll('.btn-expand-completed').forEach(btn => {
    btn.addEventListener('click', () => {
      const exIndex = btn.getAttribute('data-ex');
      const editorEl = document.getElementById(`completed-editor-${exIndex}`);
      const arrowEl = document.getElementById(`arrow-completed-${exIndex}`);
      if (editorEl) {
        const isHidden = editorEl.classList.contains('hidden');
        editorEl.classList.toggle('hidden');
        btn.setAttribute('aria-expanded', String(isHidden));
        if (arrowEl) arrowEl.classList.toggle('rotate-180', isHidden);
      }
    });
  });

  // Iniciar Sesión de Entrenamiento
  const btnStart = container.querySelector('#btnStartWorkout');
  if (btnStart) {
    btnStart.addEventListener('click', () => {
      timer.requestWakeLock();
      state.startWorkout(currentDayId);
    });
  }

  // Terminar Entrenamiento
  const btnFinish = container.querySelector('#btnFinishWorkout');
  if (btnFinish) {
    btnFinish.addEventListener('click', async () => {
      const profile = db.getProfile();
      const ok = await confirmAction({
        title: '¿Terminar y guardar la sesión?',
        message: 'Se guardará en tu historial local y se sincronizará con la nube cuando haya conexión.',
        confirmText: 'Terminar y guardar'
      });
      if (!ok) return;

      timer.stop();
      timer.releaseWakeLock();
      state.finishWorkout();
      showToast(`¡Excelente trabajo, ${profile.name}! Sesión guardada.`, 'success', 5000);
    });
  }

  // Cancelar Entrenamiento
  const btnCancel = container.querySelector('#btnCancelWorkout');
  if (btnCancel) {
    btnCancel.addEventListener('click', async () => {
      const ok = await confirmAction({
        title: '¿Descartar la sesión?',
        message: 'Se perderán las series registradas en este entrenamiento y no se guardará en el historial.',
        confirmText: 'Descartar sesión',
        danger: true
      });
      if (!ok) return;

      timer.stop();
      timer.releaseWakeLock();
      state.cancelWorkout();
      showToast('Sesión descartada.', 'info');
    });
  }

  // Botón Smart Coach: Aplicar sobrecarga progresiva sugerida
  container.querySelectorAll('.btn-apply-smart-coach').forEach(btn => {
    btn.addEventListener('click', () => {
      const exerciseId = btn.getAttribute('data-id');
      const nextWeight = parseFloat(btn.getAttribute('data-weight'));
      const exIndexAttr = btn.getAttribute('data-ex');

      if (exerciseId && !isNaN(nextWeight)) {
        db.setCustomWeight(exerciseId, nextWeight);

        // Si estamos en una sesión en vivo, actualizar las series pendientes de este ejercicio
        if (state.activeWorkout && exIndexAttr !== null) {
          const exIndex = parseInt(exIndexAttr, 10);
          const liveEx = state.activeWorkout.exercises[exIndex];
          if (liveEx && liveEx.sets) {
            liveEx.sets.forEach(s => {
              if (!s.completed) {
                s.weight = nextWeight;
              }
            });
            db.saveActiveSession(state.activeWorkout);
          }
        }

        renderWorkoutModule(container, true);
      }
    });
  });

  // Inputs de peso y reps (GUARDADO SILENCIOSO: no re-renderiza ni cierra teclado)
  container.querySelectorAll('.input-set-field').forEach(input => {
    input.addEventListener('change', () => {
      const exIndex = parseInt(input.getAttribute('data-ex'));
      const setIndex = parseInt(input.getAttribute('data-set'));
      const field = input.getAttribute('data-field');
      state.updateSet(exIndex, setIndex, field, input.value, false);
    });
  });

  // Botones +/- de fuerza (ACTUALIZACIÓN DIRECTA EN EL DOM: Cero scroll jump, cero flicker)
  container.querySelectorAll('.btn-step').forEach(btn => {
    btn.addEventListener('click', () => {
      const exIndex = parseInt(btn.getAttribute('data-ex'));
      const setIndex = parseInt(btn.getAttribute('data-set'));
      const field = btn.getAttribute('data-field');
      const delta = parseFloat(btn.getAttribute('data-delta'));

      const input = btn.parentElement.querySelector(`input[data-field="${field}"]`);
      if (input) {
        const currentVal = parseFloat(input.value) || 0;
        const newVal = Math.max(0, currentVal + delta);
        const formattedVal = Number.isInteger(newVal) ? newVal : Math.round(newVal * 100) / 100;
        input.value = formattedVal;
        state.updateSet(exIndex, setIndex, field, formattedVal, false);
      }
    });
  });

  // Ajuste de minutos de Cardio
  container.querySelectorAll('.btn-cardio-adjust').forEach(btn => {
    btn.addEventListener('click', () => {
      const exIndex = parseInt(btn.getAttribute('data-ex'));
      const delta = parseInt(btn.getAttribute('data-delta'));
      const displayEl = document.getElementById(`cardioMinsDisplay-${exIndex}`);
      const ex = state.activeWorkout.exercises[exIndex];
      if (ex && ex.sets && ex.sets[0]) {
        const current = Number(ex.minutes ?? ex.sets[0].weight) || 20;
        const next = Math.max(5, Math.min(60, current + delta));
        ex.minutes = next;
        ex.sets[0].weight = next;
        ex.sets[0].reps = next;
        state.updateSet(exIndex, 0, 'weight', next, false);
        if (displayEl) displayEl.textContent = `${next} min`;
      }
    });
  });

  // Toggle de Serie Completada (incluye botón de completar Cardio)
  container.querySelectorAll('.btn-toggle-set').forEach(btn => {
    btn.addEventListener('click', () => {
      const exIndex = parseInt(btn.getAttribute('data-ex'));
      const setIndex = parseInt(btn.getAttribute('data-set'));
      const ex = state.activeWorkout.exercises[exIndex];
      const willBeCompleted = !ex.sets[setIndex].completed;

      // Actualizar en el estado silenciosamente
      state.toggleSetCompleted(exIndex, setIndex, false);

      if (willBeCompleted && !ex.isCardio) {
        // Disparar temporizador flotante con el descanso configurado
        timer.start(restSeconds());
      }

      // Verificar si el estado global del ejercicio cambió (de pendiente a 100% completado, o viceversa)
      const allCompletedNow = ex.sets.every(s => s.completed);

      if (allCompletedNow || !willBeCompleted || ex.isCardio) {
        // El ejercicio cambió de categoría (pasa a Completados abajo o regresa a Pendientes)
        // Re-renderizar módulo preservando la posición exacta de scroll
        renderWorkoutModule(container, true);
      } else {
        // Solo actualizar el botón y la fila en el DOM directamente sin re-renderizar la página
        const setNumber = ex.sets[setIndex]?.setNumber ?? (setIndex + 1);
        btn.innerHTML = `<span class="text-[10px] font-extrabold leading-none">#${setNumber}</span>${icon(willBeCompleted ? 'check' : 'circle', 'w-5 h-5')}`;
        btn.setAttribute('aria-pressed', String(willBeCompleted));
        btn.setAttribute('aria-label', `${willBeCompleted ? 'Desmarcar' : 'Marcar'} la serie ${setNumber} como completada`);
        const row = btn.closest('.set-row');
        if (willBeCompleted) {
          btn.classList.add('bg-emerald-500', 'text-slate-950', 'shadow-sm', 'border-emerald-500', 'check-pop');
          btn.classList.remove('bg-[var(--card)]', 'text-[var(--muted-foreground)]');
          setTimeout(() => btn.classList.remove('check-pop'), 220);
          if (row) {
            row.classList.add('bg-emerald-500/10', 'border-emerald-500/20');
            row.classList.remove('bg-[var(--card)]');
          }
        } else {
          btn.classList.remove('bg-emerald-500', 'text-slate-950', 'shadow-sm', 'border-emerald-500');
          btn.classList.add('bg-[var(--card)]', 'text-[var(--muted-foreground)]');
          if (row) {
            row.classList.remove('bg-emerald-500/10', 'border-emerald-500/20');
            row.classList.add('bg-[var(--card)]');
          }
        }
      }
    });
  });

  // Botón "✓ Marcar todo listo" (Fuerza)
  container.querySelectorAll('.btn-complete-all-sets').forEach(btn => {
    btn.addEventListener('click', () => {
      const exIndex = parseInt(btn.getAttribute('data-ex'));
      state.completeAllSetsOfExercise(exIndex);
      timer.start(restSeconds());
      renderWorkoutModule(container, true);
    });
  });

  // Añadir Serie
  container.querySelectorAll('.btn-add-set').forEach(btn => {
    btn.addEventListener('click', () => {
      const exIndex = parseInt(btn.getAttribute('data-ex'));
      state.addSetToExercise(exIndex);
      renderWorkoutModule(container, true);
    });
  });

  // Eliminar serie agregada (las series base del ejercicio no se tocan)
  container.querySelectorAll('.btn-remove-set').forEach(btn => {
    btn.addEventListener('click', () => {
      const exIndex = parseInt(btn.getAttribute('data-ex'), 10);
      const setIndex = parseInt(btn.getAttribute('data-set'), 10);
      const removed = state.removeSetFromExercise(exIndex, setIndex);

      if (!removed) {
        showToast('Las series base no se pueden eliminar. Agrega una serie para poder quitarla.', 'warning', 5000);
        return;
      }

      if (undoToastRemove) {
        undoToastRemove();
        undoToastRemove = null;
      }

      undoToastRemove = showToast(`Serie ${removed.setNumber} eliminada.`, 'info', 6000, {
        label: 'Deshacer',
        onClick: () => {
          const restored = state.restoreSetFromUndo(exIndex, setIndex, removed);
          undoToastRemove = null;
          showToast(
            restored ? 'Serie restaurada.' : 'No se pudo restaurar la serie.',
            restored ? 'success' : 'warning',
            2500
          );
        }
      });
    });
  });
}

// --------------------------------------------------------------------------

// EVENTOS PARA LA PANTALLA DE DESCANSO
// --------------------------------------------------------------------------
function attachRestDayEvents(container) {
  // Cambio de día en tabs
  container.querySelectorAll('.day-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = btn.getAttribute('data-day');
      state.setSelectedDay(day);
    });
  });

  // Botones para cambiar a rutina de fuerza si prefiere entrenar hoy
  container.querySelectorAll('.btn-switch-routine').forEach(btn => {
    btn.addEventListener('click', () => {
      const routineId = btn.getAttribute('data-switch-routine');
      state.setSelectedDay(routineId);
    });
  });

  // Botón para iniciar temporizador de cardio regenerativo
  const btnRestCardio = container.querySelector('#btnStartRestCardio');
  if (btnRestCardio) {
    btnRestCardio.addEventListener('click', () => {
      const minutes = parseInt(btnRestCardio.getAttribute('data-minutes')) || 25;
      timer.start(minutes * 60);
      const timerEl = document.getElementById('floatingTimer');
      if (timerEl) {
        timerEl.classList.remove('hidden');
      }
    });
  }
}
