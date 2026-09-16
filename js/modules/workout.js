// Módulo de Rutina de Entrenamiento, Guía Visual y Registro en Vivo
import { INITIAL_DATA } from '../data/initialData.js';
import { state } from '../state.js';
import { db } from '../services/db.js';
import { timer } from '../services/timer.js';

export function renderWorkoutModule(container, preserveScroll = false) {
  const previousScrollY = window.scrollY;
  const isLive = !!state.activeWorkout;
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
        definition: routine.exercises[idx] || {}
      };
      if (isComplete) {
        completedExercises.push(item);
      } else {
        pendingExercises.push(item);
      }
    });
  }

  const totalExercises = routine.exercises.length;
  const completedCount = completedExercises.length;
  const progressPercent = isLive ? Math.round((completedCount / totalExercises) * 100) : 0;
  const strengthCount = routine.exercises.filter(e => !e.isCardio).length;
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
                <h3 class="text-sm font-bold text-[var(--foreground)]">Entrenamiento en Curso: ${routine.name}</h3>
                <p class="text-xs text-[var(--muted-foreground)]">${routine.dayName} • Sesión 18:00 hrs</p>
              </div>
            </div>
            <div class="flex gap-2">
              <button id="btnFinishWorkout" class="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1">
                ✓ Terminar
              </button>
              <button id="btnCancelWorkout" class="text-rose-400 hover:bg-rose-500/10 text-xs px-2 py-1.5 rounded-lg transition-all" title="Descartar">
                ✕
              </button>
            </div>
          </div>

          <!-- Barra de Progreso de la Sesión -->
          <div class="mt-3 pt-2.5 border-t border-emerald-500/30">
            <div class="flex items-center justify-between text-[11px] mb-1">
              <span class="text-[var(--muted-foreground)]">
                <b>${completedCount}</b> de <b>${totalExercises}</b> actividades listas (${progressPercent}%)
              </span>
              <span class="font-bold ${isCardioDone ? 'text-emerald-400' : 'text-amber-500'}">
                ${isCardioDone ? '🏃 Cardio: ✓ Listo' : '🏃 Cardio: Pendiente'}
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
                ${routine.dayName}
              </span>
              <h2 class="text-lg font-bold text-[var(--foreground)]">${routine.name}</h2>
            </div>
            <p class="text-xs text-[var(--muted-foreground)] mt-1">${routine.focus}</p>
          </div>

          ${!isLive ? `
            <button id="btnStartWorkout" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
              <span>⚡ Iniciar Sesión de Hoy</span>
            </button>
          ` : ''}
        </div>

        <!-- Resumen del Programa Diario (Visible de inmediato al tope para no tener dudas) -->
        <div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[var(--border)]">
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)] flex items-center gap-2.5">
            <span class="text-lg">🏋️</span>
            <div>
              <span class="text-[10px] text-[var(--muted-foreground)] block">Fuerza en Máquinas</span>
              <b class="text-xs text-[var(--foreground)]">${strengthCount} Ejercicios</b>
            </div>
          </div>
          <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-2.5">
            <span class="text-lg">🏃</span>
            <div>
              <span class="text-[10px] text-amber-500 font-bold block">Cardio Finisher</span>
              <b class="text-xs text-[var(--foreground)]">20 min Zona 2 (Al Final)</b>
            </div>
          </div>
        </div>
      </div>

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
              <span class="text-2xl">🏆</span>
              <h3 class="text-sm font-bold text-emerald-400">¡Sesión Completa! Rutina y Cardio finalizados</h3>
              <p class="text-xs text-[var(--muted-foreground)]">
                ¡Gran trabajo, Michael! Pulsa el botón "✓ Terminar" arriba para guardar en tu historial evolutivo.
              </p>
            </div>
          `}

          <!-- 2. ACTIVIDADES COMPLETADAS (ABAJO PARA NO ESTORBAR) -->
          ${completedExercises.length > 0 ? `
            <div class="mt-6 pt-4 border-t border-[var(--border)] space-y-3">
              <div class="flex items-center justify-between px-1">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">✓</span>
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

