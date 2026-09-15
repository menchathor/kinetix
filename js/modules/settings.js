// Módulo de Configuración, Conexión Cloud (Supabase/Firebase) y Respaldo de Datos
import { db } from '../services/db.js';
import { INITIAL_DATA } from '../data/initialData.js';

export function renderSettingsModule(container) {
  const settings = db.getSettings();
  const profile = INITIAL_DATA.profile;

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

      <!-- BASE DE DATOS Y SINCRONIZACIÓN CLOUD -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-base">☁️</span>
          <h3 class="text-sm font-bold text-[var(--foreground)]">Conexión a Base de Datos en la Nube</h3>
        </div>
        <p class="text-xs text-[var(--muted-foreground)] mb-3">
          Por defecto, la app funciona en modo <b>Local-First (100% offline)</b> en tu teléfono. Si deseas sincronización en tiempo real entre múltiples dispositivos, puedes conectar Supabase o Firebase gratis.
        </p>

        <div class="space-y-3 text-xs">
          <div>
            <label class="font-bold text-[var(--foreground)] block mb-1">Proveedor de Base de Datos</label>
            <select id="selectCloudProvider" class="w-full p-2.5 rounded-xl bg-[var(--accent)] border border-[var(--border)] outline-none text-[var(--foreground)] font-medium">
              <option value="none" ${settings.cloudProvider === 'none' ? 'selected' : ''}>Modo Local-First (Recomendado sin servidor)</option>
              <option value="supabase" ${settings.cloudProvider === 'supabase' ? 'selected' : ''}>Supabase (PostgreSQL en la Nube)</option>
              <option value="firebase" ${settings.cloudProvider === 'firebase' ? 'selected' : ''}>Firebase Firestore</option>
            </select>
          </div>

          <!-- Campos Supabase -->
          <div id="sectionSupabase" class="${settings.cloudProvider === 'supabase' ? '' : 'hidden'} space-y-2 p-3 rounded-xl bg-[var(--accent)]/40 border border-[var(--border)]">
            <div>
              <label class="font-semibold text-[var(--foreground)] block mb-0.5">Project URL</label>
              <input type="text" id="inputSupabaseUrl" value="${settings.supabaseUrl || ''}" placeholder="https://xyzcompany.supabase.co" class="w-full p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono text-[11px]" />
            </div>
            <div>
              <label class="font-semibold text-[var(--foreground)] block mb-0.5">Anon Public Key</label>
              <input type="password" id="inputSupabaseKey" value="${settings.supabaseKey || ''}" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." class="w-full p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] outline-none text-[var(--foreground)] font-mono text-[11px]" />
            </div>
          </div>

          <button id="btnSaveCloudSettings" class="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-xl text-xs transition-all">
            Guardar Configuración Cloud
          </button>
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
            <p class="font-bold text-[var(--foreground)]">Kinetix v1.3 (PWA)</p>
            <p class="text-[11px]">Diseñada a la medida para Michael Meneses • 18:00 hrs</p>
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

function attachSettingsEvents(container, settings) {
  const selectTheme = container.querySelector('#selectThemeSetting');
  const selectProvider = container.querySelector('#selectCloudProvider');
  const sectionSupabase = container.querySelector('#sectionSupabase');
  const btnSaveCloud = container.querySelector('#btnSaveCloudSettings');
  const btnExport = container.querySelector('#btnExportJSON');
  const fileImport = container.querySelector('#fileImportJSON');

  if (selectTheme) {
    selectTheme.addEventListener('change', (e) => {
      const isDark = e.target.value === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
      localStorage.setItem('smartfit_theme', e.target.value);
      const iconEl = document.getElementById('themeIcon');
      if (iconEl) iconEl.textContent = isDark ? '☀️' : '🌙';
    });
  }

  if (selectProvider) {
    selectProvider.addEventListener('change', (e) => {
      if (e.target.value === 'supabase') {
        sectionSupabase.classList.remove('hidden');
      } else {
        sectionSupabase.classList.add('hidden');
      }
    });
  }

  if (btnSaveCloud) {
    btnSaveCloud.addEventListener('click', () => {
      settings.cloudProvider = selectProvider.value;
      if (selectProvider.value === 'supabase') {
        settings.supabaseUrl = container.querySelector('#inputSupabaseUrl').value.trim();
        settings.supabaseKey = container.querySelector('#inputSupabaseKey').value.trim();
      }
      db.saveSettings(settings);
      alert('Configuración guardada correctamente.');
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
