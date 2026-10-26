// Módulo de Evolución, Gráficas de Sobrecarga Progresiva y Mediciones Corporales
import { db, formatDisplayDate } from '../services/db.js';
import { escapeHtml, escapeAttr, toNumber } from '../utils/escape.js';
import { showToast, confirmAction, pushModalHistory } from '../ui/toast.js';
import { icon } from '../ui/icons.js';

let weightChartInstance = null;
let exerciseChartInstance = null;
let analyticsEscapeHandler = null;
let analyticsModalHistory = null;
let weightChartView = 'bars';

function sortedAscending(measurements) {
  return [...measurements]
    .filter(measurement => measurement && measurement.date)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function computeComposition(measurements, profile) {
  const sorted = sortedAscending(measurements);
  const inbody = sorted.filter(m => String(m.source || '').toLowerCase().includes('inbody'));
  const first = inbody[0] || sorted[0] || null;
  const last = inbody[inbody.length - 1] || sorted[sorted.length - 1] || null;

  const currentWeight = toNumber(last?.weight ?? last?.weightKg ?? profile.currentWeight);
  const startWeight = toNumber(first?.weight ?? first?.weightKg ?? profile.startWeight) || currentWeight;
  const weightDiff = startWeight > 0 && currentWeight > 0
    ? Math.round((currentWeight - startWeight) * 10) / 10
    : null;

  const fatFreeMass = toNumber(last?.fatFreeMass ?? profile.fatFreeMass);
  const visceralFat = toNumber(last?.visceralFat ?? profile.visceralFat);
  const hasComparison = Boolean(first && last && first.date !== last.date);

  const startFat = toNumber(first?.fatMassKg ?? first?.fatMass);
  const endFat = toNumber(last?.fatMassKg ?? last?.fatMass);
  const weightLost = startWeight > 0 && currentWeight > 0 ? Math.round((startWeight - currentWeight) * 10) / 10 : 0;
  const fatLost = startFat > 0 && endFat >= 0 ? Math.round((startFat - endFat) * 10) / 10 : 0;
  const pureFatPercent = weightLost > 0 && fatLost > 0 ? Math.round((fatLost / weightLost) * 100) : null;

  return {
    sorted,
    first,
    last,
    hasComparison,
    currentWeight,
    startWeight,
    weightDiff,
    fatFreeMass,
    visceralFat,
    startFat,
    endFat,
    weightLost,
    fatLost,
    pureFatPercent,
    startFatPercent: toNumber(first?.bodyFatPercent ?? first?.fatPercent),
    endFatPercent: toNumber(last?.bodyFatPercent ?? last?.fatPercent),
    startTrunkFat: toNumber(first?.trunkFat),
    endTrunkFat: toNumber(last?.trunkFat),
    startVisceral: toNumber(first?.visceralFat),
    endVisceral: toNumber(last?.visceralFat),
    startLean: toNumber(first?.fatFreeMass),
    endLean: toNumber(last?.fatFreeMass ?? profile.fatFreeMass),
    bmr: Math.round(toNumber(last?.bmr ?? profile.basalMetabolicRate))
  };
}

function displayNumber(value, suffix = '') {
  return value > 0 ? `${value}${suffix}` : '—';
}

export function renderAnalyticsModule(container) {
  if (analyticsModalHistory) {
    analyticsModalHistory.release();
    analyticsModalHistory = null;
  }
  const profile = db.getProfile();
  const measurements = db.getMeasurements();
  const workoutLogs = db.getWorkoutLogs();
  const allExercises = db.getAllExercisesAnalytics();
  const composition = computeComposition(measurements, profile);
  const weightSeries = buildMonthlyWeightSeries(measurements);

  const routinesOrder = [
    { id: 'torso1', label: 'Torso 1 (Lunes)' },
    { id: 'pierna1', label: 'Pierna 1 (Martes)' },
    { id: 'torso2', label: 'Torso 2 (Jueves)' },
    { id: 'pierna2', label: 'Pierna 2 (Viernes)' }
  ];

  const exerciseOptionsHtml = routinesOrder.map(group => {
    const groupItems = allExercises.filter(ex => ex.routineId === group.id);
    if (groupItems.length === 0) return '';
    return `
      <optgroup label="${escapeAttr(group.label)}">
        ${groupItems.map(ex => {
          const weight = ex.stats?.targetWeight || ex.stats?.prWeight || ex.baseWeight || 0;
          return `<option value="${escapeAttr(ex.id)}">${escapeHtml(ex.name)} (${weight && weight !== 'Auto' ? `${weight} kg` : 'Peso libre'})</option>`;
        }).join('')}
      </optgroup>
    `;
  }).join('');

  const comparisonRows = composition.hasComparison ? `
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
      <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
        <span class="text-[10px] font-semibold text-[var(--muted-foreground)] block">Peso en báscula</span>
        <div class="flex items-baseline gap-1 mt-0.5">
          <span class="text-xs text-[var(--muted-foreground)] line-through">${displayNumber(composition.startWeight)}</span>
          <span class="text-sm font-extrabold text-[var(--foreground)]">${displayNumber(composition.currentWeight)} kg</span>
        </div>
        <span class="text-[10px] font-bold ${composition.weightDiff <= 0 ? 'text-emerald-500' : 'text-amber-500'} inline-flex items-center gap-1">
          ${composition.weightDiff === 0 ? 'Sin cambio' : `${composition.weightDiff < 0 ? icon('trending-down', 'w-3.5 h-3.5') : icon('trending-up', 'w-3.5 h-3.5')} ${composition.weightDiff > 0 ? '+' : ''}${composition.weightDiff} kg`}
        </span>
      </div>

      <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
        <span class="text-[10px] font-semibold text-[var(--muted-foreground)] block">Masa grasa total</span>
        <div class="flex items-baseline gap-1 mt-0.5">
          <span class="text-xs text-[var(--muted-foreground)] line-through">${displayNumber(composition.startFat)}</span>
          <span class="text-sm font-extrabold text-amber-500">${displayNumber(composition.endFat)} kg</span>
        </div>
        <span class="text-[10px] font-bold ${composition.fatLost >= 0 ? 'text-emerald-500' : 'text-amber-500'} inline-flex items-center gap-1">
          ${composition.fatLost === 0 ? 'Sin cambio' : `${composition.fatLost > 0 ? icon('flame', 'w-3.5 h-3.5') : icon('trending-up', 'w-3.5 h-3.5')} ${composition.fatLost > 0 ? '-' : '+'}${Math.abs(composition.fatLost)} kg grasa`}
        </span>
      </div>

      <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
        <span class="text-[10px] font-semibold text-[var(--muted-foreground)] block">% grasa corporal</span>
        <div class="flex items-baseline gap-1 mt-0.5">
          <span class="text-xs text-[var(--muted-foreground)] line-through">${displayNumber(composition.startFatPercent, '%')}</span>
          <span class="text-sm font-extrabold text-amber-500">${displayNumber(composition.endFatPercent, '%')}</span>
        </div>
        <span class="text-[10px] font-bold text-emerald-500 inline-flex items-center gap-1">
          ${composition.startFatPercent > 0 && composition.endFatPercent > 0
            ? `${composition.endFatPercent <= composition.startFatPercent ? icon('trending-down', 'w-3.5 h-3.5') : icon('trending-up', 'w-3.5 h-3.5')} ${(composition.endFatPercent - composition.startFatPercent).toFixed(1)}%`
            : 'Sin comparación'}
        </span>
      </div>

      <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
        <span class="text-[10px] font-semibold text-[var(--muted-foreground)] block">Grasa en tronco</span>
        <div class="flex items-baseline gap-1 mt-0.5">
          <span class="text-xs text-[var(--muted-foreground)] line-through">${displayNumber(composition.startTrunkFat)}</span>
          <span class="text-sm font-extrabold text-[var(--foreground)]">${displayNumber(composition.endTrunkFat)} kg</span>
        </div>
        <span class="text-[10px] font-bold text-emerald-500">
          ${composition.startTrunkFat > 0 && composition.endTrunkFat > 0
            ? `${icon('target', 'w-3.5 h-3.5 inline')} ${(composition.endTrunkFat - composition.startTrunkFat).toFixed(2)} kg`
            : 'Sin comparación'}
        </span>
      </div>

      <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
        <span class="text-[10px] font-semibold text-[var(--muted-foreground)] block">Grasa visceral</span>
        <div class="flex items-baseline gap-1 mt-0.5">
          <span class="text-xs text-[var(--muted-foreground)] line-through">Nivel ${displayNumber(composition.startVisceral)}</span>
          <span class="text-sm font-extrabold ${composition.endVisceral > 10 ? 'text-amber-400' : 'text-emerald-400'}">Nivel ${displayNumber(composition.endVisceral)}</span>
        </div>
        <span class="text-[10px] font-bold ${composition.endVisceral <= 10 ? 'text-emerald-400' : 'text-amber-400'}">
          ${composition.endVisceral <= 10 ? 'Rango saludable (0-10)' : 'Sobre rango saludable'}
        </span>
      </div>

      <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
        <span class="text-[10px] font-semibold text-[var(--muted-foreground)] block">Masa libre de grasa</span>
        <div class="flex items-baseline gap-1 mt-0.5">
          <span class="text-xs text-[var(--muted-foreground)]">${displayNumber(composition.startLean)}</span>
          <span class="text-sm font-extrabold text-blue-400">${displayNumber(composition.endLean)} kg</span>
        </div>
        <span class="text-[10px] font-bold text-blue-500 inline-flex items-center gap-1">
          ${composition.startLean > 0 && composition.endLean > 0
            ? `${composition.endLean >= composition.startLean ? icon('shield', 'w-3.5 h-3.5') : icon('trending-down', 'w-3.5 h-3.5')} ${(composition.endLean - composition.startLean).toFixed(1)} kg`
            : 'Sin comparación'}
        </span>
      </div>
    </div>
  ` : `
    <div class="p-4 rounded-xl bg-[var(--accent)]/40 border border-[var(--border)] text-center text-xs text-[var(--muted-foreground)]">
      Registra al menos dos mediciones (idealmente InBody) para ver la comparación de recomposición.
    </div>
  `;

  const synthesis = composition.hasComparison
    ? (composition.weightLost > 0
      ? `De los <b>${composition.weightLost} kg perdidos</b>, <b>${composition.fatLost > 0 ? composition.fatLost : 0} kg fueron grasa</b>${composition.pureFatPercent !== null ? ` (${composition.pureFatPercent}%)` : ''}. La masa libre de grasa pasó de <b>${composition.startLean || '—'} kg</b> a <b>${composition.endLean || '—'} kg</b>, y la grasa visceral de nivel <b>${composition.startVisceral || '—'}</b> a <b>${composition.endVisceral || '—'}</b>.`
      : `Tu peso no bajó en este período, pero la composición cambió: grasa de <b>${composition.startFat || '—'} kg</b> a <b>${composition.endFat || '—'} kg</b> y masa libre de grasa de <b>${composition.startLean || '—'} kg</b> a <b>${composition.endLean || '—'} kg</b>.`)
    : 'Aún no hay dos controles comparables. La tarjeta se calculará automáticamente cuando registres el siguiente.';

  container.innerHTML = `
    <div class="space-y-4 max-w-3xl mx-auto pb-24">

      <!-- Cabecera -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-[var(--foreground)]">Evolución & Métricas Corporales</h2>
            <p class="text-[13px] text-[var(--muted-foreground)]">Seguimiento de peso, grasa visceral y sobrecarga progresiva</p>
          </div>
          <button id="btnOpenNewMeasurementModal" class="btn-touch bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3 rounded-xl shadow-xs transition-all">
            + Nueva medición
          </button>
        </div>

        <div class="grid grid-cols-3 gap-2 mt-4 text-center">
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Peso actual</span>
            <span class="text-base font-extrabold text-[var(--foreground)] block">${displayNumber(composition.currentWeight)} kg</span>
            <span class="text-[10px] font-bold ${composition.weightDiff !== null && composition.weightDiff <= 0 ? 'text-emerald-500' : 'text-amber-500'} inline-flex items-center gap-1">
              ${composition.weightDiff === null ? 'Sin referencia' : `${composition.weightDiff < 0 ? icon('trending-down', 'w-3.5 h-3.5') : composition.weightDiff > 0 ? icon('trending-up', 'w-3.5 h-3.5') : '•'} ${composition.weightDiff > 0 ? '+' : ''}${composition.weightDiff} kg`}
            </span>
          </div>
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Masa libre de grasa</span>
            <span class="text-base font-extrabold text-blue-400 block">${displayNumber(composition.fatFreeMass)} kg</span>
            <span class="text-[10px] font-bold text-blue-400">${composition.fatFreeMass > 0 ? 'Último control' : 'Sin registro'}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Grasa visceral</span>
            <span class="text-base font-extrabold ${composition.visceralFat > 10 ? 'text-amber-400' : 'text-emerald-400'} block">${composition.visceralFat > 0 ? `Nivel ${composition.visceralFat}` : '—'}</span>
            <span class="text-[10px] font-bold ${composition.visceralFat > 10 ? 'text-amber-400' : 'text-emerald-400'}">${composition.visceralFat > 10 ? 'Sobre rango' : 'Rango saludable (0-10)'}</span>
          </div>
        </div>
      </div>

      <!-- RECOMPOSICIÓN CORPORAL (calculada desde las mediciones) -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-emerald-500/30 shadow-xs space-y-3 relative overflow-hidden">
        <div class="absolute -right-8 -top-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div class="flex items-center justify-between relative">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">${icon('trophy', 'w-5 h-5')}</div>
            <div>
              <div class="flex items-center gap-1.5">
                <h3 class="text-sm font-bold text-[var(--foreground)]">Recomposición Corporal • Control InBody</h3>
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">${composition.hasComparison ? 'Progreso' : 'Pendiente'}</span>
              </div>
              <p class="text-[12px] text-[var(--muted-foreground)]">
                ${composition.first && composition.last
                  ? `${escapeHtml(formatDisplayDate(composition.first.date))} ${icon('arrow-right', 'w-3.5 h-3.5 inline')} ${escapeHtml(formatDisplayDate(composition.last.date))}`
                  : 'Sin mediciones suficientes'}
              </p>
            </div>
          </div>
          ${composition.pureFatPercent !== null ? `
            <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 inline-flex items-center gap-1">
              ${icon('check', 'w-3.5 h-3.5')} ${composition.pureFatPercent}% grasa pura
            </span>
          ` : ''}
        </div>

        ${comparisonRows}

        <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
          <div class="flex items-center gap-1.5 font-bold text-emerald-500">
            <span>${icon('microscope', 'w-4 h-4')}</span> Diagnóstico de recomposición fisiológica
          </div>
          <p class="text-[12px] text-[var(--foreground)]/90 leading-relaxed">${synthesis}</p>
          ${composition.bmr > 0 ? `<p class="text-[10px] text-[var(--muted-foreground)]">TMB del último control: <b>${composition.bmr} kcal/día</b></p>` : ''}
        </div>
      </div>

      <!-- GRÁFICA 1: EVOLUCIÓN MENSUAL DE PESO POR EQUIPO -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 class="text-sm font-bold text-[var(--foreground)]">Evolución mensual de peso</h3>
          <div role="group" aria-label="Tipo de gráfica de peso" class="flex items-center gap-0.5 p-0.5 rounded-xl bg-[var(--accent)] border border-[var(--border)]">
            <button type="button" data-weight-view="bars" aria-pressed="${weightChartView === 'bars'}" class="weight-view-btn btn-touch px-2 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1 ${weightChartView === 'bars' ? 'bg-[var(--card)] text-amber-500 shadow-xs' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}">
              ${icon('chart-column', 'w-3.5 h-3.5')} Barras
            </button>
            <button type="button" data-weight-view="trend" aria-pressed="${weightChartView === 'trend'}" class="weight-view-btn btn-touch px-2 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1 ${weightChartView === 'trend' ? 'bg-[var(--card)] text-amber-500 shadow-xs' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}">
              ${icon('chart-line', 'w-3.5 h-3.5')} Tendencia
            </button>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-[10px] mb-2">
          <span class="inline-flex items-center gap-1 text-blue-500 font-bold"><span class="w-2 h-2 rounded-full bg-blue-500"></span> InBody</span>
          <span class="inline-flex items-center gap-1 text-amber-500 font-bold"><span class="w-2 h-2 rounded-full bg-amber-500"></span> Báscula hogar</span>
          <span class="inline-flex items-center gap-1 text-emerald-500 font-bold"><span class="w-4 border-t border-dashed border-emerald-500"></span> Meta</span>
        </div>
        <p class="text-[13px] text-[var(--muted-foreground)] mb-3">
          Última medición de cada mes por equipo. Rango objetivo ${escapeHtml(profile.targetWeightMin)} - ${escapeHtml(profile.targetWeightMax)} kg.
        </p>
        ${measurements.length === 0 ? `
          <div class="h-56 flex flex-col items-center justify-center rounded-xl bg-[var(--accent)]/40 border border-[var(--border)] text-center px-4">
            <span class="text-[var(--muted-foreground)] mb-2" aria-hidden="true">${icon('chart-column', 'w-7 h-7')}</span>
            <p class="text-xs font-semibold text-[var(--foreground)]">Aún no hay mediciones para graficar</p>
            <p class="text-[12px] text-[var(--muted-foreground)] mt-1">Registra tu primer control con “+ Nueva medición”.</p>
          </div>
        ` : `
          <div class="h-64 relative">
            <canvas id="chartWeightTrend"></canvas>
          </div>
          <details class="mt-3 group">
            <summary class="btn-touch cursor-pointer text-[12px] font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] inline-flex items-center gap-1.5">
              ${icon('list', 'w-4 h-4')} Ver datos en tabla
              <span class="transition-transform group-open:rotate-180">${icon('chevron-down', 'w-4 h-4')}</span>
            </summary>
            <div class="mt-2 overflow-x-auto rounded-xl border border-[var(--border)]">
              <table class="w-full text-[12px] text-left">
                <caption class="sr-only">Peso mensual por equipo y rango meta</caption>
                <thead class="bg-[var(--accent)]/60 text-[var(--muted-foreground)]">
                  <tr>
                    <th scope="col" class="px-3 py-2 font-bold">Mes</th>
                    <th scope="col" class="px-3 py-2 font-bold">InBody</th>
                    <th scope="col" class="px-3 py-2 font-bold">Báscula hogar</th>
                  </tr>
                </thead>
                <tbody>
                  ${weightSeries.labels.map((label, index) => `
                    <tr class="border-t border-[var(--border)]">
                      <th scope="row" class="px-3 py-2 font-semibold text-[var(--foreground)]">${escapeHtml(label)}</th>
                      <td class="px-3 py-2 font-mono">${weightSeries.inbodyData[index] != null ? `${weightSeries.inbodyData[index]} kg` : '—'}</td>
                      <td class="px-3 py-2 font-mono">${weightSeries.homeData[index] != null ? `${weightSeries.homeData[index]} kg` : '—'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </details>
        `}
      </div>

      <!-- BITÁCORA DE MEDICIONES & BIOIMPEDANCIA -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="text-sm font-bold text-[var(--foreground)]">Historial de Mediciones Corporales</h3>
            <p class="text-[13px] text-[var(--muted-foreground)]">Controles clínicos InBody y pesajes matutinos en hogar</p>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)]">
            ${measurements.length} registros
          </span>
        </div>

        <div class="space-y-2">
          ${measurements.length === 0 ? `
            <div class="p-4 text-center text-xs text-[var(--muted-foreground)]">Todavía no hay mediciones. Usa "+ Nueva medición".</div>
          ` : measurements.map(m => {
            const isClinic = String(m.source || '').toLowerCase().includes('inbody');
            const dateStr = formatDisplayDate(m.date);
            const weight = m.weight !== undefined ? m.weight : m.weightKg;
            const fatPercent = m.fatPercent || m.bodyFatPercent;
            const lean = m.fatFreeMass || (m.muscleMass ? `${m.muscleMass} kg musc.` : null);
            const visceral = m.visceralFat;
            const trunk = m.trunkFat;

            return `
              <div class="p-3 rounded-xl bg-[var(--accent)]/30 border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-extrabold text-[var(--foreground)] text-sm">${displayNumber(toNumber(weight))} kg</span>
                    <span class="text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${isClinic ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30' : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'}">
                      ${isClinic ? icon('hospital', 'w-3.5 h-3.5') : icon('scale', 'w-3.5 h-3.5')} ${isClinic ? 'InBody multicanal' : 'Báscula hogar'}
                    </span>
                    <span class="text-[10px] text-[var(--muted-foreground)] font-mono">${escapeHtml(dateStr)}</span>
                  </div>
                  <div class="flex items-center gap-2 mt-1.5 text-[11px] text-[var(--muted-foreground)] flex-wrap">
                    ${fatPercent ? `<span>Grasa: <strong class="text-[var(--foreground)]">${escapeHtml(fatPercent)}%</strong></span> •` : ''}
                    ${visceral ? `<span>Visceral: <strong class="${visceral <= 10 ? 'text-emerald-400' : 'text-amber-400'}">Nivel ${escapeHtml(visceral)}</strong></span> •` : ''}
                    ${trunk ? `<span>Tronco: <strong class="text-[var(--foreground)]">${escapeHtml(trunk)} kg</strong></span> •` : ''}
                    ${lean ? `<span>Masa magra: <strong class="text-blue-400">${escapeHtml(lean)} kg</strong></span> •` : ''}
                    ${m.bmr ? `<span>TMB: <strong class="text-[var(--foreground)]">${Math.round(toNumber(m.bmr))} kcal</strong></span>` : ''}
                  </div>
                  ${m.notes ? `<p class="text-[10px] text-[var(--muted-foreground)] italic mt-1 break-words">${escapeHtml(m.notes)}</p>` : ''}
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="text-[10px] font-bold px-2 py-1 rounded-lg ${isClinic ? 'bg-blue-500/10 text-blue-400' : 'bg-[var(--accent)] text-[var(--muted-foreground)]'}">
                    ${isClinic ? 'Referencia clínica' : 'Seguimiento diario'}
                  </span>
                  <button type="button" class="btn-delete-measurement w-11 h-11 inline-flex items-center justify-center text-rose-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20" data-date="${escapeAttr(m.date)}" aria-label="Eliminar medición del ${escapeAttr(dateStr)}">${icon('trash-2', 'w-5 h-5')}</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- GRÁFICA 2: SOBRECARGA PROGRESIVA POR EJERCICIO -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 class="text-sm font-bold text-[var(--foreground)]">Sobrecarga Progresiva por Máquina</h3>
            <p class="text-[13px] text-[var(--muted-foreground)]">Historial de placas y repeticiones de las ${allExercises.length} máquinas</p>
          </div>
          <select id="selectExerciseForChart" aria-label="Seleccionar ejercicio para la gráfica" class="text-xs py-1.5 px-2.5 rounded-xl bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] outline-none font-medium max-w-full sm:max-w-xs">
            ${exerciseOptionsHtml}
          </select>
        </div>
        <div class="h-56 relative">
          <canvas id="chartExerciseProgression"></canvas>
        </div>
        <div id="exerciseChartTable" class="mt-2"></div>
      </div>

      <!-- HISTORIAL DE SESIONES COMPLETADAS -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="text-sm font-bold text-[var(--foreground)]">Historial de Entrenamientos</h3>
            <p class="text-[13px] text-[var(--muted-foreground)]">Toca una sesión para desplegar el detalle de ejercicios y cargas</p>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)]">
            ${workoutLogs.length} sesiones
          </span>
        </div>

        <div class="space-y-2.5">
          ${workoutLogs.length === 0 ? `
            <div class="p-4 text-center text-xs text-[var(--muted-foreground)]">Aún no hay entrenamientos guardados.</div>
          ` : workoutLogs.map((log, logIdx) => {
            const sessionId = log.id || log.sessionId || `idx_${logIdx}`;
            const exercisesList = log.exercises || [];
            const strengthExercises = exercisesList.filter(e => !e.isCardio);
            const cardioEx = exercisesList.find(e => e.isCardio);
            const hasCardio = log.cardioDone || (cardioEx && cardioEx.sets && cardioEx.sets.some(s => s.completed));

            return `
              <div class="rounded-xl bg-[var(--accent)]/40 border border-[var(--border)] overflow-hidden text-xs transition-all">
                <button type="button" class="w-full p-3 flex items-center justify-between gap-2 text-left hover:bg-[var(--accent)]/70 transition-colors btn-toggle-workout-detail" data-target="workout-detail-${logIdx}" aria-expanded="false" aria-controls="workout-detail-${logIdx}">
                  <span class="block min-w-0">
                    <span class="flex items-center gap-2 flex-wrap">
                      <span class="font-bold text-[var(--foreground)] text-xs sm:text-sm">${escapeHtml(log.routineName || 'Sesión')}</span>
                      <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]">
                        ${escapeHtml(formatDisplayDate(log))}
                      </span>
                      ${hasCardio ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-bold inline-flex items-center gap-1">${icon('activity', 'w-3 h-3')} Cardio</span>` : ''}
                    </span>
                    <span class="block text-[12px] text-[var(--muted-foreground)] mt-0.5">
                      ${strengthExercises.length} máquinas registradas ${log.durationMinutes ? `• ${escapeHtml(log.durationMinutes)} min` : ''}
                    </span>
                  </span>

                  <span class="flex items-center gap-2 shrink-0">
                    <span class="text-[11px] font-semibold text-amber-500 flex items-center gap-1">
                      <span>Detalle</span>
                      <span class="transition-transform duration-200" id="arrow-workout-detail-${logIdx}">${icon('chevron-down', 'w-4 h-4')}</span>
                    </span>
                  </span>
                </button>

                <div id="workout-detail-${logIdx}" class="hidden px-3 pb-3 pt-2 border-t border-[var(--border)]/60 bg-[var(--card)]/50 space-y-2">
                  ${exercisesList.length > 0 ? `
                    <div class="space-y-1.5">
                      ${exercisesList.map(ex => {
                        const completedSets = (ex.sets || []).filter(s => s.completed);
                        const setsToShow = completedSets.length > 0 ? completedSets : (ex.sets || []);
                        const isCardioItem = !!ex.isCardio;
                        const setsText = isCardioItem
                          ? `${Number(ex.minutes ?? setsToShow[0]?.weight) || 20} min Zona 2`
                          : setsToShow.map(s => `${s.weight || 0} kg × ${s.reps || 0}`).join(' • ');

                        return `
                          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1.5 px-2.5 rounded-lg bg-[var(--accent)]/40 border border-[var(--border)]/50">
                            <span class="font-semibold text-[var(--foreground)] text-[11px] inline-flex items-center gap-1.5">
                              ${isCardioItem ? icon('activity', 'w-3.5 h-3.5 text-amber-500') : icon('dumbbell', 'w-3.5 h-3.5 text-amber-500')} ${escapeHtml(ex.exerciseName || ex.exerciseId)}
                            </span>
                            <span class="font-mono text-[11px] text-amber-400 font-bold break-words">
                              ${escapeHtml(setsText || 'Sin series')}
                            </span>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  ` : `<p class="text-[12px] text-[var(--muted-foreground)]">Sin desglose de ejercicios en esta sesión.</p>`}

                  ${log.notes ? `<p class="text-[12px] text-[var(--muted-foreground)] italic pt-1">Nota: ${escapeHtml(log.notes)}</p>` : ''}

                  <div class="flex items-center justify-between pt-2 border-t border-[var(--border)]/50 gap-2">
                    <span class="text-[10px] font-mono text-[var(--muted-foreground)] truncate">ID: ${escapeHtml(sessionId)}</span>
                    <button
                      type="button"
                      class="btn-delete-workout-session btn-touch text-[11px] font-bold text-rose-500 hover:text-rose-400 px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all inline-flex items-center justify-center gap-1.5 shrink-0"
                      data-session-id="${escapeAttr(sessionId)}"
                      data-routine-name="${escapeAttr(log.routineName || 'Sesión')}">
                      ${icon('trash-2', 'w-4 h-4')} Eliminar sesión
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- MODAL NUEVA MEDICIÓN -->
      <div id="modalNewMeasurement" class="hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="measurementModalTitle">
        <div class="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 max-w-md w-full space-y-4 shadow-xl my-8">
          <div class="flex items-center justify-between pb-2 border-b border-[var(--border)]">
            <div>
              <h3 id="measurementModalTitle" class="text-base font-bold text-[var(--foreground)]">Nueva Medición Corporal</h3>
              <p class="text-[12px] text-[var(--muted-foreground)]">Registra control InBody o pesaje en hogar</p>
            </div>
            <button id="btnCloseMeasModal" class="btn-touch w-11 rounded-xl text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] flex items-center justify-center shrink-0" aria-label="Cerrar">${icon('x', 'w-5 h-5')}</button>
          </div>

          <div class="space-y-3 text-xs max-h-[65vh] overflow-y-auto pr-1">
            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label for="inputMeasDate" class="font-bold text-[var(--foreground)] block mb-1">Fecha</label>
                <input type="date" id="inputMeasDate" value="${new Date().toLocaleDateString('en-CA')}" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
              </div>
              <div>
                <label for="inputMeasSource" class="font-bold text-[var(--foreground)] block mb-1">Equipo / fuente</label>
                <select id="inputMeasSource" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-medium">
                  <option value="Eufy Life (Báscula hogar)">Eufy Life (hogar)</option>
                  <option value="Smart Fit (InBody multicanal)">InBody (Smart Fit)</option>
                  <option value="Manual">Registro manual</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label for="inputMeasWeight" class="font-bold text-[var(--foreground)] block mb-1">Peso corporal (kg) *</label>
                <input type="number" step="0.1" id="inputMeasWeight" placeholder="Ej: 75.0" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
              </div>
              <div>
                <label for="inputMeasFatPercent" class="font-bold text-[var(--foreground)] block mb-1">% grasa corporal</label>
                <input type="number" step="0.1" id="inputMeasFatPercent" placeholder="Ej: 20.0" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label for="inputMeasFatMass" class="font-bold text-[var(--foreground)] block mb-1">Masa grasa (kg)</label>
                <input type="number" step="0.1" id="inputMeasFatMass" placeholder="Ej: 18.0" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
              </div>
              <div>
                <label for="inputMeasFatFreeMass" class="font-bold text-[var(--foreground)] block mb-1">Masa libre de grasa (kg)</label>
                <input type="number" step="0.1" id="inputMeasFatFreeMass" placeholder="Ej: 55.0" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label for="inputMeasMuscleMass" class="font-bold text-[var(--foreground)] block mb-1">Músculo esquelético (kg)</label>
                <input type="number" step="0.1" id="inputMeasMuscleMass" placeholder="Ej: 32.0" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
              </div>
              <div>
                <label for="inputMeasTrunkFat" class="font-bold text-[var(--foreground)] block mb-1">Grasa en tronco (kg)</label>
                <input type="number" step="0.01" id="inputMeasTrunkFat" placeholder="Ej: 12.0" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label for="inputMeasVisceral" class="font-bold text-[var(--foreground)] block mb-1">Grasa visceral (nivel)</label>
                <input type="number" id="inputMeasVisceral" placeholder="Ej: 6" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
              </div>
              <div>
                <label for="inputMeasBmr" class="font-bold text-[var(--foreground)] block mb-1">TMB basal (kcal)</label>
                <input type="number" id="inputMeasBmr" placeholder="Ej: 1600" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label for="inputMeasWaist" class="font-bold text-[var(--foreground)] block mb-1">Cintura (cm)</label>
                <input type="number" step="0.5" id="inputMeasWaist" placeholder="Opcional" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
              </div>
              <div>
                <label for="inputMeasNotes" class="font-bold text-[var(--foreground)] block mb-1">Notas adicionales</label>
                <input type="text" id="inputMeasNotes" placeholder="Ej: En ayunas 07:15" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)]" />
              </div>
            </div>
          </div>

          <div class="flex gap-2 pt-2 border-t border-[var(--border)]">
            <button id="btnSaveMeasurement" class="btn-touch flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-[13px] transition-all shadow-xs">
              Guardar y sincronizar
            </button>
            <button id="btnCancelMeasModal" class="btn-touch px-4 rounded-xl border border-[var(--border)] text-[13px] text-[var(--muted-foreground)] hover:bg-[var(--accent)]">
              Cancelar
            </button>
          </div>
        </div>
      </div>

    </div>
  `;

  attachAnalyticsEvents(container);
  initWeightChart(measurements, profile, weightChartView);
  const initialExId = container.querySelector('#selectExerciseForChart')?.value || 'chest_press';
  initExerciseChart(workoutLogs, initialExId);
}

function attachAnalyticsEvents(container) {
  const modal = container.querySelector('#modalNewMeasurement');
  const btnOpen = container.querySelector('#btnOpenNewMeasurementModal');
  const btnClose = container.querySelector('#btnCloseMeasModal');
  const btnCancel = container.querySelector('#btnCancelMeasModal');
  const btnSave = container.querySelector('#btnSaveMeasurement');
  const selectExercise = container.querySelector('#selectExerciseForChart');

  const closeModal = ({ fromPop = false } = {}) => {
    modal?.classList.add('hidden');
    const historyEntry = analyticsModalHistory;
    analyticsModalHistory = null;
    historyEntry?.release({ fromPop });
    btnOpen?.focus();
  };

  if (btnOpen && modal) {
    btnOpen.addEventListener('click', () => {
      modal.classList.remove('hidden');
      analyticsModalHistory = pushModalHistory(() => closeModal({ fromPop: true }));
      container.querySelector('#inputMeasDate')?.focus();
    });
  }
  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
  }
  if (analyticsEscapeHandler) {
    document.removeEventListener('keydown', analyticsEscapeHandler);
  }
  analyticsEscapeHandler = (event) => {
    if (event.key === 'Escape' && modal && !modal.classList.contains('hidden')) closeModal();
  };
  document.addEventListener('keydown', analyticsEscapeHandler);

  if (btnSave && modal) {
    btnSave.addEventListener('click', () => {
      const dateVal = container.querySelector('#inputMeasDate')?.value || new Date().toLocaleDateString('en-CA');
      const sourceVal = container.querySelector('#inputMeasSource')?.value || 'Manual';
      const weight = parseFloat(container.querySelector('#inputMeasWeight')?.value);
      const fatPercent = parseFloat(container.querySelector('#inputMeasFatPercent')?.value) || undefined;
      const fatMass = parseFloat(container.querySelector('#inputMeasFatMass')?.value) || undefined;
      const fatFreeMass = parseFloat(container.querySelector('#inputMeasFatFreeMass')?.value) || undefined;
      const muscleMass = parseFloat(container.querySelector('#inputMeasMuscleMass')?.value) || undefined;
      const trunkFat = parseFloat(container.querySelector('#inputMeasTrunkFat')?.value) || undefined;
      const visceral = parseInt(container.querySelector('#inputMeasVisceral')?.value, 10) || undefined;
      const bmr = parseFloat(container.querySelector('#inputMeasBmr')?.value) || undefined;
      const waist = parseFloat(container.querySelector('#inputMeasWaist')?.value) || undefined;
      const notes = container.querySelector('#inputMeasNotes')?.value || '';

      if (!weight || isNaN(weight)) {
        showToast('Ingresa un peso válido en kg.', 'warning');
        container.querySelector('#inputMeasWeight')?.focus();
        return;
      }

      db.addMeasurement({
        date: dateVal,
        source: sourceVal,
        weight,
        weightKg: weight,
        fatPercent,
        bodyFatPercent: fatPercent,
        fatMass,
        fatMassKg: fatMass,
        fatFreeMass,
        muscleMass,
        muscleMassKg: muscleMass,
        trunkFat,
        visceralFat: visceral,
        bmr,
        waistCircumferenceCm: waist,
        notes
      });

      showToast('Medición guardada.', 'success');
      renderAnalyticsModule(container);
    });
  }

  if (selectExercise) {
    selectExercise.addEventListener('change', (e) => {
      initExerciseChart(db.getWorkoutLogs(), e.target.value);
    });
  }

  // Alternar barras / tendencia sin perder el estado del resto de la vista.
  container.querySelectorAll('.weight-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.weightView === 'trend' ? 'trend' : 'bars';
      if (view === weightChartView) return;
      weightChartView = view;
      container.querySelectorAll('.weight-view-btn').forEach(item => {
        const active = item.dataset.weightView === weightChartView;
        item.setAttribute('aria-pressed', String(active));
        item.classList.toggle('bg-[var(--card)]', active);
        item.classList.toggle('text-amber-500', active);
        item.classList.toggle('shadow-xs', active);
        item.classList.toggle('text-[var(--muted-foreground)]', !active);
      });
      initWeightChart(db.getMeasurements(), db.getProfile(), weightChartView);
    });
  });

  container.querySelectorAll('.btn-toggle-workout-detail').forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.getAttribute('data-target');
      const detailEl = container.querySelector(`#${CSS.escape(targetId)}`);
      const arrowEl = container.querySelector(`#arrow-${CSS.escape(targetId)}`);
      if (detailEl) {
        const isHidden = detailEl.classList.contains('hidden');
        detailEl.classList.toggle('hidden');
        header.setAttribute('aria-expanded', String(isHidden));
        if (arrowEl) arrowEl.classList.toggle('rotate-180', isHidden);
      }
    });
  });

  container.querySelectorAll('.btn-delete-workout-session').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const sessionId = btn.getAttribute('data-session-id');
      const routineName = btn.getAttribute('data-routine-name');
      const ok = await confirmAction({
        title: '¿Eliminar esta sesión?',
        message: `Se eliminará "${routineName}" del historial local y de la nube en el próximo sync.`,
        confirmText: 'Eliminar',
        danger: true
      });
      if (!ok) return;
      db.deleteWorkoutSession(sessionId);
      showToast('Sesión eliminada.', 'success');
      renderAnalyticsModule(container);
    });
  });

  container.querySelectorAll('.btn-delete-measurement').forEach(btn => {
    btn.addEventListener('click', async () => {
      const date = btn.getAttribute('data-date');
      const ok = await confirmAction({
        title: '¿Eliminar esta medición?',
        message: `Se eliminará la medición del ${formatDisplayDate(date)}. La eliminación se sincroniza con la nube.`,
        confirmText: 'Eliminar',
        danger: true
      });
      if (!ok) return;
      db.deleteMeasurement(date);
      showToast('Medición eliminada.', 'success');
      renderAnalyticsModule(container);
    });
  });
}

