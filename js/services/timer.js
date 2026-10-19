// Temporizador de descanso resiliente en segundo plano
// Timestamp + Wake Lock + Web Audio + Háptica + persistencia + notificaciones.
const TIMER_STORAGE_KEY = 'kinetix_timer_state';

function readNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export class RestTimer {
  constructor() {
    this.totalSeconds = 90;
    this.remainingSeconds = 90;
    this.endTime = null;
    this.intervalId = null;
    this.isRunning = false;
    this.wakeLock = null;
    this.audioContext = null;
    this.onTickCallbacks = [];
    this.onCompleteCallbacks = [];
    this.restoredState = null;

    this.loadPersistedState();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (this.isRunning && this.endTime) {
            this.syncRemainingFromClock();
          }
          if (this.isRunning) {
            this.requestWakeLock();
          }
        }
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.persist());
    }
  }

  loadPersistedState() {
    try {
      const raw = localStorage.getItem(TIMER_STORAGE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw);
      if (!state || !state.endTime || !state.isRunning) {
        localStorage.removeItem(TIMER_STORAGE_KEY);
        return;
      }
      this.totalSeconds = readNumber(state.totalSeconds, 90);
      this.endTime = readNumber(state.endTime, 0);
      this.remainingSeconds = Math.max(0, Math.ceil((this.endTime - Date.now()) / 1000));
      this.isRunning = true;
      this.restoredState = state;
    } catch {
      this.restoredState = null;
    }
  }

  // Se llama después de registrar los callbacks de la UI.
  restore() {
    if (!this.restoredState) return;
    const state = this.restoredState;
    this.restoredState = null;

    if (!state.isRunning) {
      this.remainingSeconds = Math.max(0, readNumber(state.remainingSeconds, this.remainingSeconds));
      this.isRunning = false;
      this.endTime = null;
      this.notifyTick();
      return;
    }

    if (this.endTime && this.endTime > Date.now()) {
      this.isRunning = true;
      this.startInterval();
      this.requestWakeLock();
      this.notifyTick();
    } else {
      this.complete();
    }
  }

  persist() {
    try {
      // Sólo persistimos descansos activos. Un temporizador pausado o
      // detenido no debe reaparecer al recargar la app.
      if (!this.isRunning || !this.endTime) {
        localStorage.removeItem(TIMER_STORAGE_KEY);
        return;
      }
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
        totalSeconds: this.totalSeconds,
        remainingSeconds: this.remainingSeconds,
        endTime: this.endTime,
        isRunning: true
      }));
    } catch {
      // Sin persistencia el timer sigue funcionando en esta sesión.
    }
  }

  start(seconds = null) {
    if (seconds !== null) {
      this.totalSeconds = seconds;
      this.remainingSeconds = seconds;
    } else if (this.remainingSeconds <= 0) {
      this.remainingSeconds = this.totalSeconds || 90;
    }

    this.clearTimerInterval();
    this.isRunning = true;
    this.endTime = Date.now() + this.remainingSeconds * 1000;
    this.ensureAudio();
    this.requestWakeLock();
    this.requestNotificationPermission();
    this.startInterval();
    this.persist();
    this.notifyTick();
  }

  startInterval() {
    this.clearTimerInterval();
    this.intervalId = setInterval(() => this.syncRemainingFromClock(), 250);
  }

  syncRemainingFromClock() {
    if (!this.isRunning || !this.endTime) return;
    const msLeft = this.endTime - Date.now();
    const nextSecs = Math.max(0, Math.ceil(msLeft / 1000));

    if (nextSecs !== this.remainingSeconds) {
      this.remainingSeconds = nextSecs;
      this.notifyTick();
    }

    if (msLeft <= 0) {
      this.complete();
    }
  }

  clearTimerInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  stop() {
    if (this.isRunning && this.endTime) {
      this.remainingSeconds = Math.max(0, Math.ceil((this.endTime - Date.now()) / 1000));
    }
    this.clearTimerInterval();
    this.endTime = null;
    this.isRunning = false;
    this.releaseWakeLock();
    this.persist();
    this.notifyTick();
  }

  addSeconds(secs = 15) {
    this.remainingSeconds += secs;
    this.totalSeconds = Math.max(this.totalSeconds, this.remainingSeconds);
    if (this.isRunning && this.endTime) {
      this.endTime += secs * 1000;
    }
    this.persist();
    this.notifyTick();
  }

  reset() {
    this.clearTimerInterval();
    this.endTime = null;
    this.isRunning = false;
    this.remainingSeconds = this.totalSeconds;
    this.releaseWakeLock();
    this.persist();
    this.notifyTick();
  }

  complete() {
    this.clearTimerInterval();
    this.endTime = null;
    this.isRunning = false;
    this.remainingSeconds = 0;
    this.releaseWakeLock();
    try {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    } catch {
      // ignorar
    }
    this.notifyTick();
    this.playNotificationSound();
    this.triggerVibration();
    this.showCompletionNotification();
    this.onCompleteCallbacks.forEach(cb => {
      try {
        cb();
      } catch (err) {
        console.error('[Timer] Error en callback:', err);
      }
    });
  }

  ensureAudio() {
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return null;
      if (!this.audioContext) this.audioContext = new AudioContextCtor();
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      return this.audioContext;
    } catch {
      return null;
    }
  }

  async requestWakeLock() {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (!this.wakeLock) {
          this.wakeLock = await navigator.wakeLock.request('screen');
          this.wakeLock.addEventListener('release', () => {
            this.wakeLock = null;
          });
        }
      } catch {
        // El navegador o el modo ahorro de batería puede rechazarlo.
      }
    }
  }

  async releaseWakeLock() {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch {
        // ignorar
      } finally {
        this.wakeLock = null;
      }
    }
  }

  requestNotificationPermission() {
    try {
      const settings = JSON.parse(localStorage.getItem('kinetix_settings') || '{}');
      if (settings.notificationsEnabled === false) return;
      if (typeof Notification === 'undefined') return;
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch {
      // ignorar
    }
  }

  showCompletionNotification() {
    try {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      if (!document.hidden) return;
      new Notification('Descanso terminado', {
        body: 'Ya puedes volver a la siguiente serie.',
        icon: './assets/icons/icon-192.png',
        tag: 'kinetix-rest-timer',
        silent: false
      });
    } catch {
      // Algunos navegadores móviles no permiten notificaciones desde la página.
    }
  }

  onTick(cb) {
    this.onTickCallbacks.push(cb);
    return () => {
      this.onTickCallbacks = this.onTickCallbacks.filter(item => item !== cb);
    };
  }

  onComplete(cb) {
    this.onCompleteCallbacks.push(cb);
    return () => {
      this.onCompleteCallbacks = this.onCompleteCallbacks.filter(item => item !== cb);
    };
  }

  notifyTick() {
    const formatted = this.getFormattedTime();
    const progress = this.totalSeconds > 0
      ? Math.max(0, Math.min(100, (this.remainingSeconds / this.totalSeconds) * 100))
      : 0;
    this.onTickCallbacks.forEach(cb => {
      try {
        cb({
          remaining: this.remainingSeconds,
          total: this.totalSeconds,
          formatted,
          progress,
          isRunning: this.isRunning
        });
      } catch (err) {
        console.error('[Timer] Error en tick:', err);
      }
    });
  }

  getFormattedTime() {
    const m = Math.floor(this.remainingSeconds / 60);
    const s = this.remainingSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  playNotificationSound() {
    try {
      const ctx = this.ensureAudio();
      if (!ctx) return;

      const playBeep = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      playBeep(660, 0, 0.15);
      playBeep(880, 0.2, 0.25);
    } catch {
      // El navegador puede bloquear audio hasta la primera interacción.
    }
  }

  triggerVibration() {
    try {
      const settings = JSON.parse(localStorage.getItem('kinetix_settings') || '{}');
      if (settings.vibrationEnabled === false) return;
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 300]);
    } catch {
      // ignorar
    }
  }
}

export const timer = new RestTimer();
