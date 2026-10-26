// Módulo de Configuración, Perfil, Sincronización Convex y Respaldo de Datos
import { db, formatDisplayDate } from '../services/db.js';
import { convex } from '../services/convex.js';
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { escapeHtml, escapeAttr, safeUrl, toNumber } from '../utils/escape.js';
import { showToast, confirmAction, showError } from '../ui/toast.js';

let settingsCleanup = null;

export function renderSettingsModule(container) {
  if (settingsCleanup) {
    settingsCleanup();
    settingsCleanup = null;
  }

  const profile = db.getProfile();
  const measurements = db.getMeasurements();
  const stats = computeProfileStats(profile, measurements);
  const exercisesAnalytics = db.getAllExercisesAnalytics();

  container.innerHTML = `
    <div class="space-y-4 max-w-3xl mx-auto pb-24">

      <!-- PERFIL DEL USUARIO -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex items-center justify-between mb-1">
          <h2 class="text-base font-bold text-[var(--foreground)]">Perfil Clínico & Deportivo</h2>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
            Perfil editable
          </span>
        </div>
        <p class="text-xs text-[var(--muted-foreground)] mb-3">Parámetros fisiológicos activos para recomposición corporal</p>

        <div class="space-y-2 text-xs">
          <div class="flex justify-between py-1.5 border-b border-[var(--border)]">
            <span class="text-[var(--muted-foreground)]">Nombre:</span>
            <span class="font-bold text-[var(--foreground)]">${escapeHtml(profile.name)}</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-[var(--border)]">
            <span class="text-[var(--muted-foreground)]">Estatura / Edad:</span>
            <span class="font-bold text-[var(--foreground)]">${escapeHtml(profile.height)} cm • ${escapeHtml(profile.age)} años</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-[var(--border)]">
            <span class="text-[var(--muted-foreground)]">Peso actual (última medición):</span>
            <span class="font-bold text-[var(--foreground)]">
              ${stats.currentWeight > 0 ? `${stats.currentWeight} kg` : 'Sin registro'}
              ${stats.weightDiff !== null ? `<span class="${stats.weightDiff <= 0 ? 'text-emerald-400' : 'text-amber-400'} font-extrabold text-[11px]">(${stats.weightDiff > 0 ? '+' : ''}${stats.weightDiff} kg)</span>` : ''}
            </span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-[var(--border)]">
            <span class="text-[var(--muted-foreground)]">Masa libre de grasa (magra):</span>
            <span class="font-bold text-blue-400">${stats.fatFreeMass > 0 ? `${stats.fatFreeMass} kg` : 'Sin registro'}</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-[var(--border)]">
            <span class="text-[var(--muted-foreground)]">Masa muscular esquelética:</span>
            <span class="font-bold text-blue-400">${stats.skeletalMuscleMass > 0 ? `${stats.skeletalMuscleMass} kg` : 'Sin registro'}</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-[var(--border)]">
            <span class="text-[var(--muted-foreground)]">Grasa corporal / troncal:</span>
            <span class="font-bold text-emerald-400">
              ${stats.bodyFatPercent > 0 ? `${stats.bodyFatPercent}%` : 'Sin registro'}
              ${stats.fatMassKg > 0 ? `(${stats.fatMassKg} kg)` : ''}
              ${stats.trunkFat > 0 ? `• Tronco: ${stats.trunkFat} kg` : ''}
            </span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-[var(--border)]">
            <span class="text-[var(--muted-foreground)]">Grasa visceral:</span>
            <span class="font-bold ${stats.visceralFat > 10 ? 'text-amber-400' : 'text-emerald-400'}">${stats.visceralFat > 0 ? `Nivel ${stats.visceralFat}` : 'Sin registro'} (saludable 0-10)</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-[var(--border)]">
            <span class="text-[var(--muted-foreground)]">Tasa metabólica basal (TMB):</span>
            <span class="font-mono font-bold text-[var(--foreground)]">${stats.bmr > 0 ? `${stats.bmr} kcal / día` : 'Sin registro'}</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-[var(--border)]">
            <span class="text-[var(--muted-foreground)]">Peso diana sostenible:</span>
            <span class="font-bold text-emerald-400">${escapeHtml(profile.targetWeightMin)} - ${escapeHtml(profile.targetWeightMax)} kg</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-[var(--border)]">
            <span class="text-[var(--muted-foreground)]">Horario de gimnasio:</span>
            <span class="font-bold text-amber-500">${escapeHtml(profile.gymSchedule)} hrs</span>
          </div>
          <div class="flex justify-between py-1.5">
            <span class="text-[var(--muted-foreground)]">Condición clínica:</span>
            <span class="font-medium text-[var(--foreground)] text-right min-w-0 max-w-[70%] break-words">${escapeHtml(profile.condition)}</span>
          </div>
        </div>

        <!-- Editor de perfil -->
        <details class="mt-4 pt-3 border-t border-[var(--border)] group">
          <summary class="cursor-pointer text-xs font-bold text-amber-500 hover:text-amber-400 select-none">
            ✏️ Editar datos del perfil
          </summary>
          <div class="grid grid-cols-2 gap-2.5 mt-3 text-xs">
            ${profileField('profileName', 'Nombre', profile.name, 'text')}
            ${profileField('profileAge', 'Edad', profile.age, 'number', '1')}
            ${profileField('profileHeight', 'Estatura (cm)', profile.height, 'number', '0.5')}
            ${profileField('profileStartWeight', 'Peso inicial (kg)', profile.startWeight, 'number', '0.1')}
            ${profileField('profileCurrentWeight', 'Peso actual (kg)', profile.currentWeight, 'number', '0.1')}
            ${profileField('profileTargetMin', 'Meta mínima (kg)', profile.targetWeightMin, 'number', '0.1')}
            ${profileField('profileTargetMax', 'Meta máxima (kg)', profile.targetWeightMax, 'number', '0.1')}
            ${profileField('profileFatFreeMass', 'Masa magra (kg)', profile.fatFreeMass, 'number', '0.1')}
            ${profileField('profileBodyFat', '% grasa corporal', profile.bodyFatPercent, 'number', '0.1')}
            ${profileField('profileFatMass', 'Masa grasa (kg)', profile.fatMassKg, 'number', '0.1')}
            ${profileField('profileTrunkFat', 'Grasa troncal (kg)', profile.trunkFat, 'number', '0.01')}
            ${profileField('profileVisceral', 'Grasa visceral (nivel)', profile.visceralFat, 'number', '1')}
            ${profileField('profileBmr', 'TMB (kcal/día)', profile.basalMetabolicRate, 'number', '1')}
            ${profileField('profileWater', 'Meta agua (L)', profile.waterTargetLitres, 'number', '0.1')}
            ${profileField('profileGym', 'Horario gimnasio', profile.gymSchedule, 'text')}
            <div class="col-span-2">
              <label class="font-bold text-[var(--foreground)] block mb-1" for="profileCondition">Condición clínica</label>
              <input id="profileCondition" type="text" value="${escapeAttr(profile.condition)}" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)]" />
            </div>
          </div>
          <div class="mt-3 flex gap-2">
            <button id="btnSaveProfile" class="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all shadow-xs">
              Guardar perfil
            </button>
            <button id="btnSaveProfileCloud" class="px-3 py-2.5 rounded-xl border border-[var(--border)] text-xs text-[var(--muted-foreground)] hover:bg-[var(--accent)]">
              Guardar y sincronizar
            </button>
          </div>
        </details>
      </div>

      <!-- CLAVE DE SINCRONIZACIÓN -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border ${convex.hasSyncKey() ? 'border-emerald-500/30' : 'border-amber-500/40'} shadow-xs">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2">
            <span class="text-base">🔐</span>
            <h3 class="text-sm font-bold text-[var(--foreground)]">Clave de Sincronización</h3>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${convex.hasSyncKey() ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}">
            ${convex.hasSyncKey() ? '🟢 Configurada' : '🟡 Sin configurar'}
          </span>
        </div>
        <p class="text-xs text-[var(--muted-foreground)] mb-3">
          La nube contiene datos de salud, por lo que todas las operaciones exigen esta clave.
          Se guarda sólo en este dispositivo y nunca en el código público.
        </p>
        <div class="flex flex-col sm:flex-row gap-2">
          <input id="inputSyncKey" type="password" autocomplete="current-password" placeholder="Pega aquí tu clave de sincronización" class="flex-1 text-xs py-2 px-3 rounded-xl bg-[var(--accent)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none focus:border-amber-500" />
          <button id="btnSaveSyncKey" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-3 rounded-xl text-xs transition-all">Guardar clave</button>
        </div>
        <div class="flex flex-wrap gap-2 mt-2">
          <button id="btnTestSyncKey" class="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[var(--accent)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--border)]">Probar conexión</button>
          <button id="btnClearSyncKey" class="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[var(--accent)] border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--border)]">Olvidar clave</button>
        </div>
        <p class="text-[10px] text-[var(--muted-foreground)] mt-2">
          Configúrala en el servidor con <code class="font-mono">npx convex env set KINETIX_SYNC_KEY &lt;clave&gt;</code>.
        </p>
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

        <div class="relative">
          <div class="flex items-center gap-1.5 overflow-x-auto pb-2 pr-6 scrollbar-none text-[11px]" id="exerciseFilterTabs">
            <button data-filter="all" class="filter-tab-btn px-2.5 py-1 rounded-lg font-bold bg-amber-500 text-slate-950 transition-all shrink-0">Todos (${exercisesAnalytics.length})</button>
            <button data-filter="torso1" class="filter-tab-btn px-2.5 py-1 rounded-lg font-medium text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-all shrink-0">🏋️ Torso 1</button>
            <button data-filter="pierna1" class="filter-tab-btn px-2.5 py-1 rounded-lg font-medium text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-all shrink-0">🦵 Pierna 1</button>
            <button data-filter="torso2" class="filter-tab-btn px-2.5 py-1 rounded-lg font-medium text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-all shrink-0">💪 Torso 2</button>
            <button data-filter="pierna2" class="filter-tab-btn px-2.5 py-1 rounded-lg font-medium text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-all shrink-0">🔥 Pierna 2</button>
          </div>
          <div class="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--card)] to-transparent sm:hidden" aria-hidden="true"></div>
        </div>

        <div class="relative my-2.5">
          <input type="text" id="inputSearchExercise" placeholder="Buscar por ejercicio o músculo..." class="w-full text-xs py-2 pl-8 pr-3 rounded-xl bg-[var(--accent)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none focus:border-amber-500 transition-colors" />
          <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)]" aria-hidden="true">🔍</span>
        </div>

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
          <label for="selectThemeSetting" class="text-xs font-semibold text-[var(--foreground)]">Tema de la interfaz:</label>
          <select id="selectThemeSetting" class="text-xs py-1.5 px-3 rounded-lg bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] font-medium outline-none">
            <option value="dark" ${db.getTheme() !== 'light' ? 'selected' : ''}>🌙 Modo Oscuro</option>
            <option value="light" ${db.getTheme() === 'light' ? 'selected' : ''}>☀️ Modo Claro</option>
          </select>
        </div>
        <div class="flex items-center justify-between p-2.5 rounded-xl bg-[var(--accent)] border border-[var(--border)] mt-2">
          <span class="text-xs font-semibold text-[var(--foreground)]">Unidad de carga:</span>
          <span class="text-xs font-mono font-bold text-amber-500">${escapeHtml(CONFIG.WEIGHT_UNIT)} (placa de máquina)</span>
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
          Tus registros se guardan primero en este dispositivo y se respaldan en Convex. El merge usa <code class="font-mono">updatedAt</code> y respeta las eliminaciones hechas offline.
        </p>

        <div class="p-3 rounded-xl bg-[var(--accent)]/40 border border-[var(--border)] space-y-2.5 text-xs">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-[var(--muted-foreground)]">Estado de red:</span>
            <span class="font-semibold ${convex.isOnline ? 'text-emerald-400' : 'text-amber-400'}">${convex.isOnline ? 'Conectado a Internet' : 'Sin conexión (guardando local)'}</span>
          </div>
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-[var(--muted-foreground)]">Última sincronización:</span>
            <span id="textLastSync" class="font-mono text-[var(--foreground)]">${convex.lastSyncTime ? new Date(convex.lastSyncTime).toLocaleTimeString() : 'Automática'}</span>
          </div>

          <div class="pt-1 flex flex-col sm:flex-row gap-2">
            <button id="btnSyncNow" class="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs">
              <span id="iconSync" aria-hidden="true">☁️</span> <span id="textSyncBtn">Sincronizar ahora</span>
            </button>
            <button id="btnPullFromCloud" class="flex-1 bg-[var(--accent)] hover:bg-[var(--border)] text-[var(--foreground)] font-semibold py-2.5 px-3 rounded-xl text-xs transition-all border border-[var(--border)] flex items-center justify-center gap-1.5">
              <span aria-hidden="true">📥</span> Restaurar desde la nube
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
          Incluye entrenamientos, mediciones, nutrición, perfil y pesos personalizados. Guárdalo en Drive o úsalo para migrar.
        </p>

        <div class="flex flex-col sm:flex-row gap-2">
          <button id="btnExportJSON" class="flex-1 bg-[var(--accent)] hover:bg-[var(--border)] text-[var(--foreground)] font-bold py-2.5 px-3 rounded-xl text-xs transition-all border border-[var(--border)] flex items-center justify-center gap-1.5">
            <span aria-hidden="true">📥</span> Descargar copia (.json)
          </button>

          <label class="flex-1 bg-[var(--accent)] hover:bg-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] font-semibold py-2.5 px-3 rounded-xl text-xs transition-all border border-[var(--border)] flex items-center justify-center gap-1.5 cursor-pointer text-center">
            <span aria-hidden="true">📤</span> Restaurar desde .json
            <input type="file" id="fileImportJSON" accept=".json,application/json" class="hidden" />
          </label>
        </div>
      </div>

      <!-- INFO DE LA APLICACIÓN Y ACTUALIZACIONES -->
      <div class="p-4 rounded-2xl bg-[var(--accent)]/30 border border-[var(--border)] text-xs text-[var(--muted-foreground)] space-y-2">
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="font-bold text-[var(--foreground)]">Kinetix v${escapeHtml(CONFIG.APP_VERSION)} (PWA)</p>
            <p class="text-[11px]">Local-First + Convex Cloud · Perfil editable · Offline</p>
          </div>
          <button id="btnClearCacheReload" class="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 font-bold border border-amber-500/30 text-[11px] flex items-center gap-1 transition-colors">
            <span aria-hidden="true">🔄</span> Forzar actualización
          </button>
        </div>
        <p class="text-[11px] opacity-75">Úsalo si cambiaste de versión y el móvil sigue mostrando código viejo en caché.</p>
      </div>

    </div>
  `;

  settingsCleanup = attachSettingsEvents(container);
}

