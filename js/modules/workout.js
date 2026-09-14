// Módulo de Rutina de Entrenamiento, Guía Visual y Registro en Vivo
import { INITIAL_DATA } from '../data/initialData.js';
import { state } from '../state.js';
import { db } from '../services/db.js';
import { timer } from '../services/timer.js';

export function renderWorkoutModule(container) {
  const isLive = !!state.activeWorkout;
  const currentDayId = isLive ? state.activeWorkout.routineId : state.selectedDay;
  const routine = INITIAL_DATA.routines[currentDayId] || INITIAL_DATA.routines.torso1;

  container.innerHTML = `
    <div class="space-y-4 max-w-3xl mx-auto pb-24">
      
      <!-- Selector de Días (Deshabilitado durante sesión en vivo para no perder foco) -->
      ${!isLive ? `
        <div class="bg-[var(--card)] p-2 rounded-2xl border border-[var(--border)] shadow-xs">
          <div class="grid grid-cols-4 gap-1.5" id="dayTabs">
            ${Object.values(INITIAL_DATA.routines).map(r => `
              <button 
                data-day="${r.id}" 
                class="day-tab-btn py-2 px-1 text-center rounded-xl transition-all ${r.id === currentDayId 
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' 
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] font-medium'}">
                <span class="text-xs block font-bold">${r.name}</span>
                <span class="text-[10px] block opacity-80">${r.dayName}</span>
              </button>
            `).join('')}
          </div>
        </div>
      ` : `
        <!-- Banner de Sesión en Vivo -->
        <div class="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 rounded-2xl p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="relative flex h-3 w-3">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <h3 class="text-sm font-bold text-[var(--foreground)]">Entrenamiento en Curso: ${routine.title}</h3>
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

        <!-- Cardio Nota -->
        <div class="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <span class="text-amber-500">🏃</span>
          <span><b>Cardio Zona 2:</b> ${routine.cardio}</span>
        </div>
      </div>

      <!-- Lista de Ejercicios -->
      <div class="space-y-4">
        ${routine.exercises.map((ex, exIndex) => {
          const prevLog = db.getLastExerciseLog(ex.id);
          const activeExercise = isLive ? state.activeWorkout.exercises[exIndex] : null;

          return `
            <div class="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-xs overflow-hidden transition-all" id="card-${ex.id}">
              
              <!-- Cabecera del Ejercicio -->
              <div class="p-4 pb-3">
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

                  <!-- Badge de Carga Base / Registro Previo -->
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

              <!-- ZONA DE REGISTRO EN VIVO (Si la sesión está activa) -->
              ${isLive && activeExercise ? `
                <div class="bg-[var(--accent)]/30 border-t border-[var(--border)] p-3 sm:p-4">
                  <div class="space-y-2">
                    <div class="grid grid-cols-12 text-[10px] uppercase font-bold text-[var(--muted-foreground)] px-2">
                      <span class="col-span-2 text-center">Serie</span>
                      <span class="col-span-4 text-center">Peso (lb/placa)</span>
                      <span class="col-span-3 text-center">Reps</span>
                      <span class="col-span-3 text-center">Listo</span>
                    </div>

                    ${activeExercise.sets.map((set, setIndex) => `
                      <div class="grid grid-cols-12 items-center gap-2 p-1.5 rounded-xl ${set.completed ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-[var(--card)] border border-[var(--border)]'}">
                        <!-- Serie # -->
                        <span class="col-span-2 text-center text-xs font-mono font-bold text-[var(--muted-foreground)]">
                          ${set.setNumber}
                        </span>

                        <!-- Peso Input con botones +/- -->
                        <div class="col-span-4 flex items-center justify-center gap-1">
                          <button type="button" class="btn-step text-xs px-1.5 py-0.5 rounded bg-[var(--accent)] hover:bg-[var(--border)]" data-ex="${exIndex}" data-set="${setIndex}" data-field="weight" data-delta="-2.5">-</button>
                          <input 
                            type="number" 
                            step="any" 
                            value="${set.weight}" 
                            placeholder="Peso"
                            class="input-set-field w-14 text-center font-mono text-xs font-bold py-1 rounded-lg bg-transparent border border-[var(--border)] focus:border-amber-500 outline-none text-[var(--foreground)]"
                            data-ex="${exIndex}" 
                            data-set="${setIndex}" 
                            data-field="weight" />
                          <button type="button" class="btn-step text-xs px-1.5 py-0.5 rounded bg-[var(--accent)] hover:bg-[var(--border)]" data-ex="${exIndex}" data-set="${setIndex}" data-field="weight" data-delta="2.5">+</button>
                        </div>

                        <!-- Reps Input con botones +/- -->
                        <div class="col-span-3 flex items-center justify-center gap-1">
                          <button type="button" class="btn-step text-xs px-1.5 py-0.5 rounded bg-[var(--accent)] hover:bg-[var(--border)]" data-ex="${exIndex}" data-set="${setIndex}" data-field="reps" data-delta="-1">-</button>
                          <input 
                            type="number" 
                            value="${set.reps}" 
                            placeholder="Reps"
                            class="input-set-field w-10 text-center font-mono text-xs font-bold py-1 rounded-lg bg-transparent border border-[var(--border)] focus:border-amber-500 outline-none text-[var(--foreground)]"
                            data-ex="${exIndex}" 
                            data-set="${setIndex}" 
                            data-field="reps" />
                          <button type="button" class="btn-step text-xs px-1.5 py-0.5 rounded bg-[var(--accent)] hover:bg-[var(--border)]" data-ex="${exIndex}" data-set="${setIndex}" data-field="reps" data-delta="1">+</button>
                        </div>

                        <!-- Checkbox Completar Serie -->
                        <div class="col-span-3 flex justify-center">
                          <button 
                            type="button" 
                            class="btn-toggle-set w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${set.completed 
                              ? 'bg-emerald-500 text-slate-950 shadow-sm' 
                              : 'bg-[var(--card)] hover:bg-[var(--accent)] text-[var(--muted-foreground)] border border-[var(--border)]'}"
                            data-ex="${exIndex}" 
                            data-set="${setIndex}">
                            ${set.completed ? '✓' : '○'}
                          </button>
                        </div>
                      </div>
                    `).join('')}

                    <div class="flex items-center justify-between pt-1">
                      <button 
                        type="button" 
                        class="btn-add-set text-xs text-amber-500 hover:text-amber-400 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-amber-500/10 transition-colors"
                        data-ex="${exIndex}">
                        + Añadir Serie
                      </button>
                      <span class="text-[10px] text-[var(--muted-foreground)]">Descanso sugerido: 90 seg</span>
                    </div>
                  </div>
                </div>
              ` : ''}

            </div>
          `;
        }).join('')}
      </div>

    </div>
  `;

  // Attach Event Listeners
  attachWorkoutEvents(container, currentDayId);
}

function attachWorkoutEvents(container, currentDayId) {
  // Cambio de día en tabs
  container.querySelectorAll('.day-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
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
        const saved = state.finishWorkout();
        alert(`¡Excelente trabajo, Michael! Sesión guardada en tu historial.`);
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

  // Inputs de peso y reps
  container.querySelectorAll('.input-set-field').forEach(input => {
    input.addEventListener('change', (e) => {
      const exIndex = parseInt(input.getAttribute('data-ex'));
      const setIndex = parseInt(input.getAttribute('data-set'));
      const field = input.getAttribute('data-field');
      state.updateSet(exIndex, setIndex, field, input.value);
    });
  });

  // Botones +/-
  container.querySelectorAll('.btn-step').forEach(btn => {
    btn.addEventListener('click', () => {
      const exIndex = parseInt(btn.getAttribute('data-ex'));
      const setIndex = parseInt(btn.getAttribute('data-set'));
      const field = btn.getAttribute('data-field');
      const delta = parseFloat(btn.getAttribute('data-delta'));
      
      const currentVal = parseFloat(state.activeWorkout.exercises[exIndex].sets[setIndex][field]) || 0;
      const newVal = Math.max(0, currentVal + delta);
      state.updateSet(exIndex, setIndex, field, newVal);
    });
  });

  // Toggle de Serie Completada (Dispara el Temporizador de Descanso de 90s)
  container.querySelectorAll('.btn-toggle-set').forEach(btn => {
    btn.addEventListener('click', () => {
      const exIndex = parseInt(btn.getAttribute('data-ex'));
      const setIndex = parseInt(btn.getAttribute('data-set'));
      const isNowCompleted = state.toggleSetCompleted(exIndex, setIndex);

      if (isNowCompleted) {
        // Iniciar temporizador de descanso de 90s
        timer.start(90);
      }
    });
  });

  // Añadir Serie
  container.querySelectorAll('.btn-add-set').forEach(btn => {
    btn.addEventListener('click', () => {
      const exIndex = parseInt(btn.getAttribute('data-ex'));
      state.addSetToExercise(exIndex);
    });
  });
}
