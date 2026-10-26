// Plantillas de render del módulo de entrenamiento.
import { INITIAL_DATA } from '../data/initialData.js';
import { state } from '../state.js';
import { db } from '../services/db.js';
import { escapeHtml, escapeAttr, safeUrl } from '../utils/escape.js';
import { restSeconds } from './workout-utils.js';
import { icon } from '../ui/icons.js';

// Un solo set de iconos de línea para días y acciones.
const DAY_ICONS = {
  torso1: 'dumbbell',
  pierna1: 'footprints',
  torso2: 'dumbbell',
  pierna2: 'flame',
  rest_wednesday: 'bike',
  rest_saturday: 'bed-double',
  rest_sunday: 'bed-double'
};

// 1. Tarjeta de Ejercicio de Fuerza en Modo Previa
export function renderStaticExerciseCard(ex, exIndex, prevLog) {
  const customWeight = db.getCustomWeight(ex.id);
  const suggestion = db.getProgressiveOverloadSuggestion(ex);
  const displayWeightBadge = customWeight !== null
    ? `Meta: ${customWeight} kg`
    : (prevLog ? `${prevLog.bestWeight} kg × ${prevLog.bestReps}` : (ex.baseWeight !== 'Pendiente' && ex.baseWeight !== 'Auto' ? `${ex.baseWeight} kg/placa` : 'Pendiente'));

  return `
    <div class="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-xs overflow-hidden transition-all" id="card-${ex.id}">
      <div class="p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--accent)] text-[var(--muted-foreground)]">
                #${exIndex + 1}
              </span>
              <h3 class="font-bold text-sm sm:text-base text-[var(--foreground)]">${escapeHtml(ex.name)}</h3>
            </div>
            <p class="text-xs text-[var(--muted-foreground)] mt-0.5">${escapeHtml(ex.machineName)}</p>
            <div class="flex flex-wrap items-center gap-1.5 mt-2">
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--muted-foreground)] font-medium">
                ${escapeHtml(ex.targetMuscles)}
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                Pauta: ${escapeHtml(ex.defaultSets)} series x ${escapeHtml(ex.defaultReps)} reps
              </span>
            </div>
          </div>

          <div class="text-right shrink-0">
            <span class="text-[10px] text-[var(--muted-foreground)] block">${customWeight !== null ? 'Peso base activo:' : 'Marca previa:'}</span>
            <span class="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] inline-block mt-0.5">
              ${displayWeightBadge}
            </span>
          </div>
        </div>

        ${suggestion && suggestion.shouldUpgrade ? `
          <div class="mt-3 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-emerald-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div class="flex items-start sm:items-center gap-2">
              <span class="shrink-0 text-amber-500">${icon('flame', 'w-5 h-5')}</span>
              <div class="leading-tight">
                <span class="font-extrabold text-amber-500 block text-[13px]">Smart Coach • Sobrecarga Progresiva</span>
                <span class="text-[12px] text-[var(--muted-foreground)]">
                  Dominaste <b>${suggestion.previousWeight} kg × ${suggestion.previousReps} reps</b> (tope de ${suggestion.targetRepRange}). Sugerido: <b class="text-emerald-500">${suggestion.nextWeight} kg</b> (+${suggestion.increment} kg).
                </span>
              </div>
            </div>
            <button 
              type="button" 
              class="btn-apply-smart-coach btn-touch shrink-0 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[12px] shadow-xs transition-all inline-flex items-center justify-center gap-1.5"
              data-id="${escapeAttr(ex.id)}"
              data-weight="${suggestion.nextWeight}">
              ${icon('zap', 'w-4 h-4')} Subir a ${suggestion.nextWeight} kg
            </button>
          </div>
        ` : ''}

        <!-- Botón colapsable para Ver Imagen y Tips Técnicos -->
        <div class="mt-3">
          <button data-toggle="tips-${escapeAttr(ex.id)}" aria-expanded="false" aria-controls="tips-${escapeAttr(ex.id)}" class="tips-toggle-btn btn-touch text-[13px] text-amber-500 hover:text-amber-400 font-semibold flex items-center gap-1.5 transition-colors w-full">
            ${icon('book-open', 'w-4 h-4')}
            <span>Ver infografía de máquina y tips</span>
            <span class="ml-auto transition-transform duration-200" id="arrow-tips-${escapeAttr(ex.id)}">${icon('chevron-down', 'w-4 h-4')}</span>
          </button>

          <div id="tips-${escapeAttr(ex.id)}" class="hidden mt-3 pt-3 border-t border-[var(--border)] space-y-3">
            ${ex.image ? `
              <div class="rounded-xl overflow-hidden border border-[var(--border)] bg-black/20 max-w-md mx-auto">
                <img src="${safeUrl(ex.image)}" alt="${escapeAttr(ex.name)}" class="w-full h-auto object-cover" loading="lazy" />
              </div>
            ` : ''}

            <div class="bg-[var(--accent)]/50 rounded-xl p-3 text-[13px] space-y-2">
              <div>
                <b class="text-[var(--foreground)] inline-flex items-center gap-1.5">${icon('wrench', 'w-4 h-4')} Ajuste de asiento / máquina:</b>
                <p class="text-[var(--muted-foreground)] mt-0.5">${escapeHtml(ex.seatAdjustment)}</p>
              </div>
              <div>
                <b class="text-[var(--foreground)] inline-flex items-center gap-1.5">${icon('lightbulb', 'w-4 h-4')} Claves de ejecución:</b>
                <ul class="list-disc list-inside space-y-1 text-[var(--muted-foreground)] mt-1">
                  ${(ex.tips || []).map(t => `<li>${escapeHtml(t)}</li>`).join('')}
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
export function renderStaticCardioCard(ex, exIndex) {
  const profile = db.getProfile();
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
                ${icon('activity', 'w-4 h-4 text-amber-500')} <span>${escapeHtml(ex.name)}</span>
              </h3>
            </div>
            <p class="text-xs text-amber-500 font-semibold mt-0.5">${escapeHtml(ex.machineName)}</p>
            <div class="flex flex-wrap items-center gap-1.5 mt-2">
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                ${escapeHtml(ex.baseWeight)}
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                Duración: ${escapeHtml(ex.defaultReps)}
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--muted-foreground)] font-medium">
                Al Final de las Máquinas
              </span>
            </div>
          </div>
        </div>

        <!-- Explicación Fisiológica de por qué se hace al final -->
        <div class="mt-3 p-3 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)] text-[13px] text-[var(--muted-foreground)] space-y-1">
          <p class="text-[var(--foreground)] font-bold flex items-center gap-1.5 text-[12px]">
            <span class="text-amber-500">${icon('lightbulb', 'w-4 h-4')}</span> ¿Por qué va siempre al final de las máquinas?
          </p>
          <p class="text-[12px] leading-relaxed">
            1. <b>Protege tu fuerza${profile.fatFreeMass > 0 ? ` y tus ${profile.fatFreeMass} kg de masa magra` : ' y tu masa magra'}:</b> Las pesas requieren glucógeno intacto.<br>
            2. <b>Quema máxima de grasa visceral:</b> Tras las máquinas, tu glucosa e insulina están bajas, por lo que el cardio en Zona 2 fuerza al organismo a consumir directamente los depósitos grasos del tronco.
          </p>
          <div class="pt-1 text-[12px] text-[var(--foreground)]">
            <b class="inline-flex items-center gap-1.5">${icon('wrench', 'w-4 h-4')} Ajuste recomendado:</b> ${escapeHtml(ex.seatAdjustment)}
          </div>
        </div>
      </div>
    </div>
  `;
}