// 1. Tarjeta de Ejercicio de Fuerza en Modo Previa
function renderStaticExerciseCard(ex, exIndex, prevLog) {
  return `
    <div class="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-xs overflow-hidden transition-all" id="card-${ex.id}">
      <div class="p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--accent)] text-[var(--muted-foreground)]">
                #${exIndex + 1}
              </span>
              <h3 class="font-bold text-sm sm:text-base text-[var(--foreground)]">${ex.name}</h3>
            </div>
            <p class="text-xs text-[var(--muted-foreground)] mt-0.5">${ex.machineName}</p>
            <div class="flex flex-wrap items-center gap-1.5 mt-2">
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--muted-foreground)] font-medium">
                ${ex.targetMuscles}
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                Pauta: ${ex.defaultSets} series x ${ex.defaultReps} reps
              </span>
            </div>
          </div>

          <div class="text-right shrink-0">
            <span class="text-[10px] text-[var(--muted-foreground)] block">Marca previa:</span>
            <span class="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] inline-block mt-0.5">
              ${prevLog ? `${prevLog.bestWeight} lb x ${prevLog.bestReps}` : (ex.baseWeight !== 'Pendiente' && ex.baseWeight !== 'Auto' ? `${ex.baseWeight} lb/placa` : 'Pendiente')}
            </span>
          </div>
        </div>

        <!-- Botón colapsable para Ver Imagen y Tips Técnicos -->
        <div class="mt-3">
          <button data-toggle="tips-${ex.id}" class="tips-toggle-btn text-xs text-amber-500 hover:text-amber-400 font-semibold flex items-center gap-1 transition-colors">
            <span>📖 Ver infografía de máquina y tips</span>
            <span class="text-[10px] transform transition-transform" id="arrow-tips-${ex.id}">▼</span>
          </button>
          
          <div id="tips-${ex.id}" class="hidden mt-3 pt-3 border-t border-[var(--border)] space-y-3">
            ${ex.image ? `
              <div class="rounded-xl overflow-hidden border border-[var(--border)] bg-black/20 max-w-md mx-auto">
                <img src="${ex.image}" alt="${ex.name}" class="w-full h-auto object-cover" loading="lazy" />
              </div>
            ` : ''}

            <div class="bg-[var(--accent)]/50 rounded-xl p-3 text-xs space-y-2">
              <div>
                <b class="text-[var(--foreground)]">🔧 Ajuste de asiento / máquina:</b>
                <p class="text-[var(--muted-foreground)] mt-0.5">${ex.seatAdjustment}</p>
              </div>
              <div>
                <b class="text-[var(--foreground)]">💡 Claves de ejecución:</b>
                <ul class="list-disc list-inside space-y-1 text-[var(--muted-foreground)] mt-1">
                  ${ex.tips.map(t => `<li>${t}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 2. Tarjeta de Cardio Finisher en Modo Previa (Programado como último ejercicio del día)
function renderStaticCardioCard(ex, exIndex) {
  return `
    <div class="bg-[var(--card)] rounded-2xl border-2 border-amber-500/40 shadow-sm overflow-hidden transition-all" id="card-${ex.id}">
      <div class="p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black">
                #${exIndex + 1}
              </span>
              <h3 class="font-bold text-sm sm:text-base text-[var(--foreground)] flex items-center gap-1.5">
                <span>🏃 ${ex.name}</span>
              </h3>
            </div>
            <p class="text-xs text-amber-500 font-semibold mt-0.5">${ex.machineName}</p>
            <div class="flex flex-wrap items-center gap-1.5 mt-2">
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                ${ex.baseWeight}
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                Duración: ${ex.defaultReps}
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--muted-foreground)] font-medium">
                Al Final de las Máquinas
              </span>
            </div>
          </div>
        </div>

        <!-- Explicación Fisiológica de por qué se hace al final -->
        <div class="mt-3 p-3 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)] text-xs text-[var(--muted-foreground)] space-y-1">
          <p class="text-[var(--foreground)] font-bold flex items-center gap-1.5 text-[11px]">
            <span class="text-amber-500">💡</span> ¿Por qué va siempre al final de las máquinas?
          </p>
          <p class="text-[11px] leading-relaxed">
            1. <b>Protege tu fuerza y tus 37 kg de masa muscular:</b> Las pesas requieren glucógeno intacto.<br>
            2. <b>Quema máxima de grasa visceral:</b> Tras las máquinas, tu glucosa e insulina están bajas, por lo que el cardio en Zona 2 fuerza al organismo a consumir directamente los depósitos grasos del tronco.
          </p>
          <div class="pt-1 text-[11px] text-[var(--foreground)]">
            <b>🔧 Ajuste recomendado:</b> ${ex.seatAdjustment}
          </div>
        </div>
      </div>
    </div>
  `;
}

// 3. Tarjeta de Ejercicio de Fuerza en Vivo (Pendiente)
function renderLiveExerciseCard(ex, exIndex, def, prevLog) {
  return `
    <div class="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-xs overflow-hidden transition-all" id="card-${ex.exerciseId}">
      <!-- Cabecera -->
      <div class="p-4 pb-3">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--accent)] text-[var(--muted-foreground)]">
                #${exIndex + 1}
              </span>
              <h3 class="font-bold text-sm sm:text-base text-[var(--foreground)]">${ex.exerciseName}</h3>
            </div>
            <p class="text-xs text-[var(--muted-foreground)] mt-0.5">${def.machineName || ''}</p>
            <div class="flex flex-wrap items-center gap-1.5 mt-2">
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--muted-foreground)] font-medium">
                ${def.targetMuscles || 'Fuerza'}
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                Pauta: ${def.defaultSets || 3} series x ${def.defaultReps || '8-10'} reps
              </span>
            </div>
          </div>

          <!-- Marca previa -->
          <div class="text-right shrink-0">
            <span class="text-[10px] text-[var(--muted-foreground)] block">Marca previa:</span>
            <span class="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] inline-block mt-0.5">
              ${prevLog ? `${prevLog.bestWeight} lb x ${prevLog.bestReps}` : (def.baseWeight && def.baseWeight !== 'Pendiente' ? `${def.baseWeight} lb` : 'Pendiente')}
            </span>
          </div>
        </div>

        <!-- Tips colapsables -->
        <div class="mt-3">
          <button data-toggle="tips-${ex.exerciseId}" class="tips-toggle-btn text-xs text-amber-500 hover:text-amber-400 font-semibold flex items-center gap-1 transition-colors">
            <span>📖 Ver infografía de máquina y tips</span>
            <span class="text-[10px] transform transition-transform" id="arrow-tips-${ex.exerciseId}">▼</span>
          </button>
          
          <div id="tips-${ex.exerciseId}" class="hidden mt-3 pt-3 border-t border-[var(--border)] space-y-3">
            ${def.image ? `
              <div class="rounded-xl overflow-hidden border border-[var(--border)] bg-black/20 max-w-md mx-auto">
                <img src="${def.image}" alt="${ex.exerciseName}" class="w-full h-auto object-cover" loading="lazy" />
              </div>
            ` : ''}

            <div class="bg-[var(--accent)]/50 rounded-xl p-3 text-xs space-y-2">
              <div>
                <b class="text-[var(--foreground)]">🔧 Ajuste de asiento / máquina:</b>
                <p class="text-[var(--muted-foreground)] mt-0.5">${def.seatAdjustment || 'Ajustar a la altura anatómica cómoda.'}</p>
              </div>
              <div>
                <b class="text-[var(--foreground)]">💡 Claves de ejecución:</b>
                <ul class="list-disc list-inside space-y-1 text-[var(--muted-foreground)] mt-1">
                  ${(def.tips || []).map(t => `<li>${t}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ZONA DE REGISTRO EN VIVO -->
      <div class="bg-[var(--accent)]/30 border-t border-[var(--border)] p-3 sm:p-4">
        <div class="space-y-2">
          <div class="grid grid-cols-12 text-[10px] uppercase font-bold text-[var(--muted-foreground)] px-2">
            <span class="col-span-2 text-center">Serie</span>
            <span class="col-span-4 text-center">Peso (lb/placa)</span>
            <span class="col-span-3 text-center">Reps</span>
            <span class="col-span-3 text-center">Listo</span>
          </div>

          ${ex.sets.map((set, setIndex) => renderSetRow(exIndex, setIndex, set)).join('')}

          <div class="flex items-center justify-between pt-2 border-t border-[var(--border)]/40 mt-1">
            <button 
              type="button" 
              class="btn-add-set text-xs text-amber-500 hover:text-amber-400 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-amber-500/10 transition-colors"
              data-ex="${exIndex}">
              + Añadir Serie
            </button>

            <div class="flex items-center gap-2">
              <span class="text-[10px] text-[var(--muted-foreground)]">Descanso: 90s</span>
              <button 
                type="button" 
                class="btn-complete-all-sets text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all flex items-center gap-1"
                data-ex="${exIndex}"
                title="Marcar todas las series listas y mover a completados">
                <span>✓ Marcar todo listo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 4. Tarjeta de Cardio Finisher en Vivo (Con selector de minutos y botón de completar)
function renderLiveCardioCard(ex, exIndex, def) {
  const currentMins = (ex.sets && ex.sets[0] && ex.sets[0].weight) || 20;

  return `
    <div class="bg-[var(--card)] rounded-2xl border-2 border-amber-500/50 shadow-md overflow-hidden transition-all" id="card-${ex.exerciseId}">
      <div class="p-4 pb-3 bg-gradient-to-r from-amber-500/5 to-emerald-500/5">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black">
                #${exIndex + 1}
              </span>
              <h3 class="font-bold text-sm sm:text-base text-[var(--foreground)] flex items-center gap-1.5">
                <span>🏃 ${ex.exerciseName}</span>
              </h3>
            </div>
            <p class="text-xs text-amber-500 font-semibold mt-0.5">${def.machineName || 'Caminadora / Elíptica'}</p>
            <div class="flex flex-wrap items-center gap-1.5 mt-2">
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                ${def.baseWeight || 'Zona 2 (110-125 lpm)'}
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-bold border border-amber-500/25">
                Al Final de las Máquinas
              </span>
            </div>
          </div>
        </div>

        <div class="mt-3 p-3 rounded-xl bg-[var(--accent)]/60 border border-[var(--border)] text-xs text-[var(--muted-foreground)] space-y-1">
          <p class="text-[var(--foreground)] font-bold text-[11px] flex items-center gap-1">
            <span class="text-amber-500">💡</span> Instrucción de ejecución:
          </p>
          <p class="text-[11px] leading-relaxed">
            ${def.seatAdjustment || 'Ajustar a inclinación y ritmo constante.'}
          </p>
        </div>
      </div>

      <!-- Zona Interactiva de Cardio -->
      <div class="bg-[var(--accent)]/40 border-t border-[var(--border)] p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          
          <!-- Selector de minutos -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-[var(--muted-foreground)] font-semibold">Minutos realizados:</span>
            <div class="flex items-center gap-1">
              <button type="button" class="btn-cardio-adjust text-xs px-2 py-1 rounded-lg bg-[var(--accent)] hover:bg-[var(--border)] text-[var(--foreground)] font-bold transition-colors" data-ex="${exIndex}" data-delta="-5">-5m</button>
              <span id="cardioMinsDisplay-${exIndex}" class="text-xs font-mono font-bold px-2.5 py-1 bg-[var(--card)] rounded-lg text-[var(--foreground)] border border-[var(--border)]">${currentMins} min</span>
              <button type="button" class="btn-cardio-adjust text-xs px-2 py-1 rounded-lg bg-[var(--accent)] hover:bg-[var(--border)] text-[var(--foreground)] font-bold transition-colors" data-ex="${exIndex}" data-delta="5">+5m</button>
            </div>
          </div>

          <!-- Botón de Completar Cardio -->
          <button 
            type="button" 
            class="btn-toggle-set px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 hover:brightness-110"
            data-ex="${exIndex}" 
            data-set="0">
            <span>⚡ Marcar Cardio Completado (${currentMins} min)</span>
          </button>

        </div>
      </div>
    </div>
  `;
}

// 5. Fila interactiva de cada serie
function renderSetRow(exIndex, setIndex, set) {
  const isDone = !!set.completed;
  return `
    <div class="set-row grid grid-cols-12 items-center gap-2 p-1.5 rounded-xl transition-all ${isDone ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-[var(--card)] border border-[var(--border)]'}" data-ex="${exIndex}" data-set="${setIndex}">
      <!-- Serie # -->
      <span class="col-span-2 text-center text-xs font-mono font-bold text-[var(--muted-foreground)]">
        ${set.setNumber}
      </span>

      <!-- Peso Input con botones +/- -->
      <div class="col-span-4 flex items-center justify-center gap-1">
        <button type="button" class="btn-step text-xs px-1.5 py-0.5 rounded bg-[var(--accent)] hover:bg-[var(--border)] select-none text-[var(--foreground)]" data-ex="${exIndex}" data-set="${setIndex}" data-field="weight" data-delta="-2.5">-</button>
        <input 
          type="number" 
          step="any" 
          value="${set.weight}" 
          placeholder="Peso"
          class="input-set-field w-14 text-center font-mono text-xs font-bold py-1 rounded-lg bg-transparent border border-[var(--border)] focus:border-amber-500 outline-none text-[var(--foreground)]"
          data-ex="${exIndex}" 
          data-set="${setIndex}" 
          data-field="weight" />
        <button type="button" class="btn-step text-xs px-1.5 py-0.5 rounded bg-[var(--accent)] hover:bg-[var(--border)] select-none text-[var(--foreground)]" data-ex="${exIndex}" data-set="${setIndex}" data-field="weight" data-delta="2.5">+</button>
      </div>

      <!-- Reps Input con botones +/- -->
      <div class="col-span-3 flex items-center justify-center gap-1">
        <button type="button" class="btn-step text-xs px-1.5 py-0.5 rounded bg-[var(--accent)] hover:bg-[var(--border)] select-none text-[var(--foreground)]" data-ex="${exIndex}" data-set="${setIndex}" data-field="reps" data-delta="-1">-</button>
        <input 
          type="number" 
          value="${set.reps}" 
          placeholder="Reps"
          class="input-set-field w-10 text-center font-mono text-xs font-bold py-1 rounded-lg bg-transparent border border-[var(--border)] focus:border-amber-500 outline-none text-[var(--foreground)]"
          data-ex="${exIndex}" 
          data-set="${setIndex}" 
          data-field="reps" />
        <button type="button" class="btn-step text-xs px-1.5 py-0.5 rounded bg-[var(--accent)] hover:bg-[var(--border)] select-none text-[var(--foreground)]" data-ex="${exIndex}" data-set="${setIndex}" data-field="reps" data-delta="1">+</button>
      </div>

      <!-- Checkbox Completar Serie -->
      <div class="col-span-3 flex justify-center">
        <button 
          type="button" 
          class="btn-toggle-set w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${isDone 
            ? 'bg-emerald-500 text-slate-950 shadow-sm' 
            : 'bg-[var(--card)] hover:bg-[var(--accent)] text-[var(--muted-foreground)] border border-[var(--border)]'}"
          data-ex="${exIndex}" 
          data-set="${setIndex}">
          ${isDone ? '✓' : '○'}
        </button>
      </div>
    </div>
  `;
}

// 6. Tarjeta compacta para Ejercicio Completado (Al final de la pantalla)
function renderCompletedExerciseCard(ex, exIndex, def) {
  const isCardio = !!ex.isCardio || !!def.isCardio;
  const setsSummary = isCardio 
    ? `${(ex.sets && ex.sets[0] && ex.sets[0].weight) || 20} min en Zona 2 completados`
    : ex.sets.map(s => `${s.weight ? `${s.weight}lb` : ''} x ${s.reps}`).join(' • ');

  return `
    <div class="bg-[var(--card)]/75 border border-emerald-500/30 rounded-2xl p-3 shadow-xs transition-all opacity-95" id="card-${ex.exerciseId}">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 text-xs font-black flex items-center justify-center shrink-0">✓</span>
          <div class="truncate">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-mono font-bold px-1 rounded bg-[var(--accent)] text-[var(--muted-foreground)]">#${exIndex + 1}</span>
              <h4 class="text-xs sm:text-sm font-bold text-[var(--foreground)] truncate">${ex.exerciseName}</h4>
            </div>
            <p class="text-[11px] text-[var(--muted-foreground)] truncate mt-0.5">${setsSummary}</p>
          </div>
        </div>

        <button 
          type="button" 
          class="btn-expand-completed shrink-0 text-[11px] font-semibold text-amber-500 hover:text-amber-400 px-2.5 py-1 rounded-xl bg-[var(--accent)] border border-[var(--border)] flex items-center gap-1 transition-colors"
          data-ex="${exIndex}">
          <span>Editar</span>
          <span class="text-[9px] transform transition-transform" id="arrow-completed-${exIndex}">▼</span>
        </button>
      </div>

      <!-- Editor de Series (Colapsado por defecto) -->
      <div id="completed-editor-${exIndex}" class="hidden mt-3 pt-3 border-t border-[var(--border)] space-y-2">
        <p class="text-[10px] text-[var(--muted-foreground)]">Desmarca para devolver esta actividad a la lista de pendientes:</p>
        
        ${isCardio ? `
          <div class="flex items-center justify-between p-2 rounded-xl bg-[var(--accent)]/40 border border-[var(--border)]">
            <span class="text-xs font-bold text-[var(--foreground)]">Cardio: ${(ex.sets && ex.sets[0] && ex.sets[0].weight) || 20} min Zona 2</span>
            <button 
              type="button" 
              class="btn-toggle-set text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950"
              data-ex="${exIndex}" 
              data-set="0">
              ✓ Completado (Desmarcar)
            </button>
          </div>
        ` : `
          <div class="grid grid-cols-12 text-[10px] uppercase font-bold text-[var(--muted-foreground)] px-2">
            <span class="col-span-2 text-center">Serie</span>
            <span class="col-span-4 text-center">Peso</span>
            <span class="col-span-3 text-center">Reps</span>
            <span class="col-span-3 text-center">Listo</span>
          </div>

          ${ex.sets.map((set, setIndex) => renderSetRow(exIndex, setIndex, set)).join('')}
        `}
      </div>
    </div>
  `;
}

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
        if (arrowEl) arrowEl.textContent = isHidden ? '▲' : '▼';
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
        if (arrowEl) arrowEl.textContent = isHidden ? '▲' : '▼';
      }
    });
  });

  // Iniciar Sesión de Entrenamiento
  const btnStart = container.querySelector('#btnStartWorkout');
  if (btnStart) {
    btnStart.addEventListener('click', () => {
      state.startWorkout(currentDayId);
    });
  }

  // Terminar Entrenamiento
  const btnFinish = container.querySelector('#btnFinishWorkout');
  if (btnFinish) {
    btnFinish.addEventListener('click', () => {
      if (confirm('¿Terminar y guardar la sesión de hoy?')) {
        state.finishWorkout();
        alert('¡Excelente trabajo, Michael! Sesión guardada en tu historial.');
      }
    });
  }

  // Cancelar Entrenamiento
  const btnCancel = container.querySelector('#btnCancelWorkout');
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      if (confirm('¿Deseas descartar los cambios de esta sesión?')) {
        state.cancelWorkout();
      }
    });
  }

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
        const formattedVal = Number.isInteger(newVal) ? newVal : Math.round(newVal * 10) / 10;
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
        let current = parseInt(ex.sets[0].weight) || 20;
        let next = Math.max(5, Math.min(60, current + delta));
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
        // Disparar temporizador flotante de 90s para máquinas de fuerza
        timer.start(90);
      }

      // Verificar si el estado global del ejercicio cambió (de pendiente a 100% completado, o viceversa)
      const allCompletedNow = ex.sets.every(s => s.completed);

      if (allCompletedNow || !willBeCompleted || ex.isCardio) {
        // El ejercicio cambió de categoría (pasa a Completados abajo o regresa a Pendientes)
        // Re-renderizar módulo preservando la posición exacta de scroll
        renderWorkoutModule(container, true);
      } else {
        // Solo actualizar el botón y la fila en el DOM directamente sin re-renderizar la página
        btn.textContent = willBeCompleted ? '✓' : '○';
        const row = btn.closest('.set-row');
        if (willBeCompleted) {
          btn.classList.add('bg-emerald-500', 'text-slate-950', 'shadow-sm');
          btn.classList.remove('bg-[var(--card)]', 'text-[var(--muted-foreground)]');
          if (row) {
            row.classList.add('bg-emerald-500/10', 'border-emerald-500/20');
            row.classList.remove('bg-[var(--card)]');
          }
        } else {
          btn.classList.remove('bg-emerald-500', 'text-slate-950', 'shadow-sm');
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
      timer.start(90);
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
}

// --------------------------------------------------------------------------
// SELECTOR DE PROGRAMACIÓN SEMANAL (CON INDICADOR DE "HOY")
// --------------------------------------------------------------------------
function renderWeeklyScheduleSelector(currentDayId, todayName) {
  const schedule = INITIAL_DATA.schedule || [];
  return `
    <div class="bg-[var(--card)] p-2.5 rounded-2xl border border-[var(--border)] shadow-xs">
      <div class="flex items-center justify-between px-1 mb-2">
        <div class="flex items-center gap-1.5">
          <span class="text-xs">📅</span>
          <span class="text-xs font-bold text-[var(--foreground)]">Programación Semanal</span>
        </div>
        <span class="text-[10px] font-extrabold text-amber-500 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
          Hoy es ${todayName}
        </span>
      </div>
      <div class="grid grid-cols-7 gap-1 sm:gap-1.5" id="dayTabs">
        ${schedule.map(item => {
          const isSelected = item.id === currentDayId;
          const isToday = item.id === state.todayDayId;
          return `
            <button 
              data-day="${item.id}" 
              class="day-tab-btn relative py-2 px-0.5 text-center rounded-xl transition-all flex flex-col items-center justify-center ${
                isSelected 
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm ring-2 ring-amber-400/40' 
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] font-medium'
              }">
              ${isToday ? `
                <span class="absolute -top-1.5 px-1 py-0.2 bg-emerald-500 text-[8px] font-black text-slate-950 rounded-full shadow-xs leading-none">
                  HOY
                </span>
              ` : ''}
              <span class="text-[10px] uppercase font-extrabold block ${isSelected ? 'text-slate-950' : 'text-[var(--muted-foreground)]'}">${item.shortDay}</span>
              <span class="text-xs my-0.5 block">${item.icon}</span>
              <span class="text-[9px] block leading-tight truncate max-w-full px-0.5 font-bold ${isSelected ? 'text-slate-950' : 'opacity-75'}">
                ${item.type === 'workout' ? item.name.replace(' ', '') : 'Relax'}
              </span>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// PANTALLA DIVERTIDA DE DÍA DE DESCANSO & REGENERACIÓN ACTIVA
