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
import { showToast, hasOpenModal, closeTopModal } from './ui/toast.js';
import { icon } from './ui/icons.js';
import { escapeHtml } from './utils/escape.js';

const VALID_TABS = ['workout', 'nutrition', 'analytics', 'settings'];
const INSTALL_DISMISS_KEY = 'kinetix_install_dismissed';

// Rellena los huecos `data-icon` del HTML estático con SVG de Lucide.
function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    const name = el.getAttribute('data-icon');
    if (!name) return;
    const size = el.getAttribute('data-icon-class') || 'w-5 h-5';
    el.innerHTML = icon(name, size);
  });
}

class App {
  constructor() {
    this.container = document.getElementById('mainContent');
    this.timerOverlay = document.getElementById('floatingTimer');
    this.isSyncing = false;
    this.init();
  }

  init() {
    hydrateIcons();
    this.initTheme();

    const hashTab = location.hash.replace('#', '');
    if (VALID_TABS.includes(hashTab)) {
      state.activeTab = hashTab;
    }
    // Entrada base del historial: permite que "atrás" vuelva al tab previo.
    history.replaceState({ tab: state.activeTab }, '', `#${state.activeTab}`);

    // Suscribirse a cambios de estado global (preserva la posición de scroll)
    state.subscribe(() => {
      this.renderCurrentView(true);
      this.updateNavigationUI();
      this.updateHeader();
      if (location.hash !== `#${state.activeTab}`) {
        history.replaceState({ tab: state.activeTab }, '', `#${state.activeTab}`);
      }
    });

    // Navegación inferior: cada tab crea una entrada real en el historial.
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.goToTab(btn.getAttribute('data-tab'));
      });
    });

    // Enlaces directos (manifest shortcuts, hash manual).
    window.addEventListener('hashchange', () => {
      const tab = location.hash.replace('#', '');
      if (VALID_TABS.includes(tab) && tab !== state.activeTab) {
        state.setTab(tab);
      }
    });

    // Atrás/adelante: primero cierra un modal; si no hay, cambia de tab.
    window.addEventListener('popstate', (event) => {
      if (hasOpenModal()) {
        closeTopModal();
        return;
      }
      const tab = event.state?.tab || location.hash.replace('#', '');
      if (VALID_TABS.includes(tab) && tab !== state.activeTab) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        state.setTab(tab);
      }
    });

    this.setupTimerUI();
    this.setupHeaderStatus();
    this.setupInstallPrompt();

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

  goToTab(tab, { push = true } = {}) {
    if (!VALID_TABS.includes(tab)) return;
    if (tab === state.activeTab) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (push) history.pushState({ tab }, '', `#${tab}`);
    state.setTab(tab);
  }

  initTheme() {
    const savedTheme = db.getTheme();
    const isDark = savedTheme === 'dark';
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
    if (iconEl) iconEl.innerHTML = icon(isDark ? 'sun' : 'moon');
  }

  setupHeaderStatus() {
    const btn = document.getElementById('headerSyncStatus');
    if (btn) btn.addEventListener('click', () => this.goToTab('settings'));

    const refresh = () => this.updateSyncStatus();
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    convex.onSyncStatus(refresh);
    refresh();
  }

  updateSyncStatus() {
    const btn = document.getElementById('headerSyncStatus');
    const iconEl = document.getElementById('headerSyncIcon');
    const dot = document.getElementById('headerSyncDot');
    if (!btn || !iconEl) return;

    const online = navigator.onLine;
    const hasKey = convex.hasSyncKey();
    iconEl.innerHTML = icon(
      this.isSyncing ? 'loader' : (online ? 'cloud' : 'cloud-off'),
      this.isSyncing ? 'w-5 h-5 animate-spin' : 'w-5 h-5'
    );

    if (dot) dot.classList.toggle('hidden', online && hasKey);
    const label = this.isSyncing
      ? 'Sincronizando datos'
      : online
        ? (hasKey ? 'Sincronización configurada y en línea' : 'En línea, sin clave de sincronización')
        : 'Sin conexión, guardando en el dispositivo';
    btn.setAttribute('aria-label', `Estado de sincronización: ${label}`);
    btn.setAttribute('title', label);
  }

  updateHeader() {
    const profile = db.getProfile();
    const subtitle = document.getElementById('headerSubtitle');
    if (subtitle) {
      subtitle.innerHTML = `Recomposición Corporal<span class="hidden xs:inline"> • ${escapeHtml(profile.targetWeightMin)}-${escapeHtml(profile.targetWeightMax)} kg</span>`;
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
      if (toggleBtn) {
        toggleBtn.innerHTML = icon(isRunning ? 'pause' : 'play');
        toggleBtn.setAttribute('aria-label', isRunning ? 'Pausar el descanso' : 'Reanudar el descanso');
      }
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

  setupInstallPrompt() {
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredPrompt = event;

      let dismissedAt = 0;
      try { dismissedAt = Number(localStorage.getItem(INSTALL_DISMISS_KEY)) || 0; } catch { /* noop */ }
      if (Date.now() - dismissedAt < 30 * 24 * 60 * 60 * 1000) return;
      this.showInstallBanner(deferredPrompt);
    });

    window.addEventListener('appinstalled', () => {
      this.hideInstallBanner();
      try { localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
      showToast('Kinetix instalado en tu dispositivo.', 'success');
    });
  }

  showInstallBanner(promptEvent) {
    if (document.getElementById('kinetixInstallBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'kinetixInstallBanner';
    banner.className = 'fixed left-3 right-3 z-[70] max-w-md mx-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-2xl soft-in';
    banner.style.bottom = 'calc(5.5rem + env(safe-area-inset-bottom, 0px))';
    banner.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0">
          ${icon('download')}
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold text-[var(--foreground)]">Instala Kinetix</p>
          <p class="text-[11px] text-[var(--muted-foreground)]">Acceso directo y funcionamiento offline.</p>
        </div>
        <button type="button" id="btnInstallPwa" class="btn-touch px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold">Instalar</button>
        <button type="button" id="btnDismissInstall" class="btn-touch w-11 rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--accent)] flex items-center justify-center" aria-label="Ahora no">
          ${icon('x')}
        </button>
      </div>
    `;
    document.body.appendChild(banner);

    const dismiss = () => {
      this.hideInstallBanner();
      try { localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
    };

    banner.querySelector('#btnDismissInstall')?.addEventListener('click', dismiss);
    banner.querySelector('#btnInstallPwa')?.addEventListener('click', async () => {
      if (!promptEvent) return dismiss();
      promptEvent.prompt();
      const choice = await promptEvent.userChoice.catch(() => ({ outcome: 'dismissed' }));
      if (choice.outcome !== 'accepted') dismiss();
      else this.hideInstallBanner();
    });
  }

  hideInstallBanner() {
    document.getElementById('kinetixInstallBanner')?.remove();
  }

  async initAutoSync() {
    const runSync = async (source) => {
      if (!navigator.onLine || !convex.hasSyncKey()) return;
      this.isSyncing = true;
      this.updateSyncStatus();
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
      } finally {
        this.isSyncing = false;
        this.updateSyncStatus();
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
