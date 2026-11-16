// Módulo de Rutina de Entrenamiento, Guía Visual y Registro en Vivo
import { INITIAL_DATA } from '../data/initialData.js';
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { db, todayKey, formatDisplayDate } from '../services/db.js';
import { timer } from '../services/timer.js';
import {
  PAUSE_REASONS,
  getPauseReasonMeta,
  addDaysToDateKey,
  computePauseDaysCount,
  summarizeTrainingPauses
} from '../services/wellness-calc.js';
import { escapeHtml, escapeAttr } from '../utils/escape.js';
import { showToast, confirmAction, pushModalHistory } from '../ui/toast.js';
import { icon } from '../ui/icons.js';

import { renderStaticExerciseCard, renderStaticCardioCard, renderLiveExerciseCard, renderLiveCardioCard, renderCompletedExerciseCard, renderWeeklyScheduleSelector, renderRestDayScreen } from './workout-render.js';
import { getExerciseDefinition, restSeconds } from './workout-utils.js';

let undoToastRemove = null;
let pauseModalHistory = null;
let pauseEscapeHandler = null;
let showPauseHistory = false;

// El descanso no debe sobrevivir al cierre de la sesión.
function dismissRestTimer() {
  timer.dismiss();
  document.getElementById('floatingTimer')?.classList.add('hidden');
}

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

