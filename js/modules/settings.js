// Módulo de Configuración, Sincronización Convex Cloud y Respaldo de Datos
import { db } from '../services/db.js';
import { INITIAL_DATA } from '../data/initialData.js';
import { convex } from '../services/convex.js';
import { CONFIG } from '../config.js';

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

function attachSettingsEvents(container, settings) {
  const selectTheme = container.querySelector('#selectThemeSetting');
  const btnSyncNow = container.querySelector('#btnSyncNow');
  const btnPullFromCloud = container.querySelector('#btnPullFromCloud');
  const btnExport = container.querySelector('#btnExportJSON');
  const fileImport = container.querySelector('#fileImportJSON');
  const cloudStatusBadge = container.querySelector('#cloudStatusBadge');
  const textLastSync = container.querySelector('#textLastSync');

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
