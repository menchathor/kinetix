// Módulo de Evolución, Gráficas de Sobrecarga Progresiva y Mediciones Corporales
import { db, formatDisplayDate } from '../services/db.js';
import { INITIAL_DATA } from '../data/initialData.js';

let weightChartInstance = null;
let exerciseChartInstance = null;

export function renderAnalyticsModule(container) {
  const measurements = db.getMeasurements();
  const workoutLogs = db.getWorkoutLogs();

  // Buscar mediciones InBody clínicas y datos actuales
  const inbodyMeas = measurements.find(m => m.source?.toLowerCase().includes('inbody')) || measurements[0] || {};
  const currentWeight = Number(inbodyMeas.weight || inbodyMeas.weightKg || measurements[0]?.weight || 82.2);
  const initialWeight = Number(INITIAL_DATA.profile.startWeight || 85.3);
  const weightDiff = (currentWeight - initialWeight).toFixed(1);
  const visceralLevel = inbodyMeas.visceralFat || INITIAL_DATA.profile.visceralFat || 8;
  const leanMass = inbodyMeas.fatFreeMass || INITIAL_DATA.profile.fatFreeMass || 58.3;

  container.innerHTML = `
    <div class="space-y-4 max-w-3xl mx-auto pb-24">
      
      <!-- Cabecera -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-[var(--foreground)]">Evolución & Métricas Corporales</h2>
            <p class="text-xs text-[var(--muted-foreground)]">Seguimiento de peso, grasa visceral y sobrecarga progresiva</p>
          </div>
          <button id="btnOpenNewMeasurementModal" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs transition-all">
            + Registrar Peso / Cintura
          </button>
        </div>

        <!-- Indicadores Clave -->
        <div class="grid grid-cols-3 gap-2 mt-4 text-center">
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Peso Actual (InBody)</span>
            <span class="text-base font-extrabold text-[var(--foreground)] block">${currentWeight} kg</span>
            <span class="text-[10px] font-bold text-emerald-400">📉 ${weightDiff < 0 ? weightDiff : '+' + weightDiff} kg</span>
          </div>
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Masa Libre de Grasa</span>
            <span class="text-base font-extrabold text-blue-400 block">${leanMass} kg</span>
            <span class="text-[10px] font-bold text-blue-400">🛡️ 100% Protegida</span>
          </div>
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Grasa Visceral</span>
            <span class="text-base font-extrabold text-emerald-400 block">Nivel ${visceralLevel}</span>
            <span class="text-[10px] font-bold text-emerald-400">🎯 Meta lograda (0-10)</span>
          </div>
        </div>
      </div>

      <!-- RECOMPOSICIÓN CORPORAL INBODY: HITO MES 1 (07 SEP vs 12 OCT) -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-emerald-500/30 shadow-xs space-y-3 relative overflow-hidden">
        <div class="absolute -right-8 -top-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div class="flex items-center justify-between relative">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-base">
              🏆
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <h3 class="text-sm font-bold text-[var(--foreground)]">Recomposición Corporal • Control InBody</h3>
                <span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">Mes 1</span>
              </div>
              <p class="text-[11px] text-[var(--muted-foreground)]">Bioimpedancia clínica Smart Fit (07 Sep ➔ 12 Oct)</p>
            </div>
          </div>
          <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            ✓ 93.5% Grasa Pura
          </span>
        </div>

        <!-- 6 Métricas Comparativas Clave -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          <!-- 1: Peso Báscula -->
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] font-semibold text-[var(--muted-foreground)] block">Peso en Báscula</span>
            <div class="flex items-baseline gap-1 mt-0.5">
              <span class="text-xs text-[var(--muted-foreground)] line-through">85.3</span>
              <span class="text-sm font-extrabold text-[var(--foreground)]">82.2 kg</span>
            </div>
            <span class="text-[10px] font-bold text-emerald-400">📉 -3.1 kg total</span>
          </div>

          <!-- 2: Masa Grasa Pura -->
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] font-semibold text-[var(--muted-foreground)] block">Masa Grasa Total</span>
            <div class="flex items-baseline gap-1 mt-0.5">
              <span class="text-xs text-[var(--muted-foreground)] line-through">22.0</span>
              <span class="text-sm font-extrabold text-amber-500">19.1 kg</span>
            </div>
            <span class="text-[10px] font-bold text-emerald-400">🔥 -2.9 kg grasa pura</span>
          </div>

          <!-- 3: % Grasa Corporal -->
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] font-semibold text-[var(--muted-foreground)] block">% Grasa Corporal</span>
            <div class="flex items-baseline gap-1 mt-0.5">
              <span class="text-xs text-[var(--muted-foreground)] line-through">25.8%</span>
              <span class="text-sm font-extrabold text-amber-500">23.2%</span>
            </div>
            <span class="text-[10px] font-bold text-emerald-400">📉 -2.6% grasa</span>
          </div>

          <!-- 4: Grasa del Tronco -->
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] font-semibold text-[var(--muted-foreground)] block">Grasa en Tronco</span>
            <div class="flex items-baseline gap-1 mt-0.5">
              <span class="text-xs text-[var(--muted-foreground)] line-through">16.45</span>
              <span class="text-sm font-extrabold text-[var(--foreground)]">13.97 kg</span>
            </div>
            <span class="text-[10px] font-bold text-emerald-400">🎯 -2.48 kg abdomen</span>
          </div>

          <!-- 5: Grasa Visceral -->
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] font-semibold text-[var(--muted-foreground)] block">Grasa Visceral</span>
            <div class="flex items-baseline gap-1 mt-0.5">
              <span class="text-xs text-[var(--muted-foreground)] line-through">Nivel 9</span>
              <span class="text-sm font-extrabold text-emerald-400">Nivel 8</span>
            </div>
            <span class="text-[10px] font-bold text-emerald-400">🏆 Meta lograda (0-10)</span>
          </div>

          <!-- 6: Masa Magra Libre de Grasa -->
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] font-semibold text-[var(--muted-foreground)] block">Masa Libre de Grasa</span>
            <div class="flex items-baseline gap-1 mt-0.5">
              <span class="text-xs text-[var(--muted-foreground)]">58.3</span>
              <span class="text-sm font-extrabold text-blue-400">58.3 kg</span>
            </div>
            <span class="text-[10px] font-bold text-blue-400">🛡️ 100% Protegida intacta</span>
          </div>
        </div>

        <!-- Síntesis Clínica & Fisiológica -->
        <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
          <div class="flex items-center gap-1.5 font-bold text-emerald-400">
            <span>🔬</span> Diagnóstico de Recomposición Fisiológica:
          </div>
          <p class="text-[11px] text-[var(--foreground)]/90 leading-relaxed">
            Recomposición exitosa: de los <b>3.1 kg perdidos</b>, <b>2.9 kg fueron grasa pura (93.5%)</b>, blindando intactos los <b>58.3 kg de masa magra metabólica</b> y manteniendo una TMB activa de <b>1817 kcal</b>. La caída de <b>2.48 kg en grasa troncal</b> reduce drásticamente el riesgo cardiovascular y la resistencia periférica, favoreciendo el manejo de tu hipotiroidismo.
          </p>
        </div>
      </div>

      <!-- GRÁFICA 1: TENDENCIA DE PESO Y META -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex items-center justify-between mb-1">
          <h3 class="text-sm font-bold text-[var(--foreground)]">Evolución de Peso Corporal</h3>
          <div class="flex items-center gap-2 text-[10px]">
            <span class="inline-flex items-center gap-1 text-blue-400 font-bold"><span class="w-2 h-2 rounded-full bg-blue-500"></span> InBody Clínico</span>
            <span class="inline-flex items-center gap-1 text-amber-500 font-bold"><span class="w-2 h-2 rounded-full bg-amber-500"></span> Eufy Hogar</span>
          </div>
        </div>
        <p class="text-xs text-[var(--muted-foreground)] mb-3">Tendencia hacia el rango óptimo de recomposición (72 - 74 kg)</p>
        <div class="h-56 relative">
          <canvas id="chartWeightTrend"></canvas>
        </div>
      </div>

      <!-- BITÁCORA DE MEDICIONES & BIOIMPEDANCIA -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="text-sm font-bold text-[var(--foreground)]">Historial de Mediciones Corporales</h3>
            <p class="text-xs text-[var(--muted-foreground)]">Controles clínicos InBody y pesajes matutinos en hogar</p>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)]">
            ${measurements.length} Registros
          </span>
        </div>

        <div class="space-y-2">
          ${measurements.map(m => {
            const isClinic = m.source?.toLowerCase().includes('inbody');
            const dateStr = formatDisplayDate(m.date);
            const w = m.weight !== undefined ? m.weight : m.weightKg;
            const fatP = m.fatPercent || m.bodyFatPercent;
            const lean = m.fatFreeMass || (m.muscleMass ? `${m.muscleMass} kg musc.` : null);
            const visc = m.visceralFat;
            const trunk = m.trunkFat;

            return `
              <div class="p-3 rounded-xl bg-[var(--accent)]/30 border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-extrabold text-[var(--foreground)] text-sm">${w} kg</span>
                    <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${isClinic ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'}">
                      ${isClinic ? '🏥 InBody Multicanal (Smart Fit)' : '🏠 Eufy Life (Báscula Hogar)'}
                    </span>
                    <span class="text-[10px] text-[var(--muted-foreground)] font-mono">${dateStr}</span>
                  </div>
                  <div class="flex items-center gap-2 mt-1.5 text-[11px] text-[var(--muted-foreground)] flex-wrap">
                    ${fatP ? `<span>Grasa: <strong class="text-[var(--foreground)]">${fatP}%</strong></span> •` : ''}
                    ${visc ? `<span>Visceral: <strong class="${visc <= 8 ? 'text-emerald-400' : 'text-amber-500'}">Nivel ${visc}</strong></span> •` : ''}
                    ${trunk ? `<span>Tronco: <strong class="text-[var(--foreground)]">${trunk} kg</strong></span> •` : ''}
                    ${lean ? `<span>Masa Magra: <strong class="text-blue-400">${lean} kg</strong></span> •` : ''}
                    ${m.bmr ? `<span>TMB: <strong class="text-[var(--foreground)]">${Math.round(m.bmr)} kcal</strong></span>` : ''}
                  </div>
                  ${m.notes ? `<p class="text-[10px] text-[var(--muted-foreground)] italic mt-1">${m.notes}</p>` : ''}
                </div>
                <div class="text-right shrink-0">
                  <span class="text-[10px] font-bold px-2 py-1 rounded-lg ${isClinic ? 'bg-blue-500/10 text-blue-400' : 'bg-[var(--accent)] text-[var(--muted-foreground)]'}">
                    ${isClinic ? 'Referencia Clínica' : 'Seguimiento Diario'}
                  </span>
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
            <p class="text-xs text-[var(--muted-foreground)]">Historial de placas y repeticiones sesión a sesión</p>
          </div>
          <select id="selectExerciseForChart" class="text-xs py-1.5 px-2.5 rounded-xl bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] outline-none font-medium">
            <option value="chest_press">Press Pecho Máquina (40)</option>
            <option value="pec_deck">Mariposa Pectoral (Pec Deck) (47)</option>
            <option value="lat_pulldown">Tracción Lateral Superior / Jalón (47)</option>
            <option value="lat_pulldown_neutral">Tracción Dorsal Fija (40)</option>
            <option value="cable_row">Remo Sentado / Soporte (33)</option>
            <option value="shoulder_press">Press Hombro Máquina (25)</option>
            <option value="leg_press">Prensa de Piernas (75)</option>
            <option value="leg_extension">Extensión Piernas (47)</option>
            <option value="leg_curl">Contracción Piernas / Curl (46)</option>
            <option value="hip_thrust_machine">Hip & Glute (89)</option>
            <option value="biceps_cable_curl">Bíceps Polea Baja (21)</option>
            <option value="triceps_pushdown">Tríceps Polea Alta (18)</option>
          </select>
        </div>
        <div class="h-56 relative">
          <canvas id="chartExerciseProgression"></canvas>
        </div>
      </div>

      <!-- HISTORIAL DE SESIONES COMPLETADAS -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <h3 class="text-sm font-bold text-[var(--foreground)] mb-3">Historial de Entrenamientos</h3>
        <div class="space-y-2">
          ${workoutLogs.map(log => `
            <div class="p-3 rounded-xl bg-[var(--accent)]/40 border border-[var(--border)] flex items-center justify-between text-xs">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-[var(--foreground)]">${log.routineName || 'Sesión'}</span>
                  <span class="text-[10px] text-[var(--muted-foreground)]">${formatDisplayDate(log)}</span>
                </div>
                <p class="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                  ${log.exercises?.length || 0} ejercicios completados ${log.durationMinutes ? `• ${log.durationMinutes} min` : ''}
                </p>
              </div>
              <span class="font-mono text-emerald-400 text-xs font-bold">✓ Guardado</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- MODAL PARA NUEVA MEDICIÓN (Oculto por defecto) -->
      <div id="modalNewMeasurement" class="hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 max-w-sm w-full space-y-4 shadow-xl">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-[var(--foreground)]">Nueva Medición Corporal</h3>
            <button id="btnCloseMeasModal" class="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm font-bold">✕</button>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <label class="font-bold text-[var(--foreground)] block mb-1">Peso en Báscula (kg)</label>
              <input type="number" step="0.1" id="inputMeasWeight" placeholder="Ej: 84.5" class="w-full p-2.5 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
            </div>
            <div>
              <label class="font-bold text-[var(--foreground)] block mb-1">Circunferencia Cintura (cm, altura ombligo)</label>
              <input type="number" step="0.5" id="inputMeasWaist" placeholder="Opcional pero recomendado" class="w-full p-2.5 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
            </div>
            <div>
              <label class="font-bold text-[var(--foreground)] block mb-1">Grasa Visceral (Nivel en báscula)</label>
              <input type="number" id="inputMeasVisceral" placeholder="Ej: 9 o 13" class="w-full p-2.5 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
            </div>
            <div>
              <label class="font-bold text-[var(--foreground)] block mb-1">Notas / Fuente</label>
              <input type="text" id="inputMeasNotes" placeholder="Ej: Eufy sábado en ayunas" class="w-full p-2.5 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)]" />
            </div>
          </div>

          <div class="flex gap-2 pt-2">
            <button id="btnSaveMeasurement" class="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-xl text-xs transition-all">
              Guardar Medición
            </button>
            <button id="btnCancelMeasModal" class="px-3 py-2 rounded-xl border border-[var(--border)] text-xs text-[var(--muted-foreground)] hover:bg-[var(--accent)]">
              Cancelar
            </button>
          </div>
        </div>
      </div>

    </div>
  `;

  attachAnalyticsEvents(container, measurements, workoutLogs);
  initWeightChart(measurements);
  initExerciseChart(workoutLogs, 'chest_press');
}

function attachAnalyticsEvents(container, measurements, workoutLogs) {
  const modal = container.querySelector('#modalNewMeasurement');
  const btnOpen = container.querySelector('#btnOpenNewMeasurementModal');
  const btnClose = container.querySelector('#btnCloseMeasModal');
  const btnCancel = container.querySelector('#btnCancelMeasModal');
  const btnSave = container.querySelector('#btnSaveMeasurement');
  const selectExercise = container.querySelector('#selectExerciseForChart');

  if (btnOpen && modal) {
    btnOpen.addEventListener('click', () => modal.classList.remove('hidden'));
  }
  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  }
  if (btnCancel && modal) {
    btnCancel.addEventListener('click', () => modal.classList.add('hidden'));
  }

  if (btnSave && modal) {
    btnSave.addEventListener('click', () => {
      const weight = parseFloat(container.querySelector('#inputMeasWeight').value);
      const waist = parseFloat(container.querySelector('#inputMeasWaist').value) || null;
      const visceral = parseInt(container.querySelector('#inputMeasVisceral').value) || null;
      const notes = container.querySelector('#inputMeasNotes').value || 'Registro semanal';

      if (!weight || isNaN(weight)) {
        alert('Por favor ingresa un peso válido en kg.');
        return;
      }

      db.addMeasurement({
        date: new Date().toLocaleDateString('en-CA'),
        source: notes,
        weight,
        waistCm: waist,
        visceralFat: visceral
      });

      modal.classList.add('hidden');
      renderAnalyticsModule(container);
    });
  }

  if (selectExercise) {
    selectExercise.addEventListener('change', (e) => {
      initExerciseChart(workoutLogs, e.target.value);
    });
  }
}

function initWeightChart(measurements) {
  const canvas = document.getElementById('chartWeightTrend');
  if (!canvas || typeof Chart === 'undefined') return;

  const isDark = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.08)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  const reversed = [...measurements].reverse();
  const labels = reversed.map(m => (m.date ? m.date.slice(5) : '')); // MM-DD
  const dataWeights = reversed.map(m => Number(m.weight !== undefined ? m.weight : m.weightKg) || 0);
  const pointColors = reversed.map(m => (m.source && m.source.toLowerCase().includes('inbody')) ? '#3b82f6' : '#f59e0b');
  const pointBorderColors = reversed.map(m => (m.source && m.source.toLowerCase().includes('inbody')) ? '#1d4ed8' : '#d97706');
  const pointRadii = reversed.map(m => (m.source && m.source.toLowerCase().includes('inbody')) ? 7 : 5);

  if (weightChartInstance) {
    weightChartInstance.destroy();
  }

  weightChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Peso Registrado (kg)',
          data: dataWeights,
          borderColor: 'rgba(245, 158, 11, 0.7)',
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          fill: true,
          tension: 0.3,
          pointRadius: pointRadii,
          pointHoverRadius: 8,
          pointBackgroundColor: pointColors,
          pointBorderColor: pointBorderColors,
          pointBorderWidth: 2
        },
        {
          label: 'Meta Máxima (74 kg)',
          data: labels.map(() => 74),
          borderColor: '#10b981',
          borderDash: [5, 5],
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
          min: 70,
          max: 88,
          grid: { color: gridColor },
          ticks: { color: textColor }
        },
        x: {
          grid: { display: false },
          ticks: { color: textColor }
        }
      },
      plugins: {
        legend: {
          labels: { color: textColor, font: { size: 10 } }
        },
        tooltip: {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          titleColor: isDark ? '#f8fafc' : '#0f172a',
          bodyColor: isDark ? '#cbd5e1' : '#334155',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex;
              const m = reversed[idx];
              return m ? `${m.date} • ${m.source || 'Báscula'}` : '';
            },
            label: (context) => {
              if (context.datasetIndex === 0) {
                const idx = context.dataIndex;
                const m = reversed[idx];
                const lines = [`Peso: ${context.parsed.y} kg`];
                const fat = m?.fatPercent || m?.bodyFatPercent;
                if (fat) lines.push(`Grasa Corporal: ${fat}%`);
                if (m?.fatFreeMass) lines.push(`Masa Libre de Grasa: ${m.fatFreeMass} kg`);
                if (m?.visceralFat) lines.push(`Grasa Visceral: Nivel ${m.visceralFat}`);
                return lines;
              }
              return `${context.dataset.label}: ${context.parsed.y} kg`;
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

  // Extraer puntos históricos de este ejercicio
  const labels = [];
  const weights = [];
  const reps = [];

  const reversed = [...workoutLogs].reverse();
  reversed.forEach(session => {
    if (session.exercises) {
      const ex = session.exercises.find(e => e.exerciseId === exerciseId);
      if (ex && ex.sets) {
        const bestSet = ex.sets.find(s => s.completed) || ex.sets[0];
        if (bestSet && bestSet.weight) {
          const dateStr = session.date || (session.startTime ? session.startTime.split('T')[0] : '');
          if (dateStr) {
            labels.push(dateStr.slice(5, 10));
            weights.push(parseFloat(bestSet.weight) || 0);
            reps.push(parseInt(bestSet.reps) || 0);
          }
        }
      }
    }
  });

  if (exerciseChartInstance) {
    exerciseChartInstance.destroy();
  }

  exerciseChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels.length > 0 ? labels : ['Calibración Inicial'],
      datasets: [
        {
          label: 'Carga (lb / placa)',
          data: weights.length > 0 ? weights : [40],
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
          title: { display: true, text: 'Placa', color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b' },
          grid: { color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.08)' },
          ticks: { color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b' }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: { display: true, text: 'Reps', color: '#10b981' },
          min: 0,
          max: 15,
          grid: { display: false },
          ticks: { color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b' }
        },
        x: {
          grid: { display: false },
          ticks: { color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b' }
        }
      },
      plugins: {
        legend: {
          labels: { color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b', font: { size: 10 } }
        }
      }
    }
  });
}
