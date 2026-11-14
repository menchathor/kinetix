// Módulo de Sueño, Recuperación & Higiene del Descanso
import { db, formatDisplayDate, todayKey } from '../services/db.js';
import {
  SLEEP_TARGET_HOURS,
  SLEEP_FACTORS,
  computeSleepDurationHours,
  computeSleepSummary
} from '../services/wellness-calc.js';
import { escapeHtml, escapeAttr, toNumber } from '../utils/escape.js';
import { showToast, confirmAction } from '../ui/toast.js';
import { icon } from '../ui/icons.js';

let sleepChartInstance = null;

const QUALITY_LABELS = {
  1: 'Muy mala',
  2: 'Mala',
  3: 'Regular',
  4: 'Buena',
  5: 'Excelente'
};

function toneClasses(tone) {
  if (tone === 'rose') {
    return {
      border: 'border-rose-500/40',
      badge: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
      text: 'text-rose-500',
      bg: 'bg-rose-500/10'
    };
  }
  if (tone === 'amber') {
    return {
      border: 'border-amber-500/40',
      badge: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
      text: 'text-amber-500',
      bg: 'bg-amber-500/10'
    };
  }
  if (tone === 'emerald') {
    return {
      border: 'border-emerald-500/40',
      badge: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
      text: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    };
  }
  return {
    border: 'border-[var(--border)]',
    badge: 'bg-[var(--accent)] text-[var(--muted-foreground)] border-[var(--border)]',
    text: 'text-[var(--muted-foreground)]',
    bg: 'bg-[var(--accent)]/40'
  };
}