function profileField(id, label, value, type = 'text', step = null) {
  const safeValue = value === undefined || value === null ? '' : value;
  const stepAttr = step ? ` step="${escapeAttr(step)}"` : '';
  return `
    <div>
      <label class="font-bold text-[var(--foreground)] block mb-1" for="${escapeAttr(id)}">${escapeHtml(label)}</label>
      <input id="${escapeAttr(id)}" type="${escapeAttr(type)}"${stepAttr} value="${escapeAttr(safeValue)}" class="w-full p-2 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)]" />
    </div>
  `;
}

function computeProfileStats(profile, measurements) {
  const sorted = [...measurements].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const latestInBody = sorted.find(m => String(m.source || '').toLowerCase().includes('inbody'));
  const latest = latestInBody || sorted[0] || {};

  const currentWeight = toNumber(latest.weight ?? latest.weightKg ?? profile.currentWeight);
  const startWeight = toNumber(profile.startWeight) || currentWeight;
  const weightDiff = startWeight > 0 && currentWeight > 0
    ? Math.round((currentWeight - startWeight) * 10) / 10
    : null;

  return {
    currentWeight,
    weightDiff,
    fatFreeMass: toNumber(latest.fatFreeMass ?? profile.fatFreeMass),
    skeletalMuscleMass: toNumber(latest.muscleMassKg ?? latest.muscleMass ?? profile.skeletalMuscleMass),
    bodyFatPercent: toNumber(latest.bodyFatPercent ?? latest.fatPercent ?? profile.bodyFatPercent),
    fatMassKg: toNumber(latest.fatMassKg ?? latest.fatMass ?? profile.fatMassKg),
    trunkFat: toNumber(latest.trunkFat ?? profile.trunkFat),
    visceralFat: toNumber(latest.visceralFat ?? profile.visceralFat),
    bmr: Math.round(toNumber(latest.bmr ?? profile.basalMetabolicRate))
  };
}

