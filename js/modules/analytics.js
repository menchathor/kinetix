// Módulo de Evolución, Gráficas de Sobrecarga Progresiva y Mediciones Corporales
import { db, formatDisplayDate } from '../services/db.js';
import { INITIAL_DATA } from '../data/initialData.js';

let weightChartInstance = null;
let exerciseChartInstance = null;

export function renderAnalyticsModule(container) {
  const measurements = db.getMeasurements();
  const workoutLogs = db.getWorkoutLogs();
  const allExercises = db.getAllExercisesAnalytics();

  // Buscar mediciones InBody clínicas y datos actuales
  const inbodyMeas = measurements.find(m => m.source?.toLowerCase().includes('inbody')) || measurements[0] || {};
  const currentWeight = Number(inbodyMeas.weight || inbodyMeas.weightKg || measurements[0]?.weight || 82.2);
  const initialWeight = Number(INITIAL_DATA.profile.startWeight || 85.3);
  const weightDiff = (currentWeight - initialWeight).toFixed(1);
  const visceralLevel = inbodyMeas.visceralFat || INITIAL_DATA.profile.visceralFat || 8;
  const leanMass = inbodyMeas.fatFreeMass || INITIAL_DATA.profile.fatFreeMass || 58.3;

  // Agrupar todos los ejercicios por rutina para el selector completo
  const routinesOrder = [
    { id: 'torso1', label: '🏋️ Torso 1 (Lunes)' },
    { id: 'pierna1', label: '🦵 Pierna 1 (Martes)' },
    { id: 'torso2', label: '💪 Torso 2 (Jueves)' },
    { id: 'pierna2', label: '🔥 Pierna 2 (Viernes)' }
  ];

  const exerciseOptionsHtml = routinesOrder.map(rGroup => {
    const groupItems = allExercises.filter(ex => ex.routineId === rGroup.id);
    if (groupItems.length === 0) return '';
    return `
      <optgroup label="${rGroup.label}">
        ${groupItems.map(ex => {
          const w = ex.stats?.targetWeight || ex.stats?.prWeight || ex.baseWeight || 0;
          return `<option value="${ex.id}">${ex.name} (${w && w !== 'Auto' ? w + ' lb' : 'Peso libre'})</option>`;
        }).join('')}
      </optgroup>
    `;
  }).join('');

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
            + Nueva Medición
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

      <!-- GRÁFICA 2: SOBRECARGA PROGRESIVA POR EJERCICIO (TODAS LAS MÁQUINAS) -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 class="text-sm font-bold text-[var(--foreground)]">Sobrecarga Progresiva por Máquina</h3>
            <p class="text-xs text-[var(--muted-foreground)]">Historial de placas y repeticiones de las ${allExercises.length} máquinas del programa</p>
          </div>
          <select id="selectExerciseForChart" class="text-xs py-1.5 px-2.5 rounded-xl bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] outline-none font-medium max-w-full sm:max-w-xs">
            ${exerciseOptionsHtml}
          </select>
        </div>
        <div class="h-56 relative">
          <canvas id="chartExerciseProgression"></canvas>
        </div>
      </div>

      <!-- HISTORIAL DE SESIONES COMPLETADAS (EXPANDIBLE Y EDITABLE) -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="text-sm font-bold text-[var(--foreground)]">Historial de Entrenamientos</h3>
            <p class="text-xs text-[var(--muted-foreground)]">Toca una sesión para desplegar el detalle de ejercicios y cargas</p>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)]">
            ${workoutLogs.length} Sesiones
          </span>
        </div>

        <div class="space-y-2.5">
          ${workoutLogs.map((log, logIdx) => {
            const sessionId = log.id || log.sessionId || `idx_${logIdx}`;
            const exercisesList = log.exercises || [];
            const strengthExercises = exercisesList.filter(e => !e.isCardio);
            const cardioEx = exercisesList.find(e => e.isCardio);
            const hasCardio = log.cardioDone || (cardioEx && cardioEx.sets && cardioEx.sets.some(s => s.completed));

            return `
              <div class="rounded-xl bg-[var(--accent)]/40 border border-[var(--border)] overflow-hidden text-xs transition-all">
                <!-- Cabecera clicable del acordeón -->
                <div class="p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-[var(--accent)]/70 transition-colors btn-toggle-workout-detail" data-target="workout-detail-${logIdx}">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-bold text-[var(--foreground)] text-xs sm:text-sm">${log.routineName || 'Sesión'}</span>
                      <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]">
                        ${formatDisplayDate(log)}
                      </span>
                      ${hasCardio ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">🏃 Cardio ✓</span>` : ''}
                    </div>
                    <p class="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                      ${strengthExercises.length} máquinas registradas ${log.durationMinutes ? `• ${log.durationMinutes} min` : ''}
                    </p>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <span class="text-[11px] font-semibold text-amber-500 flex items-center gap-1">
                      <span>Detalle</span>
                      <span class="text-[9px] transition-transform" id="arrow-workout-detail-${logIdx}">▼</span>
                    </span>
                  </div>
                </div>

                <!-- Cuerpo expandible con desglose de series y botón eliminar -->
                <div id="workout-detail-${logIdx}" class="hidden px-3 pb-3 pt-2 border-t border-[var(--border)]/60 bg-[var(--card)]/50 space-y-2">
                  ${exercisesList.length > 0 ? `
                    <div class="space-y-1.5">
                      ${exercisesList.map(ex => {
                        const completedSets = (ex.sets || []).filter(s => s.completed);
                        const setsToShow = completedSets.length > 0 ? completedSets : (ex.sets || []);
                        const isCardioItem = !!ex.isCardio;
                        const setsText = isCardioItem
                          ? `${setsToShow[0]?.weight || 20} min Zona 2`
                          : setsToShow.map(s => `${s.weight || 0} lb × ${s.reps || 0}`).join(' • ');

                        return `
                          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1.5 px-2.5 rounded-lg bg-[var(--accent)]/40 border border-[var(--border)]/50">
                            <span class="font-semibold text-[var(--foreground)] text-[11px]">
                              ${isCardioItem ? '🏃 ' : '🏋️ '}${ex.exerciseName || ex.exerciseId}
                            </span>
                            <span class="font-mono text-[11px] text-amber-400 font-bold">
                              ${setsText || 'Sin series'}
                            </span>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  ` : `<p class="text-[11px] text-[var(--muted-foreground)]">Sin desglose de ejercicios en esta sesión.</p>`}

                  ${log.notes ? `<p class="text-[11px] text-[var(--muted-foreground)] italic pt-1">Nota: ${log.notes}</p>` : ''}

                  <div class="flex items-center justify-between pt-2 border-t border-[var(--border)]/50">
                    <span class="text-[10px] font-mono text-[var(--muted-foreground)]">ID: ${sessionId}</span>
                    ${sessionId !== 'session_baseline_20260910' ? `
                      <button 
                        type="button" 
                        class="btn-delete-workout-session text-[11px] font-bold text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all flex items-center gap-1"
                        data-session-id="${sessionId}"
                        data-routine-name="${log.routineName || 'Sesión'}">
                        🗑️ Eliminar sesión
                      </button>
                    ` : `<span class="text-[10px] text-blue-400 font-semibold">📌 Sesión Base Protegida</span>`}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- MODAL COMPLETO PARA NUEVA MEDICIÓN CORPORAL / INBODY -->
      <div id="modalNewMeasurement" class="hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 max-w-md w-full space-y-4 shadow-xl my-8">
          <div class="flex items-center justify-between pb-2 border-b border-[var(--border)]">
            <div>
              <h3 class="text-base font-bold text-[var(--foreground)]">Nueva Medición Corporal</h3>
              <p class="text-[11px] text-[var(--muted-foreground)]">Registra control InBody Smart Fit o pesaje Eufy en hogar</p>
            </div>
            <button id="btnCloseMeasModal" class="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm font-bold p-1">✕</button>
          </div>

          <div class="space-y-3 text-xs max-h-[65vh] overflow-y-auto pr-1">
            <!-- Fila 1: Fecha y Fuente -->
            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="font-bold text-[var(--foreground)] block mb-1">Fecha</label>
                <input type="date" id="inputMeasDate" value="${new Date().toLocaleDateString('en-CA')}" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
              </div>
              <div>
                <label class="font-bold text-[var(--foreground)] block mb-1">Equipo / Fuente</label>
                <select id="inputMeasSource" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-medium">
                  <option value="Eufy Life (Báscula hogar)">🏠 Eufy Life (Hogar)</option>
                  <option value="Smart Fit (InBody multicanal)">🏥 InBody (Smart Fit)</option>
                  <option value="Manual">📝 Registro Manual</option>
                </select>
              </div>
            </div>

            <!-- Fila 2: Peso y % Grasa -->
            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="font-bold text-[var(--foreground)] block mb-1">Peso Corporal (kg) *</label>
                <input type="number" step="0.1" id="inputMeasWeight" placeholder="Ej: 82.2" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
              </div>
              <div>
                <label class="font-bold text-[var(--foreground)] block mb-1">% Grasa Corporal</label>
                <input type="number" step="0.1" id="inputMeasFatPercent" placeholder="Ej: 23.2" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
              </div>
            </div>

            <!-- Fila 3: Masa Grasa (kg) y Masa Libre de Grasa / Magra (kg) -->
            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="font-bold text-[var(--foreground)] block mb-1">Masa Grasa (kg)</label>
                <input type="number" step="0.1" id="inputMeasFatMass" placeholder="Ej: 19.1" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
              </div>
              <div>
                <label class="font-bold text-[var(--foreground)] block mb-1">Masa Libre Grasa (kg)</label>
                <input type="number" step="0.1" id="inputMeasFatFreeMass" placeholder="Ej: 58.3" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
              </div>
            </div>

            <!-- Fila 4: Músculo Esquelético y Grasa Troncal -->
            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="font-bold text-[var(--foreground)] block mb-1">Músculo Esquelético (kg)</label>
                <input type="number" step="0.1" id="inputMeasMuscleMass" placeholder="Ej: 36.0" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
              </div>
              <div>
                <label class="font-bold text-[var(--foreground)] block mb-1">Grasa en Tronco (kg)</label>
                <input type="number" step="0.01" id="inputMeasTrunkFat" placeholder="Ej: 13.97" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
              </div>
            </div>

            <!-- Fila 5: Grasa Visceral y TMB -->
            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="font-bold text-[var(--foreground)] block mb-1">Grasa Visceral (Nivel)</label>
                <input type="number" id="inputMeasVisceral" placeholder="Ej: 8" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
              </div>
              <div>
                <label class="font-bold text-[var(--foreground)] block mb-1">TMB Basal (kcal)</label>
                <input type="number" id="inputMeasBmr" placeholder="Ej: 1817" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
              </div>
            </div>

            <!-- Fila 6: Cintura y Notas -->
            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="font-bold text-[var(--foreground)] block mb-1">Cintura (cm)</label>
                <input type="number" step="0.5" id="inputMeasWaist" placeholder="Opcional" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono" />
              </div>
              <div>
                <label class="font-bold text-[var(--foreground)] block mb-1">Notas adicionales</label>
                <input type="text" id="inputMeasNotes" placeholder="Ej: En ayunas 07:15" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)]" />
              </div>
            </div>
          </div>

          <div class="flex gap-2 pt-2 border-t border-[var(--border)]">
            <button id="btnSaveMeasurement" class="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all shadow-xs">
              Guardar y Sincronizar
            </button>
            <button id="btnCancelMeasModal" class="px-4 py-2.5 rounded-xl border border-[var(--border)] text-xs text-[var(--muted-foreground)] hover:bg-[var(--accent)]">
              Cancelar
            </button>
          </div>
        </div>
      </div>

    </div>
  `;

  attachAnalyticsEvents(container, measurements, workoutLogs);
  initWeightChart(measurements);
  const initialExId = container.querySelector('#selectExerciseForChart')?.value || 'chest_press';
  initExerciseChart(workoutLogs, initialExId);
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
        alert('Por favor ingresa un peso válido en kg.');
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

      modal.classList.add('hidden');
      renderAnalyticsModule(container);
    });
  }

  if (selectExercise) {
    selectExercise.addEventListener('change', (e) => {
      initExerciseChart(workoutLogs, e.target.value);
    });
  }

  // Acordeón para expandir/colapsar el detalle de cada sesión de entrenamiento
  container.querySelectorAll('.btn-toggle-workout-detail').forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.getAttribute('data-target');
      const detailEl = container.querySelector(`#${targetId}`);
      const arrowEl = container.querySelector(`#arrow-${targetId}`);
      if (detailEl) {
        const isHidden = detailEl.classList.contains('hidden');
        detailEl.classList.toggle('hidden');
        if (arrowEl) arrowEl.textContent = isHidden ? '▲' : '▼';
      }
    });
  });

  // Botón para eliminar una sesión de entrenamiento
  container.querySelectorAll('.btn-delete-workout-session').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sessionId = btn.getAttribute('data-session-id');
      const routineName = btn.getAttribute('data-routine-name');
      if (sessionId && confirm(`¿Eliminar la sesión "${routineName}" del historial?`)) {
        db.deleteWorkoutSession(sessionId);
        renderAnalyticsModule(container);
      }
    });
  });
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
      if (ex && ex.sets && ex.sets.length > 0) {
        const completedSets = ex.sets.filter(s => s.completed);
        const pool = completedSets.length > 0 ? completedSets : ex.sets;
        // Seleccionar el set de mayor carga (o mayores reps a igual carga)
        const bestSet = pool.reduce((best, cur) => {
          const curW = parseFloat(cur.weight) || 0;
          const bestW = parseFloat(best.weight) || 0;
          if (curW > bestW) return cur;
          if (curW === bestW && (parseInt(cur.reps) || 0) > (parseInt(best.reps) || 0)) return cur;
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
      }
    }
  });

  const stats = db.getExerciseEvolutionStats(exerciseId);
  const fallbackWeight = stats?.targetWeight || stats?.baselineWeight || 0;

  if (exerciseChartInstance) {
    exerciseChartInstance.destroy();
  }

  exerciseChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels.length > 0 ? labels : ['Base Configurada'],
      datasets: [
        {
          label: 'Carga (lb / placa)',
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