export function renderSleepModule(container) {
  const logs = db.getSleepLogs();
  const summary = computeSleepSummary(logs, SLEEP_TARGET_HOURS);
  const today = todayKey();
  const todayLog = logs.find((item) => item.date === today) || null;
  const tone = toneClasses(summary.status.tone);

  const initialHours = todayLog ? Number(todayLog.hours) : 7.5;
  const initialQuality = todayLog?.quality || 3;
  const initialFactors = new Set(todayLog?.factors || []);

  container.innerHTML = `
    <div class="space-y-4 max-w-3xl mx-auto pb-24">

      <!-- Cabecera y KPIs de Recuperación -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border ${tone.border} shadow-xs space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <span class="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              ${icon('moon', 'w-5 h-5')}
            </span>
            <div>
              <h2 class="text-base font-bold text-[var(--foreground)]">Sueño & Recuperación</h2>
              <p class="text-[13px] text-[var(--muted-foreground)]">Control nocturno para proteger músculo, cortisol y tiroides</p>
            </div>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${tone.badge}">
            ${escapeHtml(summary.status.label)}
          </span>
        </div>

        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Última noche</span>
            <span class="text-base font-extrabold text-[var(--foreground)] block">${summary.latest ? `${summary.latest.hours} h` : '—'}</span>
            <span class="text-[10px] font-semibold text-[var(--muted-foreground)]">
              ${summary.latest?.quality ? `${QUALITY_LABELS[summary.latest.quality] || ''}` : 'Sin registro'}
            </span>
          </div>
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Promedio 7 días</span>
            <span class="text-base font-extrabold ${tone.text} block">${summary.avgHours7 !== null ? `${summary.avgHours7} h` : '—'}</span>
            <span class="text-[10px] text-[var(--muted-foreground)]">Meta: ${SLEEP_TARGET_HOURS} h</span>
          </div>
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Deuda semanal</span>
            <span class="text-base font-extrabold ${summary.weeklyDebtHours > 4 ? 'text-rose-500' : summary.weeklyDebtHours > 0 ? 'text-amber-500' : 'text-emerald-500'} block">
              ${summary.weeklyDebtHours === null ? '—' : (summary.weeklyDebtHours > 0 ? `-${summary.weeklyDebtHours} h` : '0 h')}
            </span>
            <span class="text-[10px] text-[var(--muted-foreground)]">
              ${summary.avgQuality7 ? `Calidad ${summary.avgQuality7}/5` : 'Últimos 7 reg.'}
            </span>
          </div>
        </div>

        <div class="p-3 rounded-xl ${tone.bg} border ${tone.border} text-xs space-y-1">
          <div class="flex items-center gap-1.5 font-bold ${tone.text}">
            <span>${icon(summary.status.level === 'critical' ? 'triangle-alert' : 'lightbulb', 'w-4 h-4')}</span>
            <span>${escapeHtml(summary.status.headline)}</span>
          </div>
          <p class="text-[12px] text-[var(--foreground)]/90 leading-relaxed">${escapeHtml(summary.status.advice)}</p>
        </div>
      </div>

      <!-- Registro Rápido de Descanso -->
      <form id="sleepLogForm" class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-[var(--foreground)]">Registrar Noche de Sueño</h3>
            <p class="text-[12px] text-[var(--muted-foreground)]">Guarda tus horas reales y factores que afectaron el descanso</p>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Sincronizable
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div>
            <label for="inputSleepDate" class="font-bold text-[var(--foreground)] block mb-1">Fecha (al despertar)</label>
            <input type="date" id="inputSleepDate" value="${escapeAttr(today)}" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
          </div>
          <div>
            <label for="inputSleepBedtime" class="font-bold text-[var(--foreground)] block mb-1">Hora de acostarse (opcional)</label>
            <input type="time" id="inputSleepBedtime" value="${escapeAttr(todayLog?.bedtime || '')}" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
          </div>
          <div>
            <label for="inputSleepWakeTime" class="font-bold text-[var(--foreground)] block mb-1">Hora de despertar (opcional)</label>
            <input type="time" id="inputSleepWakeTime" value="${escapeAttr(todayLog?.wakeTime || '')}" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
          </div>
        </div>

        <!-- Horas dormidas con stepper + atajos -->
        <div class="p-3 rounded-xl bg-[var(--accent)]/40 border border-[var(--border)] space-y-2.5">
          <div class="flex items-center justify-between gap-2">
            <label for="inputSleepHours" class="text-xs font-bold text-[var(--foreground)]">Horas totales dormidas *</label>
            <div class="flex items-center gap-1.5">
              <button type="button" id="btnSleepMinus" class="btn-touch w-11 rounded-xl bg-[var(--card)] border border-[var(--border)] font-bold text-sm hover:bg-[var(--accent)]" aria-label="Restar media hora">−0.5</button>
              <input type="number" step="0.5" min="0" max="24" id="inputSleepHours" value="${escapeAttr(initialHours)}" class="w-20 p-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-center font-mono font-extrabold text-sm text-[var(--foreground)] outline-none" />
              <button type="button" id="btnSleepPlus" class="btn-touch w-11 rounded-xl bg-[var(--card)] border border-[var(--border)] font-bold text-sm hover:bg-[var(--accent)]" aria-label="Sumar media hora">+0.5</button>
            </div>
          </div>
          <div class="flex flex-wrap gap-1.5" role="group" aria-label="Atajos de horas dormidas">
            ${[3.5, 4, 5, 6, 7, 7.5, 8].map((h) => `
              <button type="button" class="sleep-preset-btn btn-touch px-3 rounded-lg text-[11px] font-mono font-bold border transition-colors ${Number(initialHours) === h ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-[var(--card)] text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--accent)]'}" data-hours="${h}">
                ${h}h
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Calidad y despertares -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs items-end">
          <div class="sm:col-span-2">
            <span class="font-bold text-[var(--foreground)] block mb-1.5">Calidad percibida</span>
            <div class="grid grid-cols-5 gap-1.5" role="group" aria-label="Calidad del sueño de 1 a 5">
              ${[1, 2, 3, 4, 5].map((q) => `
                <button type="button" class="sleep-quality-btn btn-touch px-1 rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center justify-center ${initialQuality === q ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs' : 'bg-[var(--accent)]/40 text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)]'}" data-quality="${q}" aria-pressed="${initialQuality === q}">
                  <span class="font-mono text-xs">${q}</span>
                  <span class="text-[9px] truncate max-w-full">${QUALITY_LABELS[q]}</span>
                </button>
              `).join('')}
            </div>
          </div>
          <div>
            <label for="inputSleepWakeups" class="font-bold text-[var(--foreground)] block mb-1">Despertares</label>
            <input type="number" min="0" max="20" id="inputSleepWakeups" value="${escapeAttr(todayLog?.wakeups ?? '')}" placeholder="Ej: 2" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
          </div>
        </div>

        <!-- Factores -->
        <div class="text-xs">
          <span class="font-bold text-[var(--foreground)] block mb-1.5">Factores de la noche (opcional)</span>
          <div class="flex flex-wrap gap-1.5" role="group" aria-label="Factores que afectaron el sueño">
            ${SLEEP_FACTORS.map((f) => {
              const active = initialFactors.has(f.id);
              return `
                <button type="button" class="sleep-factor-btn btn-touch px-2.5 rounded-lg text-[11px] font-semibold border transition-colors ${active ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' : 'bg-[var(--accent)]/40 text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)]'}" data-factor="${escapeAttr(f.id)}" aria-pressed="${active}">
                  ${escapeHtml(f.label)}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="text-xs">
          <label for="inputSleepNotes" class="font-bold text-[var(--foreground)] block mb-1">Notas de la noche</label>
          <input type="text" id="inputSleepNotes" value="${escapeAttr(todayLog?.notes || '')}" placeholder="Ej: Mucha carga laboral, me costó conciliar el sueño" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)]" />
        </div>

        <button type="submit" class="btn-touch w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl text-[13px] transition-all shadow-xs inline-flex items-center justify-center gap-1.5">
          ${icon('save', 'w-4 h-4')} Guardar noche de sueño
        </button>
      </form>

      <!-- Gráfica últimos 14 registros -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex items-center justify-between mb-1">
          <h3 class="text-sm font-bold text-[var(--foreground)]">Tendencia de Descanso</h3>
          <span class="text-[10px] font-bold text-emerald-500 inline-flex items-center gap-1">
            <span class="w-4 border-t border-dashed border-emerald-500"></span> Meta ${SLEEP_TARGET_HOURS} h
          </span>
        </div>
        <p class="text-[12px] text-[var(--muted-foreground)] mb-3">Últimas noches registradas (rojo &lt;5.5 h, ámbar 5.5–6.9 h, verde ≥7 h)</p>
        ${logs.length === 0 ? `
          <div class="h-44 flex flex-col items-center justify-center rounded-xl bg-[var(--accent)]/40 border border-[var(--border)] text-center px-4">
            <span class="text-[var(--muted-foreground)] mb-2" aria-hidden="true">${icon('bed-double', 'w-7 h-7')}</span>
            <p class="text-xs font-semibold text-[var(--foreground)]">Aún no hay noches registradas</p>
            <p class="text-[12px] text-[var(--muted-foreground)] mt-1">Anota las horas de hoy arriba para ver tu gráfica semanal.</p>
          </div>
        ` : `
          <div class="h-52 relative">
            <canvas id="chartSleepHistory"></canvas>
          </div>
          <details class="mt-3 group">
            <summary class="btn-touch cursor-pointer text-[12px] font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] inline-flex items-center gap-1.5">
              ${icon('list', 'w-4 h-4')} Ver datos en tabla
              <span class="transition-transform group-open:rotate-180">${icon('chevron-down', 'w-4 h-4')}</span>
            </summary>
            <div class="mt-2 overflow-x-auto rounded-xl border border-[var(--border)]">
              <table class="w-full text-[12px] text-left">
                <caption class="sr-only">Registro de horas de sueño por fecha</caption>
                <thead class="bg-[var(--accent)]/60 text-[var(--muted-foreground)]">
                  <tr>
                    <th scope="col" class="px-3 py-2 font-bold">Fecha</th>
                    <th scope="col" class="px-3 py-2 font-bold">Horas</th>
                    <th scope="col" class="px-3 py-2 font-bold">Calidad</th>
                  </tr>
                </thead>
                <tbody>
                  ${summary.recent14.map((item) => `
                    <tr class="border-t border-[var(--border)]">
                      <th scope="row" class="px-3 py-2 font-semibold text-[var(--foreground)]">${escapeHtml(formatDisplayDate(item.date))}</th>
                      <td class="px-3 py-2 font-mono">${item.hours} h</td>
                      <td class="px-3 py-2">${item.quality ? `${item.quality}/5 (${QUALITY_LABELS[item.quality] || ''})` : '—'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </details>
        `}
      </div>

      <!-- Protocolo de Higiene del Sueño adaptado -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center">${icon('clock', 'w-5 h-5')}</span>
            <div>
              <h3 class="text-sm font-bold text-[var(--foreground)]">Protocolo Nocturno (Alineado a Levotiroxina 06:30)</h3>
              <p class="text-[12px] text-[var(--muted-foreground)]">Ventana objetivo: acostarse 22:30 – 23:00 para lograr 7.5 h</p>
            </div>
          </div>
        </div>
        <ul class="space-y-1.5 text-[13px] text-[var(--muted-foreground)]">
          <li class="flex items-start gap-2"><span class="text-indigo-400 font-bold">•</span><span><b>14:00 hrs:</b> Último café o bebida con cafeína (su vida media dura 6–8 h y fragmenta el sueño profundo).</span></li>
          <li class="flex items-start gap-2"><span class="text-indigo-400 font-bold">•</span><span><b>19:45 – 20:30 hrs:</b> Cena post-entreno ligera; los carbohidratos complejos nocturnos ayudan a bajar el cortisol tras entrenar a las 18:00.</span></li>
          <li class="flex items-start gap-2"><span class="text-indigo-400 font-bold">•</span><span><b>21:45 hrs:</b> Bajar brillo de pantallas, luz cálida y descarga rápida de pendientes en papel si la mente sigue acelerada.</span></li>
          <li class="flex items-start gap-2"><span class="text-indigo-400 font-bold">•</span><span><b>Días tras &lt;5 h de sueño:</b> Evita entrenar al fallo; mantén la rutina con 1–2 reps en reserva extra y prioriza caminar en Zona 2.</span></li>
        </ul>
      </div>

      <!-- Historial de Noches -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="text-sm font-bold text-[var(--foreground)]">Historial de Sueño</h3>
            <p class="text-[12px] text-[var(--muted-foreground)]">Toca Editar para ajustar una noche previa</p>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)]">
            ${logs.length} noches
          </span>
        </div>

        <div class="space-y-2">
          ${logs.length === 0 ? `
            <div class="p-4 text-center text-xs text-[var(--muted-foreground)]">Aún no hay registros de sueño.</div>
          ` : logs.map((item) => {
            const hrs = toNumber(item.hours);
            const badgeClass = hrs < 5.5
              ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
              : hrs < 6.8
                ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
            const factorLabels = (item.factors || [])
              .map((fid) => SLEEP_FACTORS.find((f) => f.id === fid)?.label || fid);

            return `
              <div class="p-3 rounded-xl bg-[var(--accent)]/30 border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-extrabold text-[var(--foreground)] text-sm font-mono">${hrs} h</span>
                    <span class="text-[10px] px-2 py-0.5 rounded-full font-bold border ${badgeClass}">
                      ${item.quality ? `Calidad ${item.quality}/5 • ${QUALITY_LABELS[item.quality] || ''}` : 'Registrado'}
                    </span>
                    <span class="text-[10px] text-[var(--muted-foreground)] font-mono">${escapeHtml(formatDisplayDate(item.date))}</span>
                  </div>
                  <div class="flex items-center gap-2 mt-1 text-[11px] text-[var(--muted-foreground)] flex-wrap">
                    ${item.bedtime && item.wakeTime ? `<span>Horario: <strong class="text-[var(--foreground)] font-mono">${escapeHtml(item.bedtime)} → ${escapeHtml(item.wakeTime)}</strong></span>` : ''}
                    ${item.wakeups !== undefined ? `<span>• Despertares: <strong class="text-[var(--foreground)]">${item.wakeups}</strong></span>` : ''}
                  </div>
                  ${factorLabels.length > 0 ? `
                    <div class="flex flex-wrap gap-1 mt-1.5">
                      ${factorLabels.map((lbl) => `<span class="text-[10px] px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]">${escapeHtml(lbl)}</span>`).join('')}
                    </div>
                  ` : ''}
                  ${item.notes ? `<p class="text-[10px] text-[var(--muted-foreground)] italic mt-1 break-words">${escapeHtml(item.notes)}</p>` : ''}
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <button type="button" class="btn-edit-sleep btn-touch text-[11px] font-bold text-indigo-400 hover:text-indigo-300 px-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 inline-flex items-center gap-1" data-date="${escapeAttr(item.date)}">
                    ${icon('pen-line', 'w-4 h-4')} Editar
                  </button>
                  <button type="button" class="btn-delete-sleep w-11 h-11 inline-flex items-center justify-center text-rose-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20" data-date="${escapeAttr(item.date)}" aria-label="Eliminar sueño del ${escapeAttr(formatDisplayDate(item.date))}">
                    ${icon('trash-2', 'w-5 h-5')}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

    </div>
  `;

  attachSleepEvents(container, initialQuality, initialFactors);
  initSleepChart(summary.recent14);
}

function attachSleepEvents(container, initialQuality, initialFactors) {
  const form = container.querySelector('#sleepLogForm');
  const dateInput = container.querySelector('#inputSleepDate');
  const bedtimeInput = container.querySelector('#inputSleepBedtime');
  const wakeTimeInput = container.querySelector('#inputSleepWakeTime');
  const hoursInput = container.querySelector('#inputSleepHours');
  const wakeupsInput = container.querySelector('#inputSleepWakeups');
  const notesInput = container.querySelector('#inputSleepNotes');

  let selectedQuality = initialQuality;
  const selectedFactors = new Set(initialFactors);

  const syncPresetStyles = () => {
    const val = Number(hoursInput?.value);
    container.querySelectorAll('.sleep-preset-btn').forEach((btn) => {
      const active = Number(btn.dataset.hours) === val;
      btn.classList.toggle('bg-indigo-500', active);
      btn.classList.toggle('text-white', active);
      btn.classList.toggle('border-indigo-500', active);
      btn.classList.toggle('bg-[var(--card)]', !active);
      btn.classList.toggle('text-[var(--foreground)]', !active);
    });
  };

  const syncQualityStyles = () => {
    container.querySelectorAll('.sleep-quality-btn').forEach((btn) => {
      const active = Number(btn.dataset.quality) === selectedQuality;
      btn.setAttribute('aria-pressed', String(active));
      btn.classList.toggle('bg-amber-500', active);
      btn.classList.toggle('text-slate-950', active);
      btn.classList.toggle('border-amber-500', active);
      btn.classList.toggle('shadow-xs', active);
      btn.classList.toggle('bg-[var(--accent)]/40', !active);
      btn.classList.toggle('text-[var(--muted-foreground)]', !active);
    });
  };

  const syncFactorStyles = () => {
    container.querySelectorAll('.sleep-factor-btn').forEach((btn) => {
      const active = selectedFactors.has(btn.dataset.factor);
      btn.setAttribute('aria-pressed', String(active));
      btn.classList.toggle('bg-indigo-500/20', active);
      btn.classList.toggle('text-indigo-400', active);
      btn.classList.toggle('border-indigo-500/40', active);
      btn.classList.toggle('bg-[var(--accent)]/40', !active);
      btn.classList.toggle('text-[var(--muted-foreground)]', !active);
    });
  };

  const maybeAutoHours = () => {
    const computed = computeSleepDurationHours(bedtimeInput?.value, wakeTimeInput?.value);
    if (computed !== null && hoursInput) {
      hoursInput.value = String(computed);
      syncPresetStyles();
    }
  };

  bedtimeInput?.addEventListener('change', maybeAutoHours);
  wakeTimeInput?.addEventListener('change', maybeAutoHours);
  hoursInput?.addEventListener('input', syncPresetStyles);

  container.querySelector('#btnSleepMinus')?.addEventListener('click', () => {
    const next = Math.max(0, Math.round(((Number(hoursInput?.value) || 0) - 0.5) * 10) / 10);
    if (hoursInput) hoursInput.value = String(next);
    syncPresetStyles();
  });

  container.querySelector('#btnSleepPlus')?.addEventListener('click', () => {
    const next = Math.min(24, Math.round(((Number(hoursInput?.value) || 0) + 0.5) * 10) / 10);
    if (hoursInput) hoursInput.value = String(next);
    syncPresetStyles();
  });

  container.querySelectorAll('.sleep-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (hoursInput) hoursInput.value = btn.dataset.hours;
      syncPresetStyles();
    });
  });

  container.querySelectorAll('.sleep-quality-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedQuality = Number(btn.dataset.quality) || 3;
      syncQualityStyles();
    });
  });

  container.querySelectorAll('.sleep-factor-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.factor;
      if (selectedFactors.has(id)) selectedFactors.delete(id);
      else selectedFactors.add(id);
      syncFactorStyles();
    });
  });

  const loadDateIntoForm = (dateStr) => {
    const existing = db.getSleepLogs().find((item) => item.date === dateStr);
    if (!existing) return;
    if (dateInput) dateInput.value = existing.date;
    if (bedtimeInput) bedtimeInput.value = existing.bedtime || '';
    if (wakeTimeInput) wakeTimeInput.value = existing.wakeTime || '';
    if (hoursInput) hoursInput.value = String(existing.hours ?? 7.5);
    if (wakeupsInput) wakeupsInput.value = existing.wakeups !== undefined ? String(existing.wakeups) : '';
    if (notesInput) notesInput.value = existing.notes || '';
    selectedQuality = existing.quality || 3;
    selectedFactors.clear();
    (existing.factors || []).forEach((f) => selectedFactors.add(f));
    syncPresetStyles();
    syncQualityStyles();
    syncFactorStyles();
  };

  dateInput?.addEventListener('change', () => {
    loadDateIntoForm(dateInput.value);
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const date = dateInput?.value || todayKey();
    const hours = parseFloat(hoursInput?.value);
    if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
      showToast('Ingresa un número de horas válido entre 0 y 24.', 'warning');
      hoursInput?.focus();
      return;
    }

    const wakeupsRaw = wakeupsInput?.value;
    const wakeups = wakeupsRaw !== '' && wakeupsRaw !== undefined ? Math.max(0, parseInt(wakeupsRaw, 10) || 0) : undefined;

    db.saveSleepLog({
      date,
      hours,
      quality: selectedQuality,
      bedtime: bedtimeInput?.value || undefined,
      wakeTime: wakeTimeInput?.value || undefined,
      wakeups,
      factors: Array.from(selectedFactors),
      notes: notesInput?.value?.trim() || ''
    });

    showToast('Registro de sueño guardado.', 'success');
    renderSleepModule(container);
  });

  container.querySelectorAll('.btn-edit-sleep').forEach((btn) => {
    btn.addEventListener('click', () => {
      loadDateIntoForm(btn.dataset.date);
      form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      hoursInput?.focus();
    });
  });

  container.querySelectorAll('.btn-delete-sleep').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const date = btn.dataset.date;
      const ok = await confirmAction({
        title: '¿Eliminar este registro de sueño?',
        message: `Se eliminará la noche del ${formatDisplayDate(date)} del historial local y la nube.`,
        confirmText: 'Eliminar',
        danger: true
      });
      if (!ok) return;
      db.deleteSleepLog(date);
      showToast('Registro de sueño eliminado.', 'success');
      renderSleepModule(container);
    });
  });
}