// Renderiza cada tarjeta de ejercicio con su selector de peso y bitácora
function renderExercisesAnalyticsList(exercises) {
  if (!exercises || exercises.length === 0) {
    return `<div class="p-4 text-center text-xs text-[var(--muted-foreground)]">No hay ejercicios registrados.</div>`;
  }

  const fallbackImage = './assets/images/smartfit_ill_chest_press.webp';

  return exercises.map(ex => {
    const stats = ex.stats;
    const progressBadge = stats.progressKg > 0
      ? `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">🚀 +${stats.progressKg} kg (+${stats.progressPercent}%)</span>`
      : stats.totalSessions > 0
        ? `<span class="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">⚖️ En ritmo</span>`
        : `<span class="inline-flex items-center gap-1 text-[10px] text-[var(--muted-foreground)] bg-[var(--accent)] px-2 py-0.5 rounded-full">Base inicial</span>`;

    const keywords = `${ex.name} ${ex.targetMuscles || ''} ${ex.machineName || ''} ${ex.routineName || ''}`.toLowerCase();
    const image = safeUrl(ex.image, fallbackImage);
    const safeId = escapeAttr(ex.id);

    return `
      <div class="exercise-card-item bg-[var(--accent)]/30 hover:bg-[var(--accent)]/50 rounded-2xl p-3.5 border border-[var(--border)] transition-all overflow-hidden" data-routine="${escapeAttr(ex.routineId)}" data-keywords="${escapeAttr(keywords)}">
        <div class="flex items-start gap-3">
          <div class="relative shrink-0">
            <img
              src="${image}"
              alt="${escapeAttr(ex.name)}"
              class="w-16 h-16 rounded-xl object-cover border border-[var(--border)] bg-[var(--card)]"
              loading="lazy"
              onerror="this.onerror=null;this.src='${fallbackImage}'"
            />
            <span class="absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]">
              ${escapeHtml(ex.dayName ? ex.dayName.substring(0, 3) : 'Día')}
            </span>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-1 min-w-0">
              <div class="min-w-0 flex-1">
                <h4 class="text-xs font-bold text-[var(--foreground)] truncate">${escapeHtml(ex.name)}</h4>
                <p class="text-[11px] text-[var(--muted-foreground)] truncate">${escapeHtml(ex.targetMuscles || ex.machineName)}</p>
              </div>
              <div class="shrink-0">${progressBadge}</div>
            </div>

            <div class="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--muted-foreground)]">
              <span>Base: <strong class="text-[var(--foreground)]">${stats.baselineWeight > 0 ? stats.baselineWeight + ' kg' : 'Auto'}</strong></span>
              <span>•</span>
              <span>Récord PR: <strong class="text-amber-500">${stats.prWeight > 0 ? stats.prWeight + ' kg' : 'Por marcar'}</strong></span>
              <span>•</span>
              <span>Sesiones: <strong class="text-[var(--foreground)]">${stats.totalSessions}</strong></span>
            </div>
          </div>
        </div>

        <div class="mt-3 pt-2.5 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-1.5">
            <span class="text-[11px] font-medium text-[var(--foreground)]">Peso siguiente sesión:</span>
            <div class="flex items-center gap-1">
              <button
                type="button"
                data-id="${safeId}"
                data-delta="-2.5"
                class="btn-adjust-custom-weight w-7 h-7 rounded-lg bg-[var(--card)] hover:bg-[var(--accent)] border border-[var(--border)] font-bold text-sm text-[var(--foreground)] flex items-center justify-center transition-colors active:scale-95"
                title="Bajar 2.5 kg"
                aria-label="Bajar 2.5 kg"
              >−</button>

              <div class="relative flex items-center">
                <input
                  type="number"
                  step="2.5"
                  min="0"
                  data-id="${safeId}"
                  value="${escapeAttr(stats.targetWeight)}"
                  class="input-custom-weight w-16 text-center font-bold text-amber-500 bg-[var(--card)] border border-[var(--border)] rounded-lg py-1 text-xs outline-none focus:border-amber-500 transition-colors"
                  aria-label="Peso objetivo en kg para ${escapeAttr(ex.name)}"
                />
                <span class="absolute right-1 text-[10px] text-[var(--muted-foreground)] pointer-events-none">kg</span>
              </div>

              <button
                type="button"
                data-id="${safeId}"
                data-delta="2.5"
                class="btn-adjust-custom-weight w-7 h-7 rounded-lg bg-[var(--card)] hover:bg-[var(--accent)] border border-[var(--border)] font-bold text-sm text-[var(--foreground)] flex items-center justify-center transition-colors active:scale-95"
                title="Subir 2.5 kg"
                aria-label="Subir 2.5 kg"
              >+</button>
            </div>
            <span id="savedIndicator_${safeId}" class="text-[10px] font-bold text-emerald-400 opacity-0 transition-opacity">✓ Guardado</span>
          </div>

          <button
            type="button"
            data-target="history_${safeId}"
            class="btn-toggle-history text-[11px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-amber-500/10"
          >
            <span>📜 Bitácora (${stats.history.length})</span>
            <span class="text-[9px] transition-transform duration-200">▼</span>
          </button>
        </div>

        <div id="history_${safeId}" class="hidden mt-3 pt-3 border-t border-[var(--border)] space-y-2">
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
        No hay registros aún de este ejercicio. Completa series en tu rutina para ver la evolución aquí.
      </div>
    `;
  }

  return `
    <div class="space-y-1.5">
      <div class="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider px-1">
        Historial de sobrecarga progresiva (últimas sesiones)
      </div>
      ${stats.history.map(item => {
        const dateFormatted = item.date ? formatDisplayDate(item.date, {
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        }) : 'Sesión';

        const setsSummary = (item.sets || []).map(s => `${s.weight}kg × ${s.reps}`).join(' • ');

        return `
          <div class="p-2 rounded-xl bg-[var(--card)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px]">
            <div class="flex items-center gap-2">
              <span class="font-bold text-[var(--foreground)] capitalize">${escapeHtml(dateFormatted)}</span>
              <span class="text-[var(--muted-foreground)]">• ${escapeHtml(item.routineName)}</span>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-amber-500 font-mono font-medium break-words">${escapeHtml(setsSummary)}</span>
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

function readProfileForm(container) {
  const value = (id) => container.querySelector(`#${id}`)?.value ?? '';
  return {
    name: value('profileName').trim() || 'Atleta',
    age: toNumber(value('profileAge'), 0),
    height: toNumber(value('profileHeight'), 0),
    heightCm: toNumber(value('profileHeight'), 0),
    startWeight: toNumber(value('profileStartWeight'), 0),
    currentWeight: toNumber(value('profileCurrentWeight'), 0),
    targetWeightMin: toNumber(value('profileTargetMin'), 0),
    targetWeightMax: toNumber(value('profileTargetMax'), 0),
    fatFreeMass: toNumber(value('profileFatFreeMass'), 0),
    bodyFatPercent: toNumber(value('profileBodyFat'), 0),
    fatMassKg: toNumber(value('profileFatMass'), 0),
    trunkFat: toNumber(value('profileTrunkFat'), 0),
    visceralFat: toNumber(value('profileVisceral'), 0),
    basalMetabolicRate: toNumber(value('profileBmr'), 0),
    waterTargetLitres: toNumber(value('profileWater'), 0),
    gymSchedule: value('profileGym').trim(),
    condition: value('profileCondition').trim()
  };
}

function attachSettingsEvents(container) {
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
    if (noResults) noResults.classList.toggle('hidden', visibleCount > 0);
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
  container.querySelectorAll('.btn-adjust-custom-weight').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const delta = parseFloat(btn.dataset.delta) || 0;
      const input = container.querySelector(`.input-custom-weight[data-id="${CSS.escape(id)}"]`);
      if (input) {
        const currentVal = parseFloat(input.value) || 0;
        const newVal = Math.max(0, Math.round((currentVal + delta) * 10) / 10);
        input.value = newVal;
        db.setCustomWeight(id, newVal);
        showSavedIndicator(container, id);
      }
    });
  });

  container.querySelectorAll('.input-custom-weight').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      const newVal = Math.max(0, parseFloat(e.target.value) || 0);
      e.target.value = newVal;
      db.setCustomWeight(id, newVal);
      showSavedIndicator(container, id);
    });
  });

  // --- BITÁCORA DESPLEGABLE (ACORDEÓN) ---
  container.querySelectorAll('.btn-toggle-history').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const targetEl = container.querySelector(`#${CSS.escape(targetId)}`);
      const chevron = btn.querySelector('span:last-child');
      if (targetEl) {
        const isHidden = targetEl.classList.contains('hidden');
        targetEl.classList.toggle('hidden', !isHidden);
        if (chevron) chevron.style.transform = isHidden ? 'rotate(180deg)' : '';
      }
    });
  });

  // --- PERFIL ---
  const saveProfile = (sync) => {
    const nextProfile = readProfileForm(container);
    db.saveProfile(nextProfile);
    state.notify();
    showToast(sync ? 'Perfil guardado y enviado a la nube.' : 'Perfil guardado en este dispositivo.', 'success');
  };
  const btnSaveProfile = container.querySelector('#btnSaveProfile');
  const btnSaveProfileCloud = container.querySelector('#btnSaveProfileCloud');
  if (btnSaveProfile) btnSaveProfile.addEventListener('click', () => saveProfile(false));
  if (btnSaveProfileCloud) {
    btnSaveProfileCloud.addEventListener('click', async () => {
      if (!convex.hasSyncKey()) {
        showToast('Primero configura la clave de sincronización.', 'warning');
        container.querySelector('#inputSyncKey')?.focus();
        return;
      }
      saveProfile(true);
      const res = await db.syncTwoWay();
      if (res.success) showToast('Perfil sincronizado con la nube.', 'success');
      else showToast(res.error || 'No se pudo sincronizar el perfil.', 'error');
    });
  }

  // --- CLAVE DE SINCRONIZACIÓN ---
  const inputSyncKey = container.querySelector('#inputSyncKey');
  const btnSaveSyncKey = container.querySelector('#btnSaveSyncKey');
  const btnTestSyncKey = container.querySelector('#btnTestSyncKey');
  const btnClearSyncKey = container.querySelector('#btnClearSyncKey');

  if (btnSaveSyncKey) {
    btnSaveSyncKey.addEventListener('click', async () => {
      const key = inputSyncKey?.value?.trim() || '';
      if (!key) {
        showToast('Escribe la clave de sincronización.', 'warning');
        inputSyncKey?.focus();
        return;
      }
      convex.setSyncKey(key);
      if (inputSyncKey) inputSyncKey.value = '';
      showToast('Clave guardada. Probando conexión…', 'info');
      const res = await convex.fetchCloudProfile();
      if (res.success) {
        showToast('Clave válida. Sincronización habilitada.', 'success');
        await db.syncTwoWay();
      } else {
        showToast(res.error || 'La clave no pudo validarse.', 'error', 6000);
      }
      state.notify();
    });
  }

  if (btnTestSyncKey) {
    btnTestSyncKey.addEventListener('click', async () => {
      if (!convex.hasSyncKey()) {
        showToast('No hay una clave configurada.', 'warning');
        inputSyncKey?.focus();
        return;
      }
      btnTestSyncKey.disabled = true;
      const res = await convex.fetchCloudProfile();
      btnTestSyncKey.disabled = false;
      if (res.success) showToast('Conexión y clave correctas.', 'success');
      else showToast(res.error || 'No se pudo conectar.', 'error', 6000);
    });
  }

  if (btnClearSyncKey) {
    btnClearSyncKey.addEventListener('click', async () => {
      const ok = await confirmAction({
        title: '¿Olvidar la clave de sincronización?',
        message: 'Los datos locales se mantienen, pero la app dejará de respaldar en la nube hasta que vuelvas a configurarla.',
        confirmText: 'Olvidar clave',
        danger: true
      });
      if (!ok) return;
      convex.clearSyncKey();
      showToast('Clave eliminada de este dispositivo.', 'info');
      state.notify();
    });
  }

  // --- ESTADO EN VIVO DE CONVEX ---
  const unsubscribe = convex.onSyncStatus(({ isOnline, lastSync }) => {
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

  // --- TEMA ---
  if (selectTheme) {
    selectTheme.addEventListener('change', (e) => {
      const isDark = e.target.value === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
      db.setTheme(isDark ? 'dark' : 'light');
      const iconEl = document.getElementById('themeIcon');
      if (iconEl) iconEl.textContent = isDark ? '☀️' : '🌙';
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', isDark ? '#090d16' : '#f8fafc');
      state.notify();
    });
  }

  // --- SINCRONIZACIÓN MANUAL ---
  const ensureSyncKey = () => {
    if (convex.hasSyncKey()) return true;
    showToast('Configura la clave de sincronización para usar la nube.', 'warning', 5000);
    inputSyncKey?.focus();
    return false;
  };

  if (btnSyncNow) {
    btnSyncNow.addEventListener('click', async () => {
      if (!ensureSyncKey()) return;
      if (!navigator.onLine) {
        showToast('Sin conexión. Los datos quedan guardados y se sincronizarán al reconectar.', 'warning', 5000);
        return;
      }

      const iconSync = container.querySelector('#iconSync');
      const textSync = container.querySelector('#textSyncBtn');
      btnSyncNow.disabled = true;
      if (iconSync) iconSync.textContent = '⏳';
      if (textSync) textSync.textContent = 'Sincronizando…';

      try {
        const res = await db.syncTwoWay();
        if (res && res.success) {
          if (iconSync) iconSync.textContent = '✅';
          if (textSync) textSync.textContent = '¡Sincronizado!';
          if (textLastSync) textLastSync.textContent = new Date().toLocaleTimeString();
          showToast(`Sincronizado: +${res.importedWorkouts} entrenos, +${res.importedMeas} mediciones.`, 'success', 5000);
          state.notify();
        } else {
          showToast(res?.error || 'No se pudo completar la sincronización.', 'error', 6000);
        }
      } catch (err) {
        showError(err, 'Error durante la sincronización.');
      } finally {
        btnSyncNow.disabled = false;
        setTimeout(() => {
          if (iconSync) iconSync.textContent = '☁️';
          if (textSync) textSync.textContent = 'Sincronizar ahora';
        }, 3000);
      }
    });
  }

  if (btnPullFromCloud) {
    btnPullFromCloud.addEventListener('click', async () => {
      if (!ensureSyncKey()) return;
      if (!navigator.onLine) {
        showToast('Necesitas conexión para descargar desde la nube.', 'warning');
        return;
      }

      const ok = await confirmAction({
        title: '¿Restaurar desde la nube?',
        message: 'Se mezclarán los datos de la nube con este dispositivo. Los cambios locales más recientes se conservan por updatedAt.',
        confirmText: 'Restaurar'
      });
      if (!ok) return;

      btnPullFromCloud.disabled = true;
      btnPullFromCloud.textContent = '⏳ Sincronizando…';

      try {
        const res = await db.syncTwoWay();
        if (res.success) {
          showToast(`Historial restaurado: ${res.totalWorkouts} entrenos y ${res.totalMeas} mediciones.`, 'success', 5000);
          state.notify();
        } else {
          showToast(res.error || 'Error al descargar datos de la nube.', 'error', 6000);
        }
      } catch (err) {
        showError(err, 'Excepción al descargar datos.');
      } finally {
        btnPullFromCloud.disabled = false;
        btnPullFromCloud.textContent = '📥 Restaurar desde la nube';
      }
    });
  }

  if (btnExport) {
    btnExport.addEventListener('click', () => {
      db.exportAllData();
      showToast('Copia de seguridad descargada.', 'success');
    });
  }

  if (fileImport) {
    fileImport.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const ok = await confirmAction({
        title: '¿Restaurar este respaldo?',
        message: 'Los datos actuales de entrenamientos y mediciones serán reemplazados por los del archivo. El perfil y la nutrición también se restaurarán.',
        confirmText: 'Restaurar',
        danger: true
      });
      if (!ok) {
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const res = db.importData(event.target.result);
        if (res.success) {
          showToast(`Datos restaurados (${res.count} entrenamientos). Recargando…`, 'success');
          setTimeout(() => location.reload(), 800);
        } else {
          showToast('Error al importar: ' + res.error, 'error', 6000);
        }
      };
      reader.onerror = () => showToast('No se pudo leer el archivo.', 'error');
      reader.readAsText(file);
    });
  }

  const btnClearCache = container.querySelector('#btnClearCacheReload');
  if (btnClearCache) {
    btnClearCache.addEventListener('click', async () => {
      const ok = await confirmAction({
        title: '¿Forzar la actualización?',
        message: 'Se limpiarán las cachés y el service worker. Tus datos de entrenamiento no se tocan. La app se recargará.',
        confirmText: 'Actualizar'
      });
      if (!ok) return;

      btnClearCache.disabled = true;
      btnClearCache.innerHTML = '<span>⏳ Actualizando…</span>';
      try {
        const filesToRefresh = [
          './', './index.html', './sw.js', './manifest.json',
          './assets/css/tailwind.css', './assets/vendor/chart.umd.min.js',
          './js/config.js', './js/app.js', './js/state.js',
          './js/data/initialData.js', './js/services/convex.js', './js/services/db.js',
          './js/services/timer.js', './js/services/merge.js',
          './js/utils/escape.js', './js/ui/toast.js',
          './js/modules/workout.js', './js/modules/workout-render.js', './js/modules/workout-utils.js',
          './js/modules/nutrition.js',
          './js/modules/analytics.js', './js/modules/settings.js'
        ];
        await Promise.all(filesToRefresh.map(url => fetch(url, { cache: 'reload' }).catch(() => {})));

        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
        }
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(reg => reg.unregister()));
        }

        const cleanUrl = window.location.origin + window.location.pathname;
        window.location.replace(`${cleanUrl}?v=${Date.now()}`);
      } catch (err) {
        console.error('Error limpiando caché:', err);
        window.location.reload();
      }
    });
  }

  return unsubscribe;
}

function showSavedIndicator(container, id) {
  const indicator = container.querySelector(`#savedIndicator_${CSS.escape(id)}`);
  if (!indicator) return;
  indicator.classList.remove('opacity-0');
  setTimeout(() => indicator.classList.add('opacity-0'), 1500);
}
