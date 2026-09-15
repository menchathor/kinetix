// Controlador Principal de la Aplicación (SPA & Enrutador)
import { state } from './state.js';
import { timer } from './services/timer.js';
import { renderWorkoutModule } from './modules/workout.js';
import { renderNutritionModule } from './modules/nutrition.js';
import { renderAnalyticsModule } from './modules/analytics.js';
import { renderSettingsModule } from './modules/settings.js';

class App {
  constructor() {
    this.container = document.getElementById('mainContent');
    this.timerOverlay = document.getElementById('floatingTimer');
    this.init();
  }

  init() {
    // Configurar Tema (Claro / Oscuro)
    this.initTheme();

    // Suscribirse a cambios de estado global (preserva la posición de scroll)
    state.subscribe(() => {
      this.renderCurrentView(true);
      this.updateNavigationUI();
    });

    // Configurar navegación inferior (al cambiar de pestaña sí resetea el scroll al inicio)
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab !== state.activeTab) {
          window.scrollTo({ top: 0, behavior: 'instant' });
          state.setTab(tab);
        }
      });
    });

    // Configurar Temporizador Flotante
    this.setupTimerUI();

    // Render inicial
    this.renderCurrentView(false);
    this.updateNavigationUI();

    // Registrar Service Worker para soporte offline PWA
    this.registerServiceWorker();
  }

  initTheme() {
    const savedTheme = localStorage.getItem('smartfit_theme') || 'dark';
    const isDark = savedTheme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    this.updateThemeIcon(isDark);

    const btnToggle = document.getElementById('btnThemeToggle');
    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        const currentlyDark = document.documentElement.classList.contains('dark');
        const nextDark = !currentlyDark;
        document.documentElement.classList.toggle('dark', nextDark);
        localStorage.setItem('smartfit_theme', nextDark ? 'dark' : 'light');
        this.updateThemeIcon(nextDark);
        // Refrescar vista actual para adaptar gráficas de Chart.js preservando scroll
        this.renderCurrentView(true);
      });
    }
  }

  updateThemeIcon(isDark) {
    const iconEl = document.getElementById('themeIcon');
    if (iconEl) {
      iconEl.textContent = isDark ? '☀️' : '🌙';
    }
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
      
      const icon = btn.querySelector('.nav-icon');
      const label = btn.querySelector('.nav-label');

      if (isActive) {
        btn.classList.add('text-amber-500');
        btn.classList.remove('text-[var(--muted-foreground)]');
        if (label) label.classList.add('font-bold');
      } else {
        btn.classList.remove('text-amber-500');
        btn.classList.add('text-[var(--muted-foreground)]');
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

    // Eventos de botones del temporizador flotante
    const btnClose = document.getElementById('btnTimerClose');
    const btnAdd15 = document.getElementById('btnTimerAdd15');
    const btnToggle = document.getElementById('btnTimerTogglePlay');

    if (btnClose) btnClose.addEventListener('click', () => {
      timer.stop();
      this.timerOverlay.classList.add('hidden');
    });

    if (btnAdd15) btnAdd15.addEventListener('click', () => {
      timer.addSeconds(15);
    });

    if (btnToggle) btnToggle.addEventListener('click', () => {
      if (timer.isRunning) {
        timer.stop();
      } else {
        timer.start();
      }
    });
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('[PWA] Service Worker registrado'))
          .catch(err => console.log('[PWA] Service Worker omitido:', err));
      });
    }
  }
}

// Iniciar aplicación una vez cargado el DOM
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