function initSleepChart(recent14) {
  const canvas = document.getElementById('chartSleepHistory');
  if (!canvas || typeof Chart === 'undefined' || !recent14 || recent14.length === 0) return;

  const isDark = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.08)';
  const textColor = isDark ? '#94a3b8' : '#475569';

  const labels = recent14.map((item) => item.date.slice(5, 10));
  const data = recent14.map((item) => toNumber(item.hours));
  const colors = data.map((h) => (h < 5.5 ? 'rgba(244, 63, 94, 0.8)' : h < 6.8 ? 'rgba(245, 158, 11, 0.8)' : 'rgba(16, 185, 129, 0.8)'));

  const summary = recent14.map((item) => `${item.date}: ${item.hours} h`).join('; ');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `Horas de sueño recientes. ${summary}. Meta ${SLEEP_TARGET_HOURS} horas.`);

  if (sleepChartInstance) sleepChartInstance.destroy();

  sleepChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Horas dormidas',
          data,
          backgroundColor: colors,
          borderRadius: 6,
          barPercentage: 0.65
        },
        {
          type: 'line',
          label: 'Meta',
          data: labels.map(() => SLEEP_TARGET_HOURS),
          borderColor: '#10b981',
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0,
          max: Math.max(9, Math.ceil(Math.max(...data) + 1)),
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { size: 11 },
            callback: (val) => `${val} h`
          }
        },
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { size: 11 } }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}