// Agrupa por mes y equipo: la última medición de cada mes para InBody y
// para báscula hogar. Devuelve null cuando un equipo no midió ese mes.
function buildMonthlyWeightSeries(measurements) {
  const monthMap = new Map();

  sortedAscending(measurements).forEach((measurement) => {
    if (!measurement.date || !/^\d{4}-\d{2}/.test(measurement.date)) return;
    const weight = Number(measurement.weight) || Number(measurement.weightKg) || 0;
    if (weight <= 0) return;

    const monthKey = measurement.date.slice(0, 7);
    const category = String(measurement.source || '').toLowerCase().includes('inbody') ? 'inbody' : 'home';
    const bucket = monthMap.get(monthKey) || {};
    const previous = bucket[category];

    if (!previous || measurement.date >= previous.date) {
      bucket[category] = { ...measurement, weight };
    }
    monthMap.set(monthKey, bucket);
  });

  const keys = Array.from(monthMap.keys()).sort();

  return {
    keys,
    labels: keys.map((key) => `${key.slice(5, 7)}/${key.slice(0, 4)}`),
    inbodyData: keys.map((key) => monthMap.get(key)?.inbody?.weight ?? null),
    homeData: keys.map((key) => monthMap.get(key)?.home?.weight ?? null),
    inbodyMeta: keys.map((key) => monthMap.get(key)?.inbody || null),
    homeMeta: keys.map((key) => monthMap.get(key)?.home || null)
  };
}

