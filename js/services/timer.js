// Temporizador de descanso flotante con soporte de Web Audio y vibración háptica
export class RestTimer {
  constructor() {
    this.totalSeconds = 90;
    this.remainingSeconds = 90;
    this.intervalId = null;
    this.isRunning = false;
    this.onTickCallbacks = [];
    this.onCompleteCallbacks = [];
  }

  start(seconds = null) {
    if (seconds !== null) {
      this.totalSeconds = seconds;
      this.remainingSeconds = seconds;
    }
    this.stop();
    this.isRunning = true;
    this.notifyTick();

    this.intervalId = setInterval(() => {
      this.remainingSeconds--;
      this.notifyTick();

      if (this.remainingSeconds <= 0) {
        this.complete();
      }
    }, 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  addSeconds(secs = 15) {
    this.remainingSeconds += secs;
    this.totalSeconds = Math.max(this.totalSeconds, this.remainingSeconds);
    this.notifyTick();
  }

  reset() {
    this.stop();
    this.remainingSeconds = this.totalSeconds;
    this.notifyTick();
  }

  complete() {
    this.stop();
    this.remainingSeconds = 0;
    this.notifyTick();
    this.playNotificationSound();
    this.triggerVibration();
    this.onCompleteCallbacks.forEach(cb => cb());
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