// Progreso semanal simple: sesiones completadas esta semana frente al
// número de rutinas de fuerza del programa (4). Sin rachas ni puntos.
function computeWeeklyProgress(logs) {
  const counts = new Map();
  (logs || []).forEach((log) => {
    const start = getWeekStart(log?.date || log?.startTime || log?.endTime);
    if (!start) return;
    const key = start.getTime();
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const thisWeek = getWeekStart(new Date());
  const target = Object.values(INITIAL_DATA.routines || {})
    .filter(routine => routine && Array.isArray(routine.exercises)).length || 4;

  return {
    sessions: counts.get(thisWeek.getTime()) || 0,
    target
  };
}

function pauseToneClasses(tone) {
  if (tone === 'rose') {
    return {
      card: 'bg-rose-500/10 border-rose-500/30',
      icon: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      badge: 'text-rose-400'
    };
  }
  if (tone === 'sky') {
    return {
      card: 'bg-sky-500/10 border-sky-500/30',
      icon: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      badge: 'text-sky-400'
    };
  }
  if (tone === 'amber') {
    return {
      card: 'bg-amber-500/10 border-amber-500/30',
      icon: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
      badge: 'text-amber-500'
    };
  }
  if (tone === 'indigo') {
    return {
      card: 'bg-indigo-500/10 border-indigo-500/30',
      icon: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      badge: 'text-indigo-400'
    };
  }
  return {
    card: 'bg-[var(--card)] border-[var(--border)]',
    icon: 'bg-[var(--accent)] text-[var(--muted-foreground)] border-[var(--border)]',
    badge: 'text-[var(--muted-foreground)]'
  };
}

function renderPauseHistoryBlock(pauses = []) {
  if (!showPauseHistory || pauses.length === 0) return '';
  return `
    <div class="mt-3 pt-2.5 border-t border-[var(--border)] space-y-2">
      <div class="flex items-center justify-between text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
        <span>Pausas registradas (${pauses.length})</span>
        <span>Contexto del historial</span>
      </div>
      <div class="space-y-1.5">
        ${pauses.slice(0, 6).map((p) => {
          const meta = getPauseReasonMeta(p.reason);
          const tone = pauseToneClasses(meta.tone);
          const days = computePauseDaysCount(p.startDate, p.endDate);
          const dateLabel = p.startDate === p.endDate
            ? formatDisplayDate(p.startDate, { day: '2-digit', month: 'short' })
            : `${formatDisplayDate(p.startDate, { day: '2-digit', month: 'short' })} – ${formatDisplayDate(p.endDate, { day: '2-digit', month: 'short' })}`;
          return `
            <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)] flex items-center justify-between gap-2 text-xs">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-bold ${tone.badge}">${escapeHtml(p.title || meta.label)}</span>
                  <span class="text-[10px] font-mono text-[var(--muted-foreground)]">${escapeHtml(dateLabel)} (${days} ${days === 1 ? 'día' : 'días'})</span>
                </div>
                ${p.notes ? `<p class="text-[11px] text-[var(--muted-foreground)] truncate mt-0.5">${escapeHtml(p.notes)}</p>` : ''}
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button type="button" class="btn-edit-pause btn-touch px-2 rounded-lg text-[11px] font-bold text-amber-500 hover:bg-amber-500/10" data-pause-id="${escapeAttr(p.pauseId)}">Editar</button>
                <button type="button" class="btn-delete-pause btn-touch w-9 rounded-lg text-[var(--muted-foreground)] hover:text-rose-500 hover:bg-rose-500/10 inline-flex items-center justify-center" data-pause-id="${escapeAttr(p.pauseId)}" aria-label="Eliminar pausa">${icon('trash-2', 'w-4 h-4')}</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderWeeklyProgress(progress, pauseSummary) {
  const activePause = pauseSummary?.activePause;
  const totalPauses = pauseSummary?.total || 0;
  const percent = Math.min(100, Math.round((progress.sessions / progress.target) * 100));

  if (activePause) {
    const meta = getPauseReasonMeta(activePause.reason);
    const tone = pauseToneClasses(meta.tone);
    const days = computePauseDaysCount(activePause.startDate, activePause.endDate);
    const rangeLabel = activePause.startDate === activePause.endDate
      ? formatDisplayDate(activePause.startDate, { day: '2-digit', month: 'short' })
      : `${formatDisplayDate(activePause.startDate, { day: '2-digit', month: 'short' })} – ${formatDisplayDate(activePause.endDate, { day: '2-digit', month: 'short' })}`;

    return `
      <div class="rounded-2xl p-3.5 border shadow-xs ${tone.card}">
        <div class="flex items-start justify-between gap-2.5">
          <div class="flex items-start gap-3 min-w-0">
            <span class="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${tone.icon}">
              ${icon(activePause.reason === 'illness' ? 'heart-pulse' : 'shield', 'w-5 h-5')}
            </span>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[11px] uppercase font-extrabold tracking-wider ${tone.badge}">Pausa activa • ${escapeHtml(meta.label)}</span>
                <span class="text-[11px] font-mono text-[var(--muted-foreground)]">${escapeHtml(rangeLabel)} (${days}d)</span>
              </div>
              <p class="text-[13px] font-bold text-[var(--foreground)] mt-0.5">${escapeHtml(activePause.title || meta.defaultTitle)}</p>
              <p class="text-[12px] text-[var(--muted-foreground)] mt-1 leading-relaxed">${escapeHtml(meta.guidance)}</p>
              ${activePause.notes ? `<p class="text-[11px] text-[var(--foreground)]/80 mt-1 italic">“${escapeHtml(activePause.notes)}”</p>` : ''}
            </div>
          </div>
          <button type="button" id="btnOpenPauseModal" class="btn-touch shrink-0 px-2.5 rounded-xl bg-[var(--card)]/80 border border-[var(--border)] text-[11px] font-bold text-[var(--foreground)] hover:bg-[var(--accent)] inline-flex items-center gap-1">
            ${icon('pen-line', 'w-3.5 h-3.5')} Editar
          </button>
        </div>

        <div class="mt-2.5 pt-2 border-t border-[var(--border)]/60 flex items-center justify-between gap-2 text-[11px] text-[var(--muted-foreground)]">
          <span>Sesiones esta semana: <b class="text-[var(--foreground)]">${progress.sessions} de ${progress.target}</b> (sin presión durante la pausa)</span>
          ${totalPauses > 0 ? `
            <button type="button" id="btnTogglePauseHistory" class="font-bold text-amber-500 hover:underline shrink-0">
              ${showPauseHistory ? 'Ocultar historial' : `Historial (${totalPauses})`}
            </button>
          ` : ''}
        </div>
        ${renderPauseHistoryBlock(pauseSummary.list)}
      </div>
    `;
  }

  const status = progress.sessions === 0
    ? 'Completa tu primera sesión o registra pausa si descansas'
    : progress.sessions >= progress.target
      ? 'Objetivo semanal cumplido'
      : 'Sigue así';
  return `
    <div class="bg-[var(--card)] rounded-2xl p-3 border border-[var(--border)] shadow-xs">
      <div class="flex items-center justify-between gap-2.5">
        <div class="flex items-center gap-3 min-w-0">
          <span class="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 flex items-center justify-center shrink-0">
            ${icon('calendar', 'w-5 h-5')}
          </span>
          <div class="min-w-0">
            <p class="text-[13px] font-bold text-[var(--foreground)] truncate">
              Semana: ${progress.sessions} de ${progress.target} sesiones
            </p>
            <p class="text-[12px] text-[var(--muted-foreground)] truncate">${status}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button type="button" id="btnOpenPauseModal" class="btn-touch px-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--border)] border border-[var(--border)] text-[11px] font-bold text-[var(--foreground)] inline-flex items-center gap-1" title="Registrar pausa por enfermedad, viaje o descanso">
            ${icon('shield', 'w-3.5 h-3.5 text-amber-500')} Pausa
          </button>
          <span class="text-[13px] font-bold text-emerald-500">${percent}%</span>
        </div>
      </div>
      <div class="w-full h-1.5 bg-[var(--accent)] rounded-full overflow-hidden mt-2">
        <div class="h-full bg-emerald-500 rounded-full transition-all" style="width: ${percent}%"></div>
      </div>
      ${totalPauses > 0 ? `
        <div class="mt-2 flex items-center justify-end">
          <button type="button" id="btnTogglePauseHistory" class="text-[11px] font-semibold text-[var(--muted-foreground)] hover:text-amber-500">
            ${showPauseHistory ? 'Ocultar historial de pausas' : `Ver pausas anteriores (${totalPauses})`}
          </button>
        </div>
        ${renderPauseHistoryBlock(pauseSummary.list)}
      ` : ''}
    </div>
  `;
}

function renderPauseModal(pauseSummary, today) {
  const defaultEnd = addDaysToDateKey(today, 6);
  const historyRows = (pauseSummary?.list || []).slice(0, 8);
  return `
    <div id="modalTrainingPause" class="hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="pauseModalTitle">
      <div class="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 max-w-md w-full space-y-4 shadow-xl my-8">
        <div class="flex items-center justify-between pb-2 border-b border-[var(--border)]">
          <div>
            <h3 id="pauseModalTitle" class="text-base font-bold text-[var(--foreground)]">Registrar pausa / recuperación</h3>
            <p class="text-[12px] text-[var(--muted-foreground)]">Contexto real de ausencia (enfermedad, viaje o descanso)</p>
          </div>
          <button type="button" id="btnClosePauseModal" class="btn-touch w-11 rounded-xl text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] flex items-center justify-center shrink-0" aria-label="Cerrar">${icon('x', 'w-6 h-6')}</button>
        </div>

        <form id="formTrainingPause" class="space-y-3 text-xs">
          <input type="hidden" id="inputPauseId" value="" />

          <div>
            <span class="font-bold text-[var(--foreground)] block mb-1.5">Motivo de la pausa</span>
            <div class="flex flex-wrap gap-1.5" role="group" aria-label="Motivo de pausa">
              ${PAUSE_REASONS.map((r, idx) => `
                <button type="button" class="pause-reason-btn btn-touch px-2.5 rounded-xl border text-[11px] font-bold transition-colors ${idx === 0 ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-[var(--accent)]/50 text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)]'}" data-reason="${escapeAttr(r.id)}" aria-pressed="${idx === 0}">
                  ${escapeHtml(r.label)}
                </button>
              `).join('')}
            </div>
          </div>

          <div>
            <span class="font-bold text-[var(--foreground)] block mb-1.5">Duración rápida</span>
            <div class="flex flex-wrap gap-1.5">
              <button type="button" class="pause-duration-btn btn-touch px-2.5 rounded-lg bg-[var(--accent)] border border-[var(--border)] text-[11px] font-semibold hover:border-amber-500/40" data-days="0">Solo hoy</button>
              <button type="button" class="pause-duration-btn btn-touch px-2.5 rounded-lg bg-[var(--accent)] border border-[var(--border)] text-[11px] font-semibold hover:border-amber-500/40" data-days="2">3 días</button>
              <button type="button" class="pause-duration-btn btn-touch px-2.5 rounded-lg bg-[var(--accent)] border border-[var(--border)] text-[11px] font-semibold hover:border-amber-500/40" data-days="6">Esta semana (7 días)</button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label for="inputPauseStart" class="font-bold text-[var(--foreground)] block mb-1">Desde *</label>
              <input type="date" id="inputPauseStart" value="${escapeAttr(today)}" required class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
            </div>
            <div>
              <label for="inputPauseEnd" class="font-bold text-[var(--foreground)] block mb-1">Hasta *</label>
              <input type="date" id="inputPauseEnd" value="${escapeAttr(defaultEnd)}" required class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
            </div>
          </div>

          <div>
            <label for="inputPauseTitle" class="font-bold text-[var(--foreground)] block mb-1">Descripción breve</label>
            <input type="text" id="inputPauseTitle" value="${escapeAttr(PAUSE_REASONS[0].defaultTitle)}" placeholder="Ej: Resfrío con tos / Viaje a Osorno donde Francisca" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)]" />
          </div>

          <div>
            <label for="inputPauseNotes" class="font-bold text-[var(--foreground)] block mb-1">Notas (síntomas, regreso gradual, etc.)</label>
            <input type="text" id="inputPauseNotes" placeholder="Ej: Mucha tos y mucosidad, foco en dormir y líquidos" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)]" />
          </div>

          <div class="flex gap-2 pt-2 border-t border-[var(--border)]">
            <button type="submit" class="btn-touch flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-[13px] transition-all shadow-xs inline-flex items-center justify-center gap-1.5">
              ${icon('save', 'w-4 h-4')} Guardar pausa
            </button>
            <button type="button" id="btnCancelPauseModal" class="btn-touch px-4 rounded-xl border border-[var(--border)] text-[13px] text-[var(--muted-foreground)] hover:bg-[var(--accent)]">
              Cancelar
            </button>
          </div>
        </form>

        ${historyRows.length > 0 ? `
          <div class="pt-2 border-t border-[var(--border)] space-y-1.5 max-h-40 overflow-y-auto">
            <span class="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block">Historial reciente</span>
            ${historyRows.map((p) => {
              const meta = getPauseReasonMeta(p.reason);
              return `
                <div class="p-2 rounded-xl bg-[var(--accent)]/40 border border-[var(--border)] flex items-center justify-between gap-2 text-[11px]">
                  <div class="min-w-0">
                    <b class="text-[var(--foreground)] block truncate">${escapeHtml(p.title || meta.label)}</b>
                    <span class="font-mono text-[var(--muted-foreground)]">${escapeHtml(p.startDate)} → ${escapeHtml(p.endDate)}</span>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <button type="button" class="btn-edit-pause px-2 py-1 rounded bg-[var(--card)] border border-[var(--border)] font-bold text-amber-500" data-pause-id="${escapeAttr(p.pauseId)}">Editar</button>
                    <button type="button" class="btn-delete-pause p-1.5 rounded text-[var(--muted-foreground)] hover:text-rose-500" data-pause-id="${escapeAttr(p.pauseId)}" aria-label="Eliminar pausa">${icon('trash-2', 'w-3.5 h-3.5')}</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

export function renderWorkoutModule(container, preserveScroll = false) {
  if (pauseModalHistory) {
    pauseModalHistory.release();
    pauseModalHistory = null;
  }
  if (pauseEscapeHandler) {
    document.removeEventListener('keydown', pauseEscapeHandler);
    pauseEscapeHandler = null;
  }

  const previousScrollY = window.scrollY;
  const isLive = !!state.activeWorkout;
  const profile = db.getProfile();
  const today = todayKey();
  const weeklyProgress = computeWeeklyProgress(db.getWorkoutLogs());
  const pauseSummary = summarizeTrainingPauses(db.getTrainingPauses(), today);
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

        ${renderWeeklyProgress(weeklyProgress, pauseSummary)}

        <!-- Pantalla Divertida de Descanso & Regeneración -->
        ${renderRestDayScreen(restDay)}

        ${renderPauseModal(pauseSummary, today)}
      </div>
    `;
    attachRestDayEvents(container, pauseSummary, today);
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
                ${icon('x', 'w-6 h-6')}
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

      ${!isLive ? renderWeeklyProgress(weeklyProgress, pauseSummary) : ''}

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

          <!-- Nota general de la sesión -->
          <div class="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-3.5 space-y-1.5 shadow-xs">
            <label for="inputSessionNote" class="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider flex items-center gap-1.5">
              ${icon('notebook-pen', 'w-3.5 h-3.5 text-amber-500')} Nota general de la sesión
            </label>
            <input
              type="text"
              id="inputSessionNote"
              value="${escapeAttr(state.activeWorkout.notes || '')}"
              placeholder="Ej: Dormí bien, energía alta, ligero ajuste de agarre..."
              class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[12px] text-[var(--foreground)]" />
          </div>

        </div>
      `}

      ${!isLive ? renderPauseModal(pauseSummary, today) : ''}
    </div>
  `;

  // Attach Event Listeners
  attachWorkoutEvents(container, currentDayId, pauseSummary, today);

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
function attachWorkoutEvents(container, currentDayId, pauseSummary, today) {
  attachPauseEvents(container, pauseSummary, today);
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

      dismissRestTimer();
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

      dismissRestTimer();
      state.cancelWorkout();
      showToast('Sesión descartada.', 'info');
    });
  }

  // Botón Smart Coach: Aplicar sobrecarga progresiva sugerida
  container.querySelectorAll('.btn-apply-smart-coach').forEach(btn => {
    btn.addEventListener('click', () => {
      const exerciseId = btn.getAttribute('data-id');
      const nextWeight = parseFloat(btn.getAttribute('data-weight'));
      const nextReps = parseFloat(btn.getAttribute('data-reps'));
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
                if (!isNaN(nextReps)) s.reps = nextReps;
              }
            });
            db.saveActiveSession(state.activeWorkout);
          }
        }

        renderWorkoutModule(container, true);
        showToast(
          `Nueva base: ${nextWeight} ${CONFIG.WEIGHT_UNIT}${!isNaN(nextReps) ? ` × ${nextReps} reps` : ''}.`,
          'success'
        );
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

  // Notas rápidas por ejercicio y de sesión (guardado silencioso)
  container.querySelectorAll('.input-exercise-note').forEach(input => {
    input.addEventListener('change', () => {
      const exIndex = parseInt(input.getAttribute('data-ex'));
      state.updateExerciseNote(exIndex, input.value);
    });
  });

  const sessionNoteInput = container.querySelector('#inputSessionNote');
  if (sessionNoteInput) {
    sessionNoteInput.addEventListener('change', () => {
      state.updateSessionNote(sessionNoteInput.value);
    });
  }

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
        state.setCardioMinutes(next);
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
        btn.setAttribute('aria-label', `#${setNumber}: ${willBeCompleted ? 'desmarcar' : 'marcar'} la serie ${setNumber} como completada`);
        const row = btn.closest('.set-row');
        if (willBeCompleted) {
          btn.classList.add('bg-emerald-500', 'text-slate-950', 'shadow-sm', 'border-emerald-500', 'check-pop');
          btn.classList.remove('bg-[var(--card)]', 'text-[var(--muted-foreground)]', 'hover:bg-[var(--accent)]');
          setTimeout(() => btn.classList.remove('check-pop'), 220);
          if (row) {
            row.classList.add('bg-emerald-500/10', 'border-emerald-500/20');
            row.classList.remove('bg-[var(--card)]');
          }
        } else {
          btn.classList.remove('bg-emerald-500', 'text-slate-950', 'shadow-sm', 'border-emerald-500');
          btn.classList.add('bg-[var(--card)]', 'text-[var(--muted-foreground)]', 'hover:bg-[var(--accent)]');
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
function attachRestDayEvents(container, pauseSummary, today) {
  attachPauseEvents(container, pauseSummary, today);
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

function attachPauseEvents(container, pauseSummary, today) {
  const modal = container.querySelector('#modalTrainingPause');
  const form = container.querySelector('#formTrainingPause');
  const idInput = container.querySelector('#inputPauseId');
  const startInput = container.querySelector('#inputPauseStart');
  const endInput = container.querySelector('#inputPauseEnd');
  const titleInput = container.querySelector('#inputPauseTitle');
  const notesInput = container.querySelector('#inputPauseNotes');
  let selectedReason = 'illness';

  const applyReasonUI = (reasonId, overwriteTitle = false) => {
    selectedReason = reasonId || 'other';
    const meta = getPauseReasonMeta(selectedReason);
    container.querySelectorAll('.pause-reason-btn').forEach((btn) => {
      const active = btn.getAttribute('data-reason') === selectedReason;
      btn.setAttribute('aria-pressed', String(active));
      btn.classList.toggle('bg-rose-500/20', active && meta.tone === 'rose');
      btn.classList.toggle('text-rose-400', active && meta.tone === 'rose');
      btn.classList.toggle('border-rose-500/40', active && meta.tone === 'rose');
      btn.classList.toggle('bg-amber-500/20', active && meta.tone !== 'rose');
      btn.classList.toggle('text-amber-500', active && meta.tone !== 'rose');
      btn.classList.toggle('border-amber-500/40', active && meta.tone !== 'rose');
      btn.classList.toggle('bg-[var(--accent)]/50', !active);
      btn.classList.toggle('text-[var(--muted-foreground)]', !active);
      btn.classList.toggle('border-[var(--border)]', !active);
    });
    if (overwriteTitle && titleInput) {
      titleInput.value = meta.defaultTitle;
    }
  };

  const closePauseModal = (fromHistory = false) => {
    if (!modal || modal.classList.contains('hidden')) return;
    modal.classList.add('hidden');
    if (pauseEscapeHandler) {
      document.removeEventListener('keydown', pauseEscapeHandler);
      pauseEscapeHandler = null;
    }
    if (pauseModalHistory && !fromHistory) {
      pauseModalHistory.release();
    }
    pauseModalHistory = null;
  };

  const openPauseModal = (entry = null) => {
    if (!modal) return;
    const target = entry || pauseSummary?.activePause || null;
    if (target) {
      idInput.value = target.pauseId || '';
      startInput.value = target.startDate || today;
      endInput.value = target.endDate || target.startDate || today;
      applyReasonUI(target.reason || 'illness', false);
      titleInput.value = target.title || getPauseReasonMeta(target.reason).defaultTitle;
      notesInput.value = target.notes || '';
    } else {
      idInput.value = '';
      startInput.value = today;
      endInput.value = addDaysToDateKey(today, 6);
      applyReasonUI('illness', true);
      notesInput.value = '';
    }
    modal.classList.remove('hidden');
    pauseModalHistory = pushModalHistory(() => closePauseModal(true));
    pauseEscapeHandler = (ev) => {
      if (ev.key === 'Escape') closePauseModal();
    };
    document.addEventListener('keydown', pauseEscapeHandler);
  };

  container.querySelector('#btnOpenPauseModal')?.addEventListener('click', () => openPauseModal());
  container.querySelector('#btnClosePauseModal')?.addEventListener('click', () => closePauseModal());
  container.querySelector('#btnCancelPauseModal')?.addEventListener('click', () => closePauseModal());
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closePauseModal();
  });

  container.querySelector('#btnTogglePauseHistory')?.addEventListener('click', () => {
    showPauseHistory = !showPauseHistory;
    renderWorkoutModule(container, true);
  });

  container.querySelectorAll('.pause-reason-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextReason = btn.getAttribute('data-reason');
      const currentVal = (titleInput?.value || '').trim();
      const isDefaultTitle = !currentVal || PAUSE_REASONS.some((r) => r.defaultTitle === currentVal);
      applyReasonUI(nextReason, isDefaultTitle);
    });
  });

  container.querySelectorAll('.pause-duration-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const delta = Number(btn.getAttribute('data-days')) || 0;
      const startVal = startInput?.value || today;
      if (endInput) endInput.value = addDaysToDateKey(startVal, delta);
    });
  });

  container.querySelectorAll('.btn-edit-pause').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pauseId = btn.getAttribute('data-pause-id');
      const found = (pauseSummary?.list || []).find((p) => p.pauseId === pauseId);
      if (found) openPauseModal(found);
    });
  });

  container.querySelectorAll('.btn-delete-pause').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const pauseId = btn.getAttribute('data-pause-id');
      if (!pauseId) return;
      const ok = await confirmAction({
        title: '¿Eliminar pausa registrada?',
        message: 'Se quitará este registro de tu historial local y de la nube.',
        confirmText: 'Eliminar',
        danger: true
      });
      if (!ok) return;
      db.deleteTrainingPause(pauseId);
      closePauseModal();
      renderWorkoutModule(container, true);
      showToast('Pausa eliminada.', 'info');
    });
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const startDate = startInput?.value || today;
    const rawEnd = endInput?.value || startDate;
    const endDate = rawEnd < startDate ? startDate : rawEnd;
    const meta = getPauseReasonMeta(selectedReason);
    const title = (titleInput?.value || '').trim() || meta.defaultTitle;
    const notes = (notesInput?.value || '').trim();
    const pauseId = (idInput?.value || '').trim() || `pause_${Date.now()}`;

    db.saveTrainingPause({
      pauseId,
      startDate,
      endDate,
      reason: selectedReason,
      title,
      notes
    });
    closePauseModal();
    renderWorkoutModule(container, true);
    showToast('Pausa de entrenamiento guardada. ¡Cuídate mucho!', 'success', 4000);
  });
}