function initWeightChart(measurements, profile, view = 'bars') {
  const canvas = document.getElementById('chartWeightTrend');
  if (!canvas || typeof Chart === 'undefined') return;

  const isDark = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.08)';
  const textColor = isDark ? '#94a3b8' : '#475569';

  const series = buildMonthlyWeightSeries(measurements);
  if (series.labels.length === 0) return;

  const targetMax = Number(profile.targetWeightMax) || 74;
  const targetMin = Number(profile.targetWeightMin) || 72;
  const allValues = [...series.inbodyData, ...series.homeData, targetMax, targetMin]
    .filter(value => typeof value === 'number' && value > 0);
  const yMin = allValues.length > 0 ? Math.max(0, Math.floor(Math.min(...allValues) - 2)) : 60;
  const yMax = allValues.length > 0 ? Math.ceil(Math.max(...allValues) + 2) : 100;

  const metaFor = (context) => {
    if (context.datasetIndex === 0) return series.inbodyMeta[context.dataIndex];
    if (context.datasetIndex === 1) return series.homeMeta[context.dataIndex];
    return null;
  };

  const goalLine = {
    type: 'line',
    label: 'Meta',
    data: series.labels.map(() => targetMax),
    borderColor: '#10b981',
    borderDash: [6, 4],
    borderWidth: 1.5,
    pointRadius: 0,
    pointHitRadius: 0,
    fill: false,
    order: 10
  };

  const barDatasets = [
    {
      type: 'bar',
      label: 'InBody',
      data: series.inbodyData,
      backgroundColor: 'rgba(59, 130, 246, 0.78)',
      hoverBackgroundColor: 'rgba(59, 130, 246, 0.95)',
      borderColor: '#3b82f6',
      borderWidth: 1,
      borderRadius: 6,
      borderSkipped: false,
      barPercentage: 0.9,
      categoryPercentage: 0.45
    },
    {
      type: 'bar',
      label: 'B?scula hogar',
      data: series.homeData,
      backgroundColor: 'rgba(245, 158, 11, 0.78)',
      hoverBackgroundColor: 'rgba(245, 158, 11, 0.95)',
      borderColor: '#f59e0b',
      borderWidth: 1,
      borderRadius: 6,
      borderSkipped: false,
      barPercentage: 0.9,
      categoryPercentage: 0.45
    },
    goalLine
  ];

  const lineDatasets = [
    {
      type: 'line',
      label: 'InBody',
      data: series.inbodyData,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.14)',
      borderWidth: 2.5,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: '#3b82f6',
      tension: 0.25,
      spanGaps: true,
      fill: true
    },
    {
      type: 'line',
      label: 'B?scula hogar',
      data: series.homeData,
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.14)',
      borderWidth: 2.5,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: '#f59e0b',
      tension: 0.25,
      spanGaps: true,
      fill: true
    },
    goalLine
  ];

  const summary = series.labels.map((label, index) => {
    const values = [];
    if (series.inbodyData[index] != null) values.push(`InBody ${series.inbodyData[index]} kg`);
    if (series.homeData[index] != null) values.push(`hogar ${series.homeData[index]} kg`);
    return `${label}${values.length ? ': ' + values.join(', ') : ': sin dato'}`;
  }).join('; ');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `Evoluci?n mensual de peso. ${summary}. Rango meta ${targetMin} a ${targetMax} kilogramos.`);

  if (weightChartInstance) weightChartInstance.destroy();

  weightChartInstance = new Chart(canvas, {
    type: view === 'trend' ? 'line' : 'bar',
    data: {
      labels: series.labels,
      datasets: view === 'trend' ? lineDatasets : barDatasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        y: {
          min: yMin,
          max: yMax,
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { size: 11 },
            callback: (value) => `${value} kg`
          }
        },
        x: {
          grid: { display: false },
          ticks: {
            color: textColor,
            font: { size: 11 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 12
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          titleColor: isDark ? '#f8fafc' : '#0f172a',
          bodyColor: isDark ? '#cbd5e1' : '#334155',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            title: (items) => items[0]?.label || '',
            label: (context) => {
              if (context.datasetIndex === 2) return `Meta: ${targetMax} kg`;
              const meta = metaFor(context);
              if (!meta) return null;
              return `${context.dataset.label}: ${context.parsed.y} kg`;
            },
            afterLabel: (context) => {
              if (context.datasetIndex === 2) return '';
              const meta = metaFor(context);
              if (!meta) return '';
              const lines = [];
              if (meta.date) lines.push(`Fecha: ${formatDisplayDate(meta.date)}`);
              const fat = meta.fatPercent ?? meta.bodyFatPercent;
              if (fat) lines.push(`Grasa: ${fat}%`);
              if (meta.fatFreeMass) lines.push(`Masa magra: ${meta.fatFreeMass} kg`);
              if (meta.visceralFat) lines.push(`Visceral: Nivel ${meta.visceralFat}`);
              return lines;
            }
          }
        }
      }
    }
  });
}

