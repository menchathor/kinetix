// Temporizador de descanso flotante resiliente en segundo plano (Timestamp + Wake Lock + Web Audio + Háptica)
export class RestTimer {
  constructor() {
    this.totalSeconds = 90;
    this.remainingSeconds = 90;
    this.endTime = null;
    this.intervalId = null;
    this.isRunning = false;
    this.wakeLock = null;
    this.onTickCallbacks = [];
    this.onCompleteCallbacks = [];

    // Sincronizar inmediatamente al desbloquear pantalla o volver a la pestaña
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (this.isRunning && this.endTime) {
            this.syncRemainingFromClock();
          }
          // Re-solicitar Wake Lock si hay temporizador o sesión activa
          if (this.isRunning) {
            this.requestWakeLock();
          }
        }
      });
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
    this.requestWakeLock();
    this.notifyTick();

    this.intervalId = setInterval(() => {
      this.syncRemainingFromClock();
    }, 250);
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
    this.notifyTick();
  }

  addSeconds(secs = 15) {
    this.remainingSeconds += secs;
    this.totalSeconds = Math.max(this.totalSeconds, this.remainingSeconds);
    if (this.isRunning && this.endTime) {
      this.endTime += secs * 1000;
    }
    this.notifyTick();
  }

  reset() {
    this.clearTimerInterval();
    this.endTime = null;
    this.isRunning = false;
    this.remainingSeconds = this.totalSeconds;
    this.notifyTick();
  }

  complete() {
    this.clearTimerInterval();
    this.endTime = null;
    this.isRunning = false;
    this.remainingSeconds = 0;
    this.notifyTick();
    this.playNotificationSound();
    this.triggerVibration();
    this.onCompleteCallbacks.forEach(cb => cb());
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
        // Ignorar silenciosamente si el navegador o modo ahorro de batería lo rechaza
      }
    }
  }

  async releaseWakeLock() {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
      } catch {
        this.wakeLock = null;
      }
    }
  }

  onTick(cb) {
    this.onTickCallbacks.push(cb);
  }

  onComplete(cb) {
    this.onCompleteCallbacks.push(cb);
  }

  notifyTick() {
    const formatted = this.getFormattedTime();
    const progress = this.totalSeconds > 0 
      ? Math.max(0, Math.min(100, (this.remainingSeconds / this.totalSeconds) * 100))
      : 0;
    this.onTickCallbacks.forEach(cb => cb({
      remaining: this.remainingSeconds,
      total: this.totalSeconds,
      formatted,
      progress,
      isRunning: this.isRunning
    }));
  }

  getFormattedTime() {
    const m = Math.floor(this.remainingSeconds / 60);
    const s = this.remainingSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  playNotificationSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // Triple beep agradable
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
      // Ignorar si el navegador bloquea audio antes de interacción
    }
  }

  triggerVibration() {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 300]);
    }
  }
}

export const timer = new RestTimer();