// 3. Tarjeta de Ejercicio de Fuerza en Vivo (Pendiente)
export function renderLiveExerciseCard(ex, exIndex, def, prevLog) {
  const suggestion = db.getProgressiveOverloadSuggestion({ ...def, id: ex.exerciseId });
  const currentSetWeight = Number(ex.sets?.[0]?.weight) || 0;
  const showSuggestion = suggestion && suggestion.shouldUpgrade && currentSetWeight < suggestion.nextWeight;
  const baseSets = Number(def?.defaultSets) || ex.sets.length;

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
              <h3 class="font-bold text-sm sm:text-base text-[var(--foreground)]">${escapeHtml(ex.exerciseName)}</h3>
            </div>
            <p class="text-xs text-[var(--muted-foreground)] mt-0.5">${escapeHtml(def.machineName || '')}</p>
            <div class="flex flex-wrap items-center gap-1.5 mt-2">
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--muted-foreground)] font-medium">
                ${escapeHtml(def.targetMuscles || 'Fuerza')}
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                Pauta: ${escapeHtml(def.defaultSets || 3)} series x ${escapeHtml(def.defaultReps || '8-10')} reps
              </span>
            </div>
          </div>

          <!-- Marca previa -->
          <div class="text-right shrink-0">
            <span class="text-[10px] text-[var(--muted-foreground)] block">Marca previa:</span>
            <span class="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] inline-block mt-0.5">
              ${prevLog ? `${prevLog.bestWeight} kg × ${prevLog.bestReps}` : (def.baseWeight && def.baseWeight !== 'Pendiente' ? `${def.baseWeight} kg` : 'Pendiente')}
            </span>
          </div>
        </div>

        ${showSuggestion ? `
          <div class="mt-3 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-emerald-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div class="flex items-start sm:items-center gap-2">
              <span class="shrink-0 text-amber-500">${icon('flame', 'w-5 h-5')}</span>
              <div class="leading-tight">
                <span class="font-extrabold text-amber-500 block text-[13px]">Smart Coach • Subida de Placa Sugerida</span>
                <span class="text-[12px] text-[var(--muted-foreground)]">
                  Lograste <b>${suggestion.previousWeight} kg × ${suggestion.previousReps} reps</b>. ¿Aplicar <b class="text-emerald-500">${suggestion.nextWeight} kg</b> (+${suggestion.increment} kg) a tus series de hoy?
                </span>
              </div>
            </div>
            <button 
              type="button" 
              class="btn-apply-smart-coach btn-touch shrink-0 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[12px] shadow-xs transition-all inline-flex items-center justify-center gap-1.5"
              data-id="${escapeAttr(ex.exerciseId)}"
              data-ex="${exIndex}"
              data-weight="${suggestion.nextWeight}">
              ${icon('zap', 'w-4 h-4')} Aplicar ${suggestion.nextWeight} kg
            </button>
          </div>
        ` : ''}

        <!-- Tips colapsables -->
        <div class="mt-3">
          <button data-toggle="tips-${escapeAttr(ex.exerciseId)}" aria-expanded="false" aria-controls="tips-${escapeAttr(ex.exerciseId)}" class="tips-toggle-btn btn-touch text-[13px] text-amber-500 hover:text-amber-400 font-semibold flex items-center gap-1.5 transition-colors w-full">
            ${icon('book-open', 'w-4 h-4')}
            <span>Ver infografía de máquina y tips</span>
            <span class="ml-auto transition-transform duration-200" id="arrow-tips-${escapeAttr(ex.exerciseId)}">${icon('chevron-down', 'w-4 h-4')}</span>
          </button>

          <div id="tips-${escapeAttr(ex.exerciseId)}" class="hidden mt-3 pt-3 border-t border-[var(--border)] space-y-3">
            ${def.image ? `
              <div class="rounded-xl overflow-hidden border border-[var(--border)] bg-black/20 max-w-md mx-auto">
                <img src="${safeUrl(def.image)}" alt="${escapeAttr(ex.exerciseName)}" class="w-full h-auto object-cover" loading="lazy" />
              </div>
            ` : ''}

            <div class="bg-[var(--accent)]/50 rounded-xl p-3 text-[13px] space-y-2">
              <div>
                <b class="text-[var(--foreground)] inline-flex items-center gap-1.5">${icon('wrench', 'w-4 h-4')} Ajuste de asiento / máquina:</b>
                <p class="text-[var(--muted-foreground)] mt-0.5">${escapeHtml(def.seatAdjustment || 'Ajustar a la altura anatómica cómoda.')}</p>
              </div>
              <div>
                <b class="text-[var(--foreground)] inline-flex items-center gap-1.5">${icon('lightbulb', 'w-4 h-4')} Claves de ejecución:</b>
                <ul class="list-disc list-inside space-y-1 text-[var(--muted-foreground)] mt-1">
                  ${(def.tips || []).map(t => `<li>${escapeHtml(t)}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ZONA DE REGISTRO EN VIVO -->
      <div class="bg-[var(--accent)]/30 border-t border-[var(--border)] p-3 sm:p-4">
        <div class="space-y-2.5">
          ${ex.sets.map((set, setIndex) => renderSetRow(exIndex, setIndex, set, setIndex >= baseSets)).join('')}

          <div class="flex flex-col xs:flex-row xs:items-center justify-between gap-2 pt-2 border-t border-[var(--border)]/40 mt-1">
            <button 
              type="button" 
              class="btn-add-set btn-touch text-[13px] text-amber-500 hover:text-amber-400 font-semibold flex items-center justify-center gap-1.5 px-3 rounded-xl hover:bg-amber-500/10 border border-amber-500/20 transition-colors"
              data-ex="${exIndex}">
              ${icon('plus', 'w-4 h-4')} Añadir serie
            </button>

            <div class="flex items-center justify-between xs:justify-end gap-2">
              <span class="text-[11px] text-[var(--muted-foreground)]">Descanso: ${restSeconds()}s</span>
              <button 
                type="button" 
                class="btn-complete-all-sets btn-touch text-[12px] font-bold px-3 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all inline-flex items-center justify-center gap-1.5"
                data-ex="${exIndex}"
                title="Marcar todas las series listas y mover a completados">
                ${icon('check', 'w-4 h-4')} Marcar todo listo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 4. Tarjeta de Cardio Finisher en Vivo (Con selector de minutos y botón de completar)
export function renderLiveCardioCard(ex, exIndex, def) {
  const currentMins = Number(ex.minutes ?? ex.sets?.[0]?.weight) || 20;

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
                ${icon('activity', 'w-4 h-4 text-amber-500')} <span>${escapeHtml(ex.exerciseName)}</span>
              </h3>
            </div>
            <p class="text-xs text-amber-500 font-semibold mt-0.5">${escapeHtml(def.machineName || 'Caminadora / Elíptica')}</p>
            <div class="flex flex-wrap items-center gap-1.5 mt-2">
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                ${escapeHtml(def.baseWeight || 'Zona 2 (110-125 lpm)')}
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-bold border border-amber-500/25">
                Al Final de las Máquinas
              </span>
            </div>
          </div>
        </div>

        <div class="mt-3 p-3 rounded-xl bg-[var(--accent)]/60 border border-[var(--border)] text-[13px] text-[var(--muted-foreground)] space-y-1">
          <p class="text-[var(--foreground)] font-bold text-[12px] flex items-center gap-1.5">
            <span class="text-amber-500">${icon('lightbulb', 'w-4 h-4')}</span> Instrucción de ejecución:
          </p>
          <p class="text-[12px] leading-relaxed">
            ${escapeHtml(def.seatAdjustment || 'Ajustar a inclinación y ritmo constante.')}
          </p>
        </div>
      </div>

      <!-- Zona Interactiva de Cardio -->
      <div class="bg-[var(--accent)]/40 border-t border-[var(--border)] p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          
          <!-- Selector de minutos -->
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs text-[var(--muted-foreground)] font-semibold">Minutos realizados:</span>
            <div class="flex items-center gap-1">
              <button type="button" class="btn-cardio-adjust btn-touch text-xs px-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--border)] text-[var(--foreground)] font-bold transition-colors" data-ex="${exIndex}" data-delta="-5">-5m</button>
              <span id="cardioMinsDisplay-${exIndex}" class="text-sm font-mono font-bold px-3 min-h-11 flex items-center bg-[var(--card)] rounded-lg text-[var(--foreground)] border border-[var(--border)]">${currentMins} min</span>
              <button type="button" class="btn-cardio-adjust btn-touch text-xs px-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--border)] text-[var(--foreground)] font-bold transition-colors" data-ex="${exIndex}" data-delta="5">+5m</button>
            </div>
          </div>

          <!-- Botón de Completar Cardio -->
          <button 
            type="button" 
            class="btn-toggle-set btn-touch px-3 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 hover:brightness-110"
            data-ex="${exIndex}" 
            data-set="0">
            ${icon('zap', 'w-4 h-4')} <span>Cardio completado (${currentMins} min)</span>
          </button>

        </div>
      </div>
    </div>
  `;
}

// 5. Fila interactiva de cada serie (dos steppers apilados + botón Listo)
// A 320 px no caben dos steppers de 44 px en una sola línea; apilarlos
// mantiene targets táctiles reales y deja espacio para decimales como 21.25.
function renderSetRow(exIndex, setIndex, set, canRemove = false) {
  const isDone = !!set.completed;
  const setNumber = set.setNumber;

  const stepper = ({ field, label, value, inputLabel, minusLabel, plusLabel, delta }) => `
    <div class="flex items-center gap-1.5">
      <span class="w-8 shrink-0 text-[11px] uppercase font-bold text-[var(--muted-foreground)]" aria-hidden="true">${label}</span>
      <div class="flex-1 min-w-0 h-12 flex items-stretch rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden focus-within:border-amber-500 transition-colors">
        <button type="button" class="btn-step w-11 shrink-0 flex items-center justify-center bg-[var(--accent)] hover:bg-[var(--border)] active:bg-[var(--border)] text-[var(--foreground)] border-r border-[var(--border)] select-none" data-ex="${exIndex}" data-set="${setIndex}" data-field="${field}" data-delta="${-delta}" aria-label="${minusLabel}">${icon('minus', 'w-4 h-4')}</button>
        <input
          type="number"
          step="any"
          value="${escapeAttr(value)}"
          placeholder="${field === 'weight' ? 'kg' : 'reps'}"
          class="input-set-field flex-1 min-w-0 h-full text-center font-mono text-[12px] font-bold bg-transparent outline-none text-[var(--foreground)] px-0"
          data-ex="${exIndex}"
          data-set="${setIndex}"
          data-field="${field}"
          aria-label="${inputLabel}" />
        <button type="button" class="btn-step w-11 shrink-0 flex items-center justify-center bg-[var(--accent)] hover:bg-[var(--border)] active:bg-[var(--border)] text-[var(--foreground)] border-l border-[var(--border)] select-none" data-ex="${exIndex}" data-set="${setIndex}" data-field="${field}" data-delta="${delta}" aria-label="${plusLabel}">${icon('plus', 'w-4 h-4')}</button>
      </div>
    </div>
  `;

  return `
    <div class="set-row p-2 rounded-xl transition-all ${isDone ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-[var(--card)] border border-[var(--border)]'}" data-ex="${exIndex}" data-set="${setIndex}">
      <div class="flex items-stretch gap-2">
        <div class="flex-1 min-w-0 space-y-1">
          ${stepper({
            field: 'weight',
            label: 'Peso',
            value: set.weight,
            inputLabel: `Peso en kg de la serie ${setNumber}`,
            minusLabel: `Bajar 2.5 kg de la serie ${setNumber}`,
            plusLabel: `Subir 2.5 kg de la serie ${setNumber}`,
            delta: 2.5
          })}
          ${stepper({
            field: 'reps',
            label: 'Reps',
            value: set.reps,
            inputLabel: `Repeticiones de la serie ${setNumber}`,
            minusLabel: `Restar una repetición a la serie ${setNumber}`,
            plusLabel: `Sumar una repetición a la serie ${setNumber}`,
            delta: 1
          })}
        </div>

        <!-- Listo: 44×44 con el número de serie como referencia visual -->
        <button
          type="button"
          class="btn-toggle-set w-11 shrink-0 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all ${isDone
            ? 'bg-emerald-500 text-slate-950 border border-emerald-500 shadow-sm'
            : 'bg-[var(--card)] hover:bg-[var(--accent)] text-[var(--muted-foreground)] border border-[var(--border)]'}"
          data-ex="${exIndex}"
          data-set="${setIndex}"
          aria-pressed="${isDone}"
          aria-label="${isDone ? 'Desmarcar' : 'Marcar'} la serie ${setNumber} como completada">
          <span class="text-[10px] font-extrabold leading-none">#${setNumber}</span>
          ${isDone ? icon('check', 'w-5 h-5') : icon('circle', 'w-5 h-5')}
        </button>
      </div>

      ${canRemove ? `
        <div class="mt-1 flex justify-end">
          <button
            type="button"
            class="btn-remove-set w-11 h-11 inline-flex items-center justify-center text-rose-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
            data-ex="${exIndex}"
            data-set="${setIndex}"
            aria-label="Eliminar la serie agregada ${setNumber}"
            title="Eliminar serie agregada">${icon('trash-2', 'w-5 h-5')}</button>
        </div>
      ` : ''}
    </div>
  `;
}

// 6. Tarjeta compacta para Ejercicio Completado (Al final de la pantalla)
export function renderCompletedExerciseCard(ex, exIndex, def) {
  const isCardio = !!ex.isCardio || !!def.isCardio;
  const baseSets = Number(def?.defaultSets) || ex.sets.length;
  const setsSummary = isCardio
    ? `${Number(ex.minutes ?? ex.sets?.[0]?.weight) || 20} min en Zona 2 completados`
    : ex.sets.map(s => `${s.weight ? `${s.weight}kg` : ''} x ${s.reps}`).join(' • ');

  return `
    <div class="bg-[var(--card)]/75 border border-emerald-500/30 rounded-2xl p-3 shadow-xs transition-all opacity-95" id="card-${ex.exerciseId}">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">${icon('check', 'w-4 h-4')}</span>
          <div class="truncate">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-mono font-bold px-1 rounded bg-[var(--accent)] text-[var(--muted-foreground)]">#${exIndex + 1}</span>
              <h4 class="text-xs sm:text-sm font-bold text-[var(--foreground)] truncate">${escapeHtml(ex.exerciseName)}</h4>
            </div>
            <p class="text-[11px] text-[var(--muted-foreground)] truncate mt-0.5">${escapeHtml(setsSummary)}</p>
          </div>
        </div>

        <button 
          type="button" 
          class="btn-expand-completed btn-touch shrink-0 text-[12px] font-semibold text-amber-500 hover:text-amber-400 px-3 rounded-xl bg-[var(--accent)] border border-[var(--border)] flex items-center gap-1.5 transition-colors"
          data-ex="${exIndex}"
          aria-expanded="false"
          aria-controls="completed-editor-${exIndex}">
          <span>Editar</span>
          <span class="transition-transform duration-200" id="arrow-completed-${exIndex}">${icon('chevron-down', 'w-4 h-4')}</span>
        </button>
      </div>

      <!-- Editor de Series (Colapsado por defecto) -->
      <div id="completed-editor-${exIndex}" class="hidden mt-3 pt-3 border-t border-[var(--border)] space-y-2">
        <p class="text-[12px] text-[var(--muted-foreground)]">Desmarca para devolver esta actividad a la lista de pendientes:</p>
        
        ${isCardio ? `
          <div class="flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-2 rounded-xl bg-[var(--accent)]/40 border border-[var(--border)]">
            <span class="text-[13px] font-bold text-[var(--foreground)]">Cardio: ${Number(ex.minutes ?? ex.sets?.[0]?.weight) || 20} min Zona 2</span>
            <button 
              type="button" 
              class="btn-toggle-set btn-touch text-xs font-bold px-3 rounded-lg bg-emerald-500 text-slate-950 inline-flex items-center justify-center gap-1.5"
              data-ex="${exIndex}" 
              data-set="0">
              ${icon('check', 'w-4 h-4')} Completado (desmarcar)
            </button>
          </div>
        ` : `
          <div class="space-y-2.5">
            ${ex.sets.map((set, setIndex) => renderSetRow(exIndex, setIndex, set, setIndex >= baseSets)).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------

// SELECTOR DE PROGRAMACIÓN SEMANAL (CON INDICADOR DE "HOY")
// --------------------------------------------------------------------------
export function renderWeeklyScheduleSelector(currentDayId, todayName) {
  const schedule = INITIAL_DATA.schedule || [];
  return `
    <div class="bg-[var(--card)] p-2.5 rounded-2xl border border-[var(--border)] shadow-xs">
      <div class="flex items-center justify-between px-1 mb-2">
        <div class="flex items-center gap-1.5">
          <span class="text-[var(--muted-foreground)]">${icon('calendar', 'w-4 h-4')}</span>
          <span class="text-xs font-bold text-[var(--foreground)]">Programación Semanal</span>
        </div>
        <span class="text-[11px] font-extrabold text-amber-500 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
          Hoy es ${todayName}
        </span>
      </div>
      <div class="grid grid-cols-7 gap-1 sm:gap-1.5" id="dayTabs" role="group" aria-label="Días de la semana">
        ${schedule.map(item => {
          const isSelected = item.id === currentDayId;
          const isToday = item.id === state.todayDayId;
          const shortLabel = item.type === 'workout'
            ? (item.name.toLowerCase().startsWith('torso') ? 'Torso' : 'Pierna')
            : 'Rest';
          return `
            <button
              data-day="${escapeAttr(item.id)}"
              aria-pressed="${isSelected}"
              class="day-tab-btn relative min-h-16 py-2 px-0.5 text-center rounded-xl transition-all flex flex-col items-center justify-center ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm ring-2 ring-amber-400/40'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] font-medium'
              }">
              ${isToday ? `
                <span class="absolute -top-1.5 px-1 py-0.5 bg-emerald-500 text-[9px] font-black text-slate-950 rounded-full shadow-xs leading-none">
                  HOY
                </span>
              ` : ''}
              <span class="text-[11px] uppercase font-extrabold block ${isSelected ? 'text-slate-950' : 'text-[var(--muted-foreground)]'}">${escapeHtml(item.shortDay)}</span>
              <span class="my-0.5 block ${isSelected ? 'text-slate-950' : 'text-amber-500'}" aria-hidden="true">${icon(DAY_ICONS[item.id] || 'dumbbell', 'w-4 h-4')}</span>
              <span class="hidden xs:block text-[11px] leading-tight truncate max-w-full px-0.5 font-bold ${isSelected ? 'text-slate-950' : 'text-[var(--muted-foreground)]'}" aria-hidden="true">
                ${shortLabel}
              </span>
              <span class="sr-only">${escapeHtml(item.type === 'workout' ? item.name : 'Descanso')}</span>
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
export function renderRestDayScreen(restDay) {
  return `
    <div class="bg-[var(--card)] rounded-3xl border border-[var(--border)] overflow-hidden shadow-sm">
      <!-- Ilustración divertida de cabecera -->
      <div class="relative w-full aspect-[16/10] sm:aspect-[2/1] overflow-hidden bg-gradient-to-b from-amber-500/10 to-transparent">
        <img
          src="${safeUrl(restDay.image, 'assets/images/rest_day_hero.webp')}"
          alt="Día de descanso Kinetix"
          class="w-full h-full object-cover object-center"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-[var(--card)] via-transparent to-transparent"></div>
        <div class="absolute bottom-3 left-4 right-4">
          <span class="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-md inline-flex items-center gap-1.5">
            ${icon('bed-double', 'w-4 h-4')} ${escapeHtml(restDay.dayName)} • ${escapeHtml(restDay.title)}
          </span>
          <h2 class="text-lg sm:text-xl font-black text-[var(--foreground)] mt-1 drop-shadow-sm">
            ${escapeHtml(restDay.tagline)}
          </h2>
        </div>
      </div>

      <div class="p-4 space-y-4">
        <p class="text-[13px] text-[var(--muted-foreground)] leading-relaxed">
          ${escapeHtml(restDay.description)}
        </p>

        <!-- TARJETA: ACTIVIDAD RECOMENDADA (Bicicleta suave / Regeneración) -->
        <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-amber-500">${icon('bike', 'w-5 h-5')}</span>
            <h3 class="font-bold text-amber-500 text-sm">Opción Activa: Bicicleta Suave o Paseo</h3>
          </div>
          <p class="text-[13px] text-[var(--foreground)] leading-relaxed">
            ${escapeHtml(restDay.activityRecommendation)}
          </p>

          <!-- Cronómetro Rápido de Recuperación -->
          <div class="mt-3 pt-3 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div class="text-[12px] text-[var(--muted-foreground)]">
              <span>Objetivo sugerido:</span>
              <b class="text-[var(--foreground)]">${escapeHtml(restDay.suggestedMinutes)} minutos</b> en Zona 1 – Zona 2
            </div>
            <button id="btnStartRestCardio" data-minutes="${escapeAttr(restDay.suggestedMinutes)}" class="btn-touch px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5">
              ${icon('timer', 'w-4 h-4')} Iniciar temporizador (${escapeHtml(restDay.suggestedMinutes)} min)
            </button>
          </div>
        </div>

        <!-- TIP CLÍNICO: CONVERSIÓN HORMONAL & HIPOTIROIDISMO -->
        <div class="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs flex items-start gap-2.5">
          <span class="shrink-0 mt-0.5 text-purple-500">${icon('dna', 'w-5 h-5')}</span>
          <div>
            <h4 class="font-bold text-purple-500 text-xs mb-0.5">Enfoque Clínico: Protección Tiroidea</h4>
            <p class="text-[12px] text-[var(--muted-foreground)] leading-relaxed">
              ${escapeHtml(restDay.clinicalTip)}
            </p>
          </div>
        </div>

        <!-- BOTONES ALTERNATIVOS SI DESEA ENTRENAR FUERZA HOY -->
        <div class="pt-3 border-t border-[var(--border)]">
          <p class="text-[12px] font-semibold text-[var(--muted-foreground)] mb-2.5 text-center">
            ¿Cambiaste tus días de gimnasio y prefieres entrenar fuerza hoy?
          </p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button data-switch-routine="torso1" class="btn-switch-routine btn-touch p-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--border)] text-xs font-bold text-[var(--foreground)] border border-[var(--border)] text-center transition-all inline-flex items-center justify-center gap-1.5">
              ${icon('dumbbell', 'w-4 h-4')} Torso 1
            </button>
            <button data-switch-routine="pierna1" class="btn-switch-routine btn-touch p-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--border)] text-xs font-bold text-[var(--foreground)] border border-[var(--border)] text-center transition-all inline-flex items-center justify-center gap-1.5">
              ${icon('footprints', 'w-4 h-4')} Pierna 1
            </button>
            <button data-switch-routine="torso2" class="btn-switch-routine btn-touch p-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--border)] text-xs font-bold text-[var(--foreground)] border border-[var(--border)] text-center transition-all inline-flex items-center justify-center gap-1.5">
              ${icon('dumbbell', 'w-4 h-4')} Torso 2
            </button>
            <button data-switch-routine="pierna2" class="btn-switch-routine btn-touch p-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--border)] text-xs font-bold text-[var(--foreground)] border border-[var(--border)] text-center transition-all inline-flex items-center justify-center gap-1.5">
              ${icon('flame', 'w-4 h-4')} Pierna 2
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
