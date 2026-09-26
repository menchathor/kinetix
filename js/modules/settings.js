// Módulo de Configuración, Sincronización Convex Cloud y Respaldo de Datos
import { db } from '../services/db.js';
import { INITIAL_DATA } from '../data/initialData.js';
import { convex } from '../services/convex.js';
import { CONFIG } from '../config.js';

export function renderSettingsModule(container) {
  const settings = db.getSettings();
  const profile = INITIAL_DATA.profile;
  const exercisesAnalytics = db.getAllExercisesAnalytics();

  container.innerHTML = `
    <div class="space-y-4 max-w-3xl mx-auto pb-24">
      
      <!-- PERFIL DEL USUARIO -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <h2 class="text-base font-bold text-[var(--foreground)] mb-1">Perfil Clínico & Deportivo</h2>
        <p class="text-xs text-[var(--muted-foreground)] mb-3">Parámetros fisiológicos base para recomposición</p>

        <div class="space-y-2 text-xs">
          <div class="flex justify-between py-1.5 border-b border-[var(--border)]">
            <span class="text-[var(--muted-foreground)]">Nombre:</span>
            <span class="font-bold text-[var(--foreground)]">${profile.name}</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-[var(--border)]">
            <span class="text-[var(--muted-foreground)]">Estatura / Edad:</span>
            <span class="font-bold text-[var(--foreground)]">${profile.height} cm • ${profile.age} años</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-[var(--border)]">
            <span class="text-[var(--muted-foreground)]">Masa Muscular Esquelética:</span>
            <span class="font-bold text-blue-400">${profile.skeletalMuscleMass} kg (Activo metabólico)</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-[var(--border)]">
            <span class="text-[var(--muted-foreground)]">Peso Diana Sostenible:</span>
            <span class="font-bold text-emerald-400">${profile.targetWeightMin} - ${profile.targetWeightMax} kg</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-[var(--border)]">
            <span class="text-[var(--muted-foreground)]">Horario de Gimnasio:</span>
            <span class="font-bold text-amber-500">${profile.gymSchedule} hrs</span>
          </div>
          <div class="flex justify-between py-1.5">
            <span class="text-[var(--muted-foreground)]">Condición Clínica:</span>
            <span class="font-medium text-[var(--foreground)] text-right">${profile.condition}</span>
          </div>
        </div>
      </div>

      <!-- GESTIÓN DE PESOS BASE Y BITÁCORA DE LOGROS -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2">
            <span class="text-base">🏆</span>
            <h3 class="text-sm font-bold text-[var(--foreground)]">Bitácora de Fuerza & Pesos Base</h3>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
            ${exercisesAnalytics.length} Máquinas
          </span>
        </div>
        <p class="text-xs text-[var(--muted-foreground)] mb-3">
          Administra el peso base objetivo para tus próximos entrenamientos y revisa tus logros de sobrecarga progresiva.
        </p>

        <!-- Filtros de Rutina -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-[11px]" id="exerciseFilterTabs">
          <button data-filter="all" class="filter-tab-btn px-2.5 py-1 rounded-lg font-bold bg-amber-500 text-slate-950 transition-all shrink-0">Todos (${exercisesAnalytics.length})</button>
          <button data-filter="torso1" class="filter-tab-btn px-2.5 py-1 rounded-lg font-medium text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-all shrink-0">🏋️ Torso 1</button>
          <button data-filter="pierna1" class="filter-tab-btn px-2.5 py-1 rounded-lg font-medium text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-all shrink-0">🦵 Pierna 1</button>
          <button data-filter="torso2" class="filter-tab-btn px-2.5 py-1 rounded-lg font-medium text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-all shrink-0">💪 Torso 2</button>
          <button data-filter="pierna2" class="filter-tab-btn px-2.5 py-1 rounded-lg font-medium text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-all shrink-0">🔥 Pierna 2</button>
        </div>

        <!-- Buscador de ejercicio -->
        <div class="relative my-2.5">
          <input 
            type="text" 
            id="inputSearchExercise" 
            placeholder="Buscar por ejercicio o músculo..." 
            class="w-full text-xs py-2 pl-8 pr-3 rounded-xl bg-[var(--accent)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none focus:border-amber-500 transition-colors"
          />
          <span class="absolute left-2.5 top-2.5 text-xs text-[var(--muted-foreground)]">🔍</span>
        </div>

        <!-- Lista de Tarjetas de Ejercicios -->
        <div class="space-y-3 mt-3" id="exerciseAnalyticsList">
          ${renderExercisesAnalyticsList(exercisesAnalytics)}
        </div>
        <div id="noExercisesFoundMsg" class="hidden text-center py-6 text-xs text-[var(--muted-foreground)]">
          No se encontraron ejercicios con ese filtro o búsqueda.
        </div>
      </div>

      <!-- APARIENCIA Y TEMA -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-base">🎨</span>
          <h3 class="text-sm font-bold text-[var(--foreground)]">Apariencia y Modo Visual</h3>
        </div>
        <p class="text-xs text-[var(--muted-foreground)] mb-3">
          Alterna entre modo oscuro (ideal para poca luz) y modo claro (máxima legibilidad diurna).
        </p>

        <div class="flex items-center justify-between p-2.5 rounded-xl bg-[var(--accent)] border border-[var(--border)]">
          <span class="text-xs font-semibold text-[var(--foreground)]">Tema de la interfaz:</span>
          <select id="selectThemeSetting" class="text-xs py-1.5 px-3 rounded-lg bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] font-medium outline-none">
            <option value="dark" ${localStorage.getItem('smartfit_theme') !== 'light' ? 'selected' : ''}>🌙 Modo Oscuro (Predeterminado)</option>
            <option value="light" ${localStorage.getItem('smartfit_theme') === 'light' ? 'selected' : ''}>☀️ Modo Claro</option>
          </select>
        </div>
      </div>

      <!-- BASE DE DATOS Y SINCRONIZACIÓN CLOUD CONVEX -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2">
            <span class="text-base">☁️</span>
            <h3 class="text-sm font-bold text-[var(--foreground)]">Nube Kinetix (Convex)</h3>
          </div>
          <span id="cloudStatusBadge" class="text-[10px] font-bold px-2 py-0.5 rounded-full ${convex.isOnline ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}">
            ${convex.isOnline ? '🟢 En Línea' : '🟡 Modo Offline'}
          </span>
        </div>
        <p class="text-xs text-[var(--muted-foreground)] mb-3">
          Sincronización automática de alta velocidad. Tus registros se guardan primero en tu teléfono (Local-First) y se respaldan en Convex Cloud de forma transparente.
        </p>

        <div class="p-3 rounded-xl bg-[var(--accent)]/40 border border-[var(--border)] space-y-2.5 text-xs">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-[var(--muted-foreground)]">Estado de Red:</span>
            <span class="font-semibold ${convex.isOnline ? 'text-emerald-400' : 'text-amber-400'}">${convex.isOnline ? 'Conectado a Internet' : 'Sin conexión (Guardando local)'}</span>
          </div>
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-[var(--muted-foreground)]">Última Sincronización:</span>
            <span id="textLastSync" class="font-mono text-[var(--foreground)]">${convex.lastSyncTime ? new Date(convex.lastSyncTime).toLocaleTimeString() : 'Automática'}</span>
          </div>
          
          <div class="pt-1 flex flex-col sm:flex-row gap-2">
            <button id="btnSyncNow" class="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs">
              <span id="iconSync">☁️</span> <span id="textSyncBtn">Sincronizar Historial Ahora</span>
            </button>
            <button id="btnPullFromCloud" class="flex-1 bg-[var(--accent)] hover:bg-[var(--border)] text-[var(--foreground)] font-semibold py-2.5 px-3 rounded-xl text-xs transition-all border border-[var(--border)] flex items-center justify-center gap-1.5">
              <span>📥 Restaurar desde la Nube</span>
            </button>
          </div>
        </div>
      </div>

      <!-- RESPALDO Y RESTAURACIÓN DE DATOS (JSON) -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-base">💾</span>
          <h3 class="text-sm font-bold text-[var(--foreground)]">Copia de Seguridad & Portabilidad</h3>
        </div>
        <p class="text-xs text-[var(--muted-foreground)] mb-3">
          Descarga un archivo con todo tu historial de entrenamientos y mediciones para guardarlo en tu Google Drive o migrarlo.
        </p>

        <div class="flex flex-col sm:flex-row gap-2">
          <button id="btnExportJSON" class="flex-1 bg-[var(--accent)] hover:bg-[var(--border)] text-[var(--foreground)] font-bold py-2.5 px-3 rounded-xl text-xs transition-all border border-[var(--border)] flex items-center justify-center gap-1.5">
            <span>📥 Descargar Copia de Seguridad (.json)</span>
          </button>
          
          <label class="flex-1 bg-[var(--accent)] hover:bg-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] font-semibold py-2.5 px-3 rounded-xl text-xs transition-all border border-[var(--border)] flex items-center justify-center gap-1.5 cursor-pointer text-center">
            <span>📤 Restaurar desde .json</span>
            <input type="file" id="fileImportJSON" accept=".json" class="hidden" />
          </label>
        </div>
      </div>

      <!-- INFO DE LA APLICACIÓN Y ACTUALIZACIONES -->
      <div class="p-4 rounded-2xl bg-[var(--accent)]/30 border border-[var(--border)] text-xs text-[var(--muted-foreground)] space-y-2">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-bold text-[var(--foreground)]">Kinetix v${CONFIG.APP_VERSION || '1.5'} (PWA)</p>
            <p class="text-[11px]">Backend Convex Cloud • Michael Meneses • 18:00 hrs</p>
          </div>
          <button id="btnClearCacheReload" class="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 font-bold border border-amber-500/30 text-[11px] flex items-center gap-1 transition-colors">
            <span>🔄 Forzar Actualización</span>
          </button>
        </div>
        <p class="text-[11px] opacity-75">Toca "Forzar Actualización" si hiciste cambios recientes y tu celular sigue mostrando la versión en caché.</p>
      </div>

    </div>
  `;


  attachSettingsEvents(container, settings);
}

