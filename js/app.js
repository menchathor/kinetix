// Controlador Principal de la Aplicación (SPA & Enrutador)
import { CONFIG, debugLog } from './config.js';
import { state } from './state.js';
import { timer } from './services/timer.js';
import { renderWorkoutModule } from './modules/workout.js';
import { renderNutritionModule } from './modules/nutrition.js';
import { renderAnalyticsModule } from './modules/analytics.js';
import { renderSettingsModule } from './modules/settings.js';
import { db } from './services/db.js';
import { convex } from './services/convex.js';
import { showToast } from './ui/toast.js';

class App {
  constructor() {
    this.container = document.getElementById('mainContent');
    this.timerOverlay = document.getElementById('floatingTimer');
    this.init();
  }

  init() {
    this.initTheme();

    const validTabs = ['workout', 'nutrition', 'analytics', 'settings'];
    const hashTab = location.hash.replace('#', '');
    if (validTabs.includes(hashTab)) {
      state.activeTab = hashTab;
    }

    // Suscribirse a cambios de estado global (preserva la posición de scroll)
    state.subscribe(() => {
      this.renderCurrentView(true);
      this.updateNavigationUI();
      this.updateHeader();
      if (location.hash !== `#${state.activeTab}`) {
        history.replaceState(null, '', `#${state.activeTab}`);
      }
    });

    // Navegación inferior
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab !== state.activeTab) {
          window.scrollTo({ top: 0, behavior: 'instant' });
          state.setTab(tab);
        }
      });
    });

    // Soporte de enlaces directos (manifest shortcuts, atrás/adelante).
    window.addEventListener('hashchange', () => {
      const tab = location.hash.replace('#', '');
      if (validTabs.includes(tab) && tab !== state.activeTab) {
        state.setTab(tab);
      }
    });

    this.setupTimerUI();

    this.renderCurrentView(false);
    this.updateNavigationUI();
    this.updateHeader();

    this.initAutoSync();

    // Si IndexedDB restauró datos tras un desalojo de localStorage, refrescar.
    window.addEventListener('kinetix:restored', () => {
      showToast('Datos recuperados desde el respaldo local (IndexedDB).', 'success');
      state.notify();
    });

    this.registerServiceWorker();
  }

  initTheme() {
    const savedTheme = db.getTheme();
    const isDark = savedTheme !== 'light';
    document.documentElement.classList.toggle('dark', isDark);
    this.updateThemeMeta(isDark);
    this.updateThemeIcon(isDark);

    const btnToggle = document.getElementById('btnThemeToggle');
    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        const currentlyDark = document.documentElement.classList.contains('dark');
        const nextDark = !currentlyDark;
        document.documentElement.classList.toggle('dark', nextDark);
        db.setTheme(nextDark ? 'dark' : 'light');
        this.updateThemeMeta(nextDark);
        this.updateThemeIcon(nextDark);
        this.renderCurrentView(true);
      });
    }
  }

  updateThemeMeta(isDark) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#090d16' : '#f8fafc');
  }

  updateThemeIcon(isDark) {
    const iconEl = document.getElementById('themeIcon');
    if (iconEl) iconEl.textContent = isDark ? '☀️' : '🌙';
  }

  updateHeader() {
    const profile = db.getProfile();
    const subtitle = document.getElementById('headerSubtitle');
    if (subtitle) {
      subtitle.textContent = `Recomposición Corporal • ${profile.targetWeightMin}-${profile.targetWeightMax} kg`;
    }

    const gymTime = document.getElementById('headerGymTime');
    if (gymTime) {
      const start = String(profile.gymSchedule || '').split('-')[0].trim();
      gymTime.textContent = start || '18:00';
    }

    const versionBadge = document.getElementById('headerVersionBadge');
    if (versionBadge) versionBadge.textContent = `v${CONFIG.APP_VERSION}`;
  }

  renderCurrentView(preserveScroll = false) {
    if (!this.container) return;
    const previousScrollY = window.scrollY;

    switch (state.activeTab) {
      case 'workout':
        renderWorkoutModule(this.container);
        break;
      case 'nutrition':
        renderNutritionModule(this.container);
        break;
      case 'analytics':
        renderAnalyticsModule(this.container);
        break;
      case 'settings':
        renderSettingsModule(this.container);
        break;
      default:
        renderWorkoutModule(this.container);
    }

    if (preserveScroll) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: previousScrollY, behavior: 'instant' });
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  updateNavigationUI() {
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      const tab = btn.getAttribute('data-tab');
      const isActive = tab === state.activeTab;
      const label = btn.querySelector('.nav-label');

      if (isActive) {
        btn.classList.add('text-amber-500');
        btn.classList.remove('text-[var(--muted-foreground)]');
        btn.setAttribute('aria-current', 'page');
        if (label) label.classList.add('font-bold');
      } else {
        btn.classList.remove('text-amber-500');
        btn.classList.add('text-[var(--muted-foreground)]');
        btn.removeAttribute('aria-current');
        if (label) label.classList.remove('font-bold');
      }
    });
  }

  setupTimerUI() {
    if (!this.timerOverlay) return;

    timer.onTick(({ formatted, progress, isRunning, remaining }) => {
      if (remaining > 0 || isRunning) {
        this.timerOverlay.classList.remove('hidden');
      }

      const timeDisplay = document.getElementById('timerTextDisplay');
      const progressBar = document.getElementById('timerProgressBar');
      const toggleBtn = document.getElementById('btnTimerTogglePlay');

      if (timeDisplay) timeDisplay.textContent = formatted;
      if (progressBar) progressBar.style.width = `${progress}%`;
      if (toggleBtn) toggleBtn.textContent = isRunning ? '⏸' : '▶';
    });

    timer.onComplete(() => {
      const timeDisplay = document.getElementById('timerTextDisplay');
      if (timeDisplay) timeDisplay.textContent = '¡Listo!';
      setTimeout(() => {
        if (!timer.isRunning && timer.remainingSeconds === 0) {
          this.timerOverlay.classList.add('hidden');
        }
      }, 4000);
    });

    const btnClose = document.getElementById('btnTimerClose');
    const btnAdd15 = document.getElementById('btnTimerAdd15');
    const btnToggle = document.getElementById('btnTimerTogglePlay');

    if (btnClose) btnClose.addEventListener('click', () => {
      timer.stop();
      this.timerOverlay.classList.add('hidden');
    });

    if (btnAdd15) btnAdd15.addEventListener('click', () => timer.addSeconds(15));

    if (btnToggle) btnToggle.addEventListener('click', () => {
      if (timer.isRunning) timer.stop();
      else timer.start();
    });

    // Retomar un descanso que estaba corriendo al recargar la app.
    timer.restore();
  }

  async initAutoSync() {
    const runSync = async (source) => {
      if (!navigator.onLine || !convex.hasSyncKey()) return;
      try {
        const res = await db.syncTwoWay();
        if (res && res.success && (res.importedWorkouts > 0 || res.importedMeas > 0 || res.importedWeights > 0 || res.profileApplied)) {
          debugLog(`[AutoSync:${source}] +${res.importedWorkouts} entrenos, +${res.importedMeas} mediciones.`);
          state.notify();
        }
        if (res && !res.success && res.code === 'SYNC_KEY_INVALID') {
          showToast(res.error, 'error', 6000);
        }
      } catch (err) {
        debugLog('[AutoSync] Diferido:', err);
      }
    };

    // Sincronización transparente al iniciar.
    runSync('start');

    // Al reconectar a internet.
    window.addEventListener('online', () => runSync('online'));

    // Al volver a la app después de un rato (máximo una vez cada 5 minutos).
    let lastVisibilitySync = Date.now();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastVisibilitySync < 5 * 60 * 1000) return;
      lastVisibilitySync = Date.now();
      runSync('visible');
    });
  }

  registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (!event.data || event.data.type !== 'SW_UPDATED' || refreshing) return;

      // No recargar en medio de un entrenamiento: se perdería el foco/teclado.
      if (state.activeWorkout) {
        showToast('Hay una actualización lista. Se aplicará al terminar el entrenamiento.', 'info', 6000);
        return;
      }

      refreshing = true;
      window.location.reload();
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
        .then(reg => {
          debugLog('[PWA] Service Worker registrado');
          reg.update().catch(() => {});

          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') reg.update().catch(() => {});
          });
        })
        .catch(err => debugLog('[PWA] Service Worker omitido:', err));
    });
  }
}

// Iniciar aplicación una vez cargado el DOM
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
