// Módulo de Evolución, Gráficas de Sobrecarga Progresiva y Mediciones Corporales
import { db } from '../services/db.js';
import { INITIAL_DATA } from '../data/initialData.js';

let weightChartInstance = null;
let exerciseChartInstance = null;

export function renderAnalyticsModule(container) {
  const measurements = db.getMeasurements();
  const workoutLogs = db.getWorkoutLogs();

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
            <span class="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Peso Actual</span>
            <span class="text-base font-extrabold text-[var(--foreground)] block">${measurements[0]?.weight || 85.0} kg</span>
            <span class="text-[10px] text-emerald-400">Meta: 72-74 kg</span>
          </div>
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Músculo Esquelético</span>
            <span class="text-base font-extrabold text-blue-400 block">${INITIAL_DATA.profile.skeletalMuscleMass} kg</span>
            <span class="text-[10px] text-[var(--muted-foreground)]">Proteger al 100%</span>
          </div>
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Grasa Visceral</span>
            <span class="text-base font-extrabold text-amber-500 block">Nivel ${measurements[0]?.visceralFat || 9}</span>
            <span class="text-[10px] text-[var(--muted-foreground)]">Meta: 7-8</span>
          </div>
        </div>
      </div>

      <!-- GRÁFICA 1: TENDENCIA DE PESO Y META -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <h3 class="text-sm font-bold text-[var(--foreground)] mb-1">Evolución de Peso Corporal</h3>
        <p class="text-xs text-[var(--muted-foreground)] mb-3">Tendencia hacia el rango óptimo de recomposición (72 - 74 kg)</p>
        <div class="h-56 relative">
          <canvas id="chartWeightTrend"></canvas>
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
                  <span class="text-[10px] text-[var(--muted-foreground)]">${new Date(log.date).toLocaleDateString('es-CL')}</span>
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
        date: new Date().toISOString().split('T')[0],
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
  const labels = reversed.map(m => m.date.slice(5)); // MM-DD
  const dataWeights = reversed.map(m => m.weight);

  if (weightChartInstance) {
    weightChartInstance.destroy();
  }

  weightChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Peso (kg)',
          data: dataWeights,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: '#f59e0b'
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
          labels.push(session.date.slice(5, 10));
          weights.push(parseFloat(bestSet.weight) || 0);
          reps.push(parseInt(bestSet.reps) || 0);
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