// Renderiza cada tarjeta de ejercicio con su selector de peso y bitácora
function renderExercisesAnalyticsList(exercises) {
  if (!exercises || exercises.length === 0) {
    return `<div class="p-4 text-center text-xs text-[var(--muted-foreground)]">No hay ejercicios registrados.</div>`;
  }

  return exercises.map(ex => {
    const stats = ex.stats;
    const progressBadge = stats.progressKg > 0
      ? `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">🚀 +${stats.progressKg} kg (+${stats.progressPercent}%)</span>`
      : stats.totalSessions > 0
        ? `<span class="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">⚖️ En ritmo</span>`
        : `<span class="inline-flex items-center gap-1 text-[10px] text-[var(--muted-foreground)] bg-[var(--accent)] px-2 py-0.5 rounded-full">Base inicial</span>`;

    const keywords = `${ex.name} ${ex.targetMuscles || ''} ${ex.machineName || ''} ${ex.routineName || ''}`.toLowerCase();

    return `
      <div class="exercise-card-item bg-[var(--accent)]/30 hover:bg-[var(--accent)]/50 rounded-2xl p-3.5 border border-[var(--border)] transition-all" data-routine="${ex.routineId}" data-keywords="${keywords}">
        <div class="flex items-start gap-3">
          <!-- Miniatura precisa de la máquina -->
          <div class="relative shrink-0">
            <img 
              src="${ex.image || './assets/images/smartfit_chest_press_1789138165787.jpg'}" 
              alt="${ex.name}" 
              class="w-16 h-16 rounded-xl object-cover border border-[var(--border)] bg-[var(--card)]"
              onerror="this.src='./assets/images/smartfit_chest_press_1789138165787.jpg'"
            />
            <span class="absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]">
              ${ex.dayName ? ex.dayName.substring(0, 3) : 'Día'}
            </span>
          </div>

          <!-- Información del Ejercicio -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-1">
              <div>
                <h4 class="text-xs font-bold text-[var(--foreground)] truncate">${ex.name}</h4>
                <p class="text-[11px] text-[var(--muted-foreground)] truncate">${ex.targetMuscles || ex.machineName}</p>
              </div>
              <div>${progressBadge}</div>
            </div>

            <!-- Métricas rápidas: Base vs PR -->
            <div class="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--muted-foreground)]">
              <span>Base: <strong class="text-[var(--foreground)]">${stats.baselineWeight > 0 ? stats.baselineWeight + ' kg' : 'Auto'}</strong></span>
              <span>•</span>
              <span>Récord PR: <strong class="text-amber-500">${stats.prWeight > 0 ? stats.prWeight + ' kg' : 'Por marcar'}</strong></span>
              <span>•</span>
              <span>Sesiones: <strong class="text-[var(--foreground)]">${stats.totalSessions}</strong></span>
            </div>
          </div>
        </div>

        <!-- Ajuste Interactivo de Peso Objetivo -->
        <div class="mt-3 pt-2.5 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-1.5">
            <span class="text-[11px] font-medium text-[var(--foreground)]">Peso Siguiente Sesión:</span>
            <div class="flex items-center gap-1">
              <button 
                type="button" 
                data-id="${ex.id}" 
                data-delta="-2.5" 
                class="btn-adjust-custom-weight w-7 h-7 rounded-lg bg-[var(--card)] hover:bg-[var(--accent)] border border-[var(--border)] font-bold text-sm text-[var(--foreground)] flex items-center justify-center transition-colors active:scale-95"
                title="Bajar 2.5 kg"
              >−</button>
              
              <div class="relative flex items-center">
                <input 
                  type="number" 
                  step="2.5" 
                  min="0" 
                  data-id="${ex.id}" 
                  value="${stats.targetWeight}" 
                  class="input-custom-weight w-16 text-center font-bold text-amber-500 bg-[var(--card)] border border-[var(--border)] rounded-lg py-1 text-xs outline-none focus:border-amber-500 transition-colors"
                />
                <span class="absolute right-1 text-[10px] text-[var(--muted-foreground)] pointer-events-none">kg</span>
              </div>

              <button 
                type="button" 
                data-id="${ex.id}" 
                data-delta="2.5" 
                class="btn-adjust-custom-weight w-7 h-7 rounded-lg bg-[var(--card)] hover:bg-[var(--accent)] border border-[var(--border)] font-bold text-sm text-[var(--foreground)] flex items-center justify-center transition-colors active:scale-95"
                title="Subir 2.5 kg"
              >+</button>
            </div>
            <span id="savedIndicator_${ex.id}" class="text-[10px] font-bold text-emerald-400 opacity-0 transition-opacity">✓ Guardado</span>
          </div>

          <!-- Botón Bitácora Desplegable -->
          <button 
            type="button" 
            data-target="history_${ex.id}" 
            class="btn-toggle-history text-[11px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-amber-500/10"
          >
            <span>📜 Bitácora (${stats.history.length})</span>
            <span id="chevron_${ex.id}" class="text-[9px] transition-transform duration-200">▼</span>
          </button>
        </div>

        <!-- Acordeón de Bitácora Histórica -->
        <div id="history_${ex.id}" class="hidden mt-3 pt-3 border-t border-[var(--border)] space-y-2">
          ${renderExerciseHistoryAccordion(stats)}
        </div>
      </div>
    `;
  }).join('');
}