function initExerciseChart(workoutLogs, exerciseId) {
  const canvas = document.getElementById('chartExerciseProgression');
  if (!canvas || typeof Chart === 'undefined') return;

  const labels = [];
  const weights = [];
  const reps = [];
  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#94a3b8' : '#64748b';

  const reversed = [...workoutLogs].reverse();
  reversed.forEach(session => {
    if (!Array.isArray(session.exercises)) return;
    const exercise = session.exercises.find(item => item.exerciseId === exerciseId);
    if (!exercise || !Array.isArray(exercise.sets) || exercise.sets.length === 0) return;

    const completedSets = exercise.sets.filter(set => set.completed);
    const pool = completedSets.length > 0 ? completedSets : exercise.sets;
    const bestSet = pool.reduce((best, current) => {
      const currentWeight = parseFloat(current.weight) || 0;
      const bestWeight = parseFloat(best.weight) || 0;
      if (currentWeight > bestWeight) return current;
      if (currentWeight === bestWeight && (parseInt(current.reps) || 0) > (parseInt(best.reps) || 0)) return current;
      return best;
    }, pool[0]);

    if (bestSet && (bestSet.weight || bestSet.reps)) {
      const dateStr = session.date || (session.startTime ? session.startTime.split('T')[0] : '');
      if (dateStr) {
        labels.push(dateStr.slice(5, 10));
        weights.push(parseFloat(bestSet.weight) || 0);
        reps.push(parseInt(bestSet.reps) || 0);
      }
    }
  });

  const stats = db.getExerciseEvolutionStats(exerciseId);
  const fallbackWeight = stats?.targetWeight || stats?.baselineWeight || 0;

  const exerciseName = document.querySelector('#selectExerciseForChart option:checked')?.textContent?.trim() || 'Ejercicio seleccionado';
  const summary = (labels.length > 0 ? labels : ['Base configurada']).map((label, index) => {
    const weightValue = weights[index] ?? fallbackWeight;
    const repValue = reps[index] ?? 10;
    return `${label}: ${weightValue} kg × ${repValue} reps`;
  }).join('; ');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `Sobrecarga progresiva de ${exerciseName}. ${summary}.`);

  const tableHost = document.getElementById('exerciseChartTable');
  if (tableHost) {
    if (labels.length === 0) {
      tableHost.innerHTML = `<p class="text-[12px] text-[var(--muted-foreground)]">Aún no hay sesiones registradas para esta máquina. La tabla aparecerá al completar series.</p>`;
    } else {
      tableHost.innerHTML = `
        <details class="group">
          <summary class="btn-touch cursor-pointer text-[12px] font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] inline-flex items-center gap-1.5">
            ${icon('list', 'w-4 h-4')} Ver datos en tabla
            <span class="transition-transform group-open:rotate-180">${icon('chevron-down', 'w-4 h-4')}</span>
          </summary>
          <div class="mt-2 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table class="w-full text-[12px] text-left">
              <caption class="sr-only">Sobrecarga progresiva de ${escapeHtml(exerciseName)}</caption>
              <thead class="bg-[var(--accent)]/60 text-[var(--muted-foreground)]">
                <tr>
                  <th scope="col" class="px-3 py-2 font-bold">Fecha</th>
                  <th scope="col" class="px-3 py-2 font-bold">Carga</th>
                  <th scope="col" class="px-3 py-2 font-bold">Reps</th>
                </tr>
              </thead>
              <tbody>
                ${labels.map((label, index) => `
                  <tr class="border-t border-[var(--border)]">
                    <th scope="row" class="px-3 py-2 font-semibold text-[var(--foreground)]">${escapeHtml(label)}</th>
                    <td class="px-3 py-2 font-mono">${weights[index] ?? 0} kg</td>
                    <td class="px-3 py-2 font-mono">${reps[index] ?? 0}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </details>
      `;
    }
  }

  if (exerciseChartInstance) exerciseChartInstance.destroy();

  exerciseChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels.length > 0 ? labels : ['Base configurada'],
      datasets: [
        {
          label: 'Carga (kg / placa)',
          data: weights.length > 0 ? weights : [fallbackWeight],
          backgroundColor: '#3b82f6',
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          label: 'Reps',
          data: reps.length > 0 ? reps : [10],
          type: 'line',
          borderColor: '#10b981',
          backgroundColor: '#10b981',
          yAxisID: 'y1',
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: { display: true, text: 'Carga (kg)', color: textColor },
          grid: { color: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.08)' },
          ticks: { color: textColor }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: { display: true, text: 'Reps', color: '#10b981' },
          min: 0,
          max: 20,
          grid: { display: false },
          ticks: { color: textColor }
        },
        x: {
          grid: { display: false },
          ticks: { color: textColor }
        }
      },
      plugins: {
        legend: { labels: { color: textColor, font: { size: 10 } } }
      }
    }
  });
}