// --------------------------------------------------------------------------
function renderRestDayScreen(restDay) {
  return `
    <div class="bg-[var(--card)] rounded-3xl border border-[var(--border)] overflow-hidden shadow-sm">
      <!-- Ilustración divertida de cabecera -->
      <div class="relative w-full aspect-[16/10] sm:aspect-[2/1] overflow-hidden bg-gradient-to-b from-amber-500/10 to-transparent">
        <img 
          src="${restDay.image || 'assets/images/rest_day_hero.jpg'}" 
          alt="Día de descanso Kinetix" 
          class="w-full h-full object-cover object-center"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-[var(--card)] via-transparent to-transparent"></div>
        <div class="absolute bottom-3 left-4 right-4">
          <span class="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md">
            🛋️ ${restDay.dayName} • ${restDay.title}
          </span>
          <h2 class="text-lg sm:text-xl font-black text-[var(--foreground)] mt-1 drop-shadow-sm">
            ${restDay.tagline}
          </h2>
        </div>
      </div>

      <div class="p-4 space-y-4">
        <p class="text-xs text-[var(--muted-foreground)] leading-relaxed">
          ${restDay.description}
        </p>

        <!-- TARJETA: ACTIVIDAD RECOMENDADA (Bicicleta suave / Regeneración) -->
        <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-lg">🚴</span>
            <h3 class="font-bold text-amber-500 text-sm">Opción Activa: Bicicleta Suave o Paseo</h3>
          </div>
          <p class="text-xs text-[var(--foreground)] leading-relaxed">
            ${restDay.activityRecommendation}
          </p>

          <!-- Cronómetro Rápido de Recuperación -->
          <div class="mt-3 pt-3 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div class="text-[11px] text-[var(--muted-foreground)]">
              <span>Objetivo sugerido:</span>
              <b class="text-[var(--foreground)]">${restDay.suggestedMinutes} minutos</b> en Zona 1 – Zona 2
            </div>
            <button id="btnStartRestCardio" data-minutes="${restDay.suggestedMinutes}" class="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5">
              <span>⏱️ Iniciar Temporizador (${restDay.suggestedMinutes} min)</span>
            </button>
          </div>
        </div>

        <!-- TIP CLÍNICO: CONVERSIÓN HORMONAL & HIPOTIROIDISMO -->
        <div class="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs flex items-start gap-2.5">
          <span class="text-base shrink-0 mt-0.5">🧬</span>
          <div>
            <h4 class="font-bold text-purple-400 text-xs mb-0.5">Enfoque Clínico: Protección Tiroidea</h4>
            <p class="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
              ${restDay.clinicalTip}
            </p>
          </div>
        </div>

        <!-- BOTONES ALTERNATIVOS SI DESEA ENTRENAR FUERZA HOY -->
        <div class="pt-3 border-t border-[var(--border)]">
          <p class="text-[11px] font-semibold text-[var(--muted-foreground)] mb-2.5 text-center">
            ¿Cambiaste tus días de gimnasio y prefieres entrenar fuerza hoy?
          </p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button data-switch-routine="torso1" class="btn-switch-routine p-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--border)] text-xs font-bold text-[var(--foreground)] border border-[var(--border)] text-center transition-all">
              🏋️ Torso 1 (Lunes)
            </button>
            <button data-switch-routine="pierna1" class="btn-switch-routine p-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--border)] text-xs font-bold text-[var(--foreground)] border border-[var(--border)] text-center transition-all">
              🦵 Pierna 1 (Martes)
            </button>
            <button data-switch-routine="torso2" class="btn-switch-routine p-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--border)] text-xs font-bold text-[var(--foreground)] border border-[var(--border)] text-center transition-all">
              💪 Torso 2 (Jueves)
            </button>
            <button data-switch-routine="pierna2" class="btn-switch-routine p-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--border)] text-xs font-bold text-[var(--foreground)] border border-[var(--border)] text-center transition-all">
              🔥 Pierna 2 (Viernes)
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
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