// Renderiza la tabla/lista de sesiones históricas para un ejercicio
function renderExerciseHistoryAccordion(stats) {
  if (!stats.history || stats.history.length === 0) {
    return `
      <div class="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-center text-[11px] text-[var(--muted-foreground)]">
        No hay registros aún de este ejercicio. Completa series en tu rutina para ver la evolución y RPE aquí.
      </div>
    `;
  }

  return `
    <div class="space-y-1.5">
      <div class="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider px-1">
        Historial de Sobrecarga Progresiva (Últimas sesiones)
      </div>
      ${stats.history.map(item => {
        const dateFormatted = item.date ? new Date(item.date).toLocaleDateString('es-CL', {
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        }) : 'Sesión';

        const setsSummary = (item.sets || []).map(s => `${s.weight}kg × ${s.reps}`).join(' • ');

        return `
          <div class="p-2 rounded-xl bg-[var(--card)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px]">
            <div class="flex items-center gap-2">
              <span class="font-bold text-[var(--foreground)] capitalize">${dateFormatted}</span>
              <span class="text-[var(--muted-foreground)]">• ${item.routineName}</span>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-amber-500 font-mono font-medium">${setsSummary}</span>
              <span class="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 font-bold text-[10px] border border-amber-500/20">
                Máx: ${item.bestWeight} kg
              </span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function attachSettingsEvents(container, settings) {
  const selectTheme = container.querySelector('#selectThemeSetting');
  const btnSyncNow = container.querySelector('#btnSyncNow');
  const btnPullFromCloud = container.querySelector('#btnPullFromCloud');
  const btnExport = container.querySelector('#btnExportJSON');
  const fileImport = container.querySelector('#fileImportJSON');
  const cloudStatusBadge = container.querySelector('#cloudStatusBadge');
  const textLastSync = container.querySelector('#textLastSync');

  // --- FILTROS Y BÚSQUEDA DE EJERCICIOS ---
  const filterTabs = container.querySelectorAll('.filter-tab-btn');
  const searchInput = container.querySelector('#inputSearchExercise');
  let currentFilter = 'all';
  let currentSearch = '';

  const filterCards = () => {
    const cards = container.querySelectorAll('.exercise-card-item');
    let visibleCount = 0;
    cards.forEach(card => {
      const routine = card.dataset.routine;
      const keywords = card.dataset.keywords || '';
      const matchFilter = currentFilter === 'all' || routine === currentFilter;
      const matchSearch = !currentSearch || keywords.includes(currentSearch);
      if (matchFilter && matchSearch) {
        card.classList.remove('hidden');
        visibleCount++;
      } else {
        card.classList.add('hidden');
      }
    });

    const noResults = container.querySelector('#noExercisesFoundMsg');
    if (noResults) {
      noResults.classList.toggle('hidden', visibleCount > 0);
    }
  };

  filterTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      filterTabs.forEach(b => {
        b.className = 'filter-tab-btn px-2.5 py-1 rounded-lg font-medium text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-all shrink-0';
      });
      btn.className = 'filter-tab-btn px-2.5 py-1 rounded-lg font-bold bg-amber-500 text-slate-950 transition-all shrink-0';
      currentFilter = btn.dataset.filter || 'all';
      filterCards();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.toLowerCase().trim();
      filterCards();
    });
  }

  // --- CONTROLES DE PESO OBJETIVO (+ / - / Input) ---
  const adjustButtons = container.querySelectorAll('.btn-adjust-custom-weight');
  adjustButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const delta = parseFloat(btn.dataset.delta) || 0;
      const input = container.querySelector(`.input-custom-weight[data-id="${id}"]`);
      if (input) {
        const currentVal = parseFloat(input.value) || 0;
        const newVal = Math.max(0, Math.round((currentVal + delta) * 10) / 10);
        input.value = newVal;
        db.setCustomWeight(id, newVal);

        // Feedback visual
        const ind = container.querySelector(`#savedIndicator_${id}`);
        if (ind) {
          ind.classList.remove('opacity-0');
          setTimeout(() => ind.classList.add('opacity-0'), 1500);
        }
      }
    });
  });

  const weightInputs = container.querySelectorAll('.input-custom-weight');
  weightInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      const newVal = Math.max(0, parseFloat(e.target.value) || 0);
      e.target.value = newVal;
      db.setCustomWeight(id, newVal);

      const ind = container.querySelector(`#savedIndicator_${id}`);
      if (ind) {
        ind.classList.remove('opacity-0');
        setTimeout(() => ind.classList.add('opacity-0'), 1500);
      }
    });
  });

  // --- BITÁCORA DESPLEGABLE (ACORDEÓN) ---
  const historyButtons = container.querySelectorAll('.btn-toggle-history');
  historyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const targetEl = container.querySelector(`#${targetId}`);
      const chevron = btn.querySelector('span:last-child');
      if (targetEl) {
        const isHidden = targetEl.classList.contains('hidden');
        targetEl.classList.toggle('hidden', !isHidden);
        if (chevron) {
          chevron.style.transform = isHidden ? 'rotate(180deg)' : '';
        }
      }
    });
  });

  // Escuchar estado en vivo de Convex
  convex.onSyncStatus(({ status, isOnline, lastSync }) => {
    if (cloudStatusBadge) {
      cloudStatusBadge.className = `text-[10px] font-bold px-2 py-0.5 rounded-full ${
        isOnline ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
      }`;
      cloudStatusBadge.textContent = isOnline ? '🟢 En Línea' : '🟡 Modo Offline';
    }
    if (textLastSync && lastSync) {
      textLastSync.textContent = new Date(lastSync).toLocaleTimeString();
    }
  });

  if (selectTheme) {
    selectTheme.addEventListener('change', (e) => {
      const isDark = e.target.value === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
      localStorage.setItem('smartfit_theme', e.target.value);
      const iconEl = document.getElementById('themeIcon');
      if (iconEl) iconEl.textContent = isDark ? '☀️' : '🌙';
    });
  }

  // Sincronización Manual Inmediata a Convex
  if (btnSyncNow) {
    btnSyncNow.addEventListener('click', async () => {
      const iconSync = container.querySelector('#iconSync');
      const textSync = container.querySelector('#textSyncBtn');
      
      if (!navigator.onLine) {
        alert('Actualmente no tienes conexión a internet. Los datos están seguros en tu teléfono y se sincronizarán al reconectar.');
        return;
      }

      btnSyncNow.disabled = true;
      if (iconSync) iconSync.textContent = '⏳';
      if (textSync) textSync.textContent = 'Sincronizando...';

      try {
        const res = await db.syncAllToConvex();
        if (res && res.success) {
          if (iconSync) iconSync.textContent = '✅';
          if (textSync) textSync.textContent = '¡Sincronizado!';
          if (textLastSync) textLastSync.textContent = new Date().toLocaleTimeString();
          alert(`¡Sincronización con Convex exitosa!\n• Entrenamientos: ${res.data?.workoutsSynced ?? 0}\n• Mediciones: ${res.data?.measurementsSynced ?? 0}`);
        } else {
          alert('No se pudo completar la sincronización con Convex: ' + (res?.error || 'Revisa tu conexión'));
        }
      } catch (err) {
        alert('Error durante la sincronización: ' + err.message);
      } finally {
        btnSyncNow.disabled = false;
        setTimeout(() => {
          if (iconSync) iconSync.textContent = '☁️';
          if (textSync) textSync.textContent = 'Sincronizar Historial Ahora';
        }, 3000);
      }
    });
  }

  // Restaurar / Pull desde Convex
  if (btnPullFromCloud) {
    btnPullFromCloud.addEventListener('click', async () => {
      if (!navigator.onLine) {
        alert('Necesitas conexión a internet para descargar datos desde Convex.');
        return;
      }

      const confirmRestore = confirm('¿Deseas descargar y fusionar tu historial guardado en Convex Cloud con los datos de este dispositivo?');
      if (!confirmRestore) return;

      btnPullFromCloud.disabled = true;
      btnPullFromCloud.textContent = '⏳ Descargando...';

      try {
        const res = await db.pullFromConvex();
        if (res.success) {
          alert(`¡Descarga completada!\n• Nuevos entrenamientos: ${res.importedWorkouts}\n• Nuevas mediciones: ${res.importedMeas}`);
          location.reload();
        } else {
          alert('Error al descargar datos de la nube: ' + (res.error || 'Desconocido'));
        }
      } catch (err) {
        alert('Excepción al descargar datos: ' + err.message);
      } finally {
        btnPullFromCloud.disabled = false;
        btnPullFromCloud.textContent = '📥 Restaurar desde la Nube';
      }
    });
  }

  if (btnExport) {
    btnExport.addEventListener('click', () => {
      db.exportAllData();
    });
  }

  if (fileImport) {
    fileImport.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const res = db.importData(event.target.result);
        if (res.success) {
          alert(`¡Datos restaurados con éxito! (${res.count} entrenamientos importados).`);
          location.reload();
        } else {
          alert('Error al importar archivo: ' + res.error);
        }
      };
      reader.readAsText(file);
    });
  }

  const btnClearCache = container.querySelector('#btnClearCacheReload');
  if (btnClearCache) {
    btnClearCache.addEventListener('click', async () => {
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister()));
        }
        alert('¡Caché limpiada con éxito! La aplicación se recargará con los archivos más recientes.');
        window.location.reload(true);
      } catch (err) {
        console.error('Error limpiando caché:', err);
        window.location.reload(true);
      }
    });
  }
}
