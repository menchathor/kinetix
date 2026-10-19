// Cliente de Sincronización con Convex Cloud (Local-First + clave compartida)
import { CONFIG } from '../config.js';

const SYNC_KEY_STORAGE = 'kinetix_sync_key';

function humanError(code, fallback) {
  if (code === 'SYNC_KEY_REQUIRED') {
    return 'Configura la clave de sincronización en Ajustes para usar la nube.';
  }
  if (code === 'SYNC_KEY_INVALID') {
    return 'La clave de sincronización no es válida. Revísala en Ajustes.';
  }
  if (code === 'SYNC_KEY_NOT_CONFIGURED') {
    return 'El backend aún no tiene configurada KINETIX_SYNC_KEY. Revisa la guía de despliegue.';
  }
  return fallback;
}

class ConvexService {
  constructor() {
    this.baseUrl = CONFIG.CONVEX_URL ? CONFIG.CONVEX_URL.replace(/\/$/, '') : '';
    this.isOnline = typeof navigator === 'undefined' ? false : navigator.onLine;
    this.lastSyncTime = null;
    this.syncListeners = [];
    this.syncKey = this.readSyncKey();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyListeners('online');
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyListeners('offline');
      });
    }
  }

  readSyncKey() {
    try {
      return localStorage.getItem(SYNC_KEY_STORAGE) || '';
    } catch {
      return '';
    }
  }

  setSyncKey(key) {
    this.syncKey = String(key || '').trim();
    try {
      if (this.syncKey) localStorage.setItem(SYNC_KEY_STORAGE, this.syncKey);
      else localStorage.removeItem(SYNC_KEY_STORAGE);
    } catch {
      // localStorage puede estar bloqueado; la clave queda sólo en memoria.
    }
    this.notifyListeners('key-changed');
    return this.hasSyncKey();
  }

  clearSyncKey() {
    return this.setSyncKey('');
  }

  hasSyncKey() {
    return Boolean(this.syncKey);
  }

  onSyncStatus(callback) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(status, details = null) {
    this.syncListeners.forEach(cb => cb({
      status,
      details,
      lastSync: this.lastSyncTime,
      isOnline: this.isOnline,
      hasSyncKey: this.hasSyncKey()
    }));
  }

  async request(endpoint, path, args = {}) {
    if (!this.baseUrl) {
      return { success: false, code: 'NO_BACKEND', error: 'Convex URL no configurada.' };
    }
    if (!this.syncKey) {
      return { success: false, offline: true, code: 'SYNC_KEY_REQUIRED', error: humanError('SYNC_KEY_REQUIRED') };
    }
    if (!this.isOnline) {
      return { success: false, offline: true, code: 'OFFLINE', error: 'Sin conexión a internet.' };
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path,
          args: { ...args, syncKey: this.syncKey },
          format: 'json'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        const code = errorText.includes('SYNC_KEY_INVALID')
          ? 'SYNC_KEY_INVALID'
          : errorText.includes('SYNC_KEY_NOT_CONFIGURED')
            ? 'SYNC_KEY_NOT_CONFIGURED'
            : 'HTTP_ERROR';
        console.warn(`[Convex] Error HTTP en ${path}:`, response.status);
        return { success: false, status: response.status, code, error: humanError(code, 'Error de conexión con la nube.') };
      }

      const result = await response.json();
      if (result.status === 'error') {
        const raw = String(result.errorMessage || '');
        const code = raw.includes('SYNC_KEY_INVALID')
          ? 'SYNC_KEY_INVALID'
          : raw.includes('SYNC_KEY_NOT_CONFIGURED')
            ? 'SYNC_KEY_NOT_CONFIGURED'
            : 'CONVEX_ERROR';
        console.warn(`[Convex] Error en ${path}:`, raw);
        return { success: false, code, error: humanError(code, 'La nube rechazó la operación.') };
      }

      this.lastSyncTime = new Date().toISOString();
      this.notifyListeners('synced', { path });
      return { success: true, data: result.value !== undefined ? result.value : result };
    } catch (err) {
      console.warn(`[Convex] Excepción en ${path}:`, err);
      return { success: false, code: 'NETWORK_ERROR', error: 'No se pudo contactar la nube.', offline: !this.isOnline };
    }
  }

  mutation(path, args = {}) {
    return this.request('/api/mutation', path, args);
  }

  query(path, args = {}) {
    return this.request('/api/query', path, args);
  }

  // --- MÉTODOS DE NEGOCIO KINETIX ---

  async syncWorkout(session) {
    if (!session) return { success: false, code: 'INVALID_DATA', error: 'Sesión vacía.' };
    const formatted = {
      sessionId: session.id || session.sessionId || 'session_' + Date.now(),
      routineId: session.routineId || 'general',
      routineName: session.routineName || 'Sesión',
      dayName: session.dayName || '',
      startTime: session.startTime || (session.date ? (session.date.includes('T') ? session.date : session.date + 'T18:00:00.000Z') : new Date().toISOString()),
      endTime: session.endTime || undefined,
      durationMinutes: session.durationMinutes ? Number(session.durationMinutes) : undefined,
      cardioDone: !!session.cardioDone,
      cardioMinutes: session.cardioMinutes ? Number(session.cardioMinutes) : undefined,
      exercises: (session.exercises || []).map(ex => ({
        exerciseId: ex.exerciseId || ex.id || 'unknown',
        exerciseName: ex.exerciseName || ex.name || '',
        isCardio: !!ex.isCardio,
        minutes: ex.minutes === undefined ? undefined : Number(ex.minutes) || 0,
        sets: (ex.sets || []).map(s => ({
          setNumber: Number(s.setNumber) || 1,
          weight: s.weight ?? '',
          reps: s.reps ?? '',
          completed: !!s.completed,
          rpe: s.rpe || undefined
        })),
        notes: ex.notes || undefined
      })),
      notes: session.notes || undefined,
      updatedAt: Number(session.updatedAt) || Date.now()
    };

    return await this.mutation('workouts:save', formatted);
  }

  async syncNutrition(date, log) {
    if (!date || !log) return { success: false, code: 'INVALID_DATA', error: 'Registro vacío.' };
    const formatted = {
      date,
      medicationTaken: !!log.medicationTaken,
      medicationTime: log.medicationTime || undefined,
      waterMl: Number(log.waterMl) || 0,
      waterGoalMl: Number(log.waterGoalMl) || 3000,
      completedMeals: log.completedMeals || {},
      notes: log.notes || undefined,
      updatedAt: Number(log.updatedAt) || Date.now()
    };

    return await this.mutation('nutrition:saveDaily', formatted);
  }

  async syncMeasurement(measurement) {
    if (!measurement || !measurement.date) return { success: false, code: 'INVALID_DATA', error: 'Medición sin fecha.' };
    const numOrUndef = (val) => (val !== undefined && val !== null && val !== '' && !isNaN(Number(val)) ? Number(val) : undefined);

    const formatted = {
      date: measurement.date,
      weightKg: Number(measurement.weightKg || measurement.weight) || 0,
      bodyFatPercent: numOrUndef(measurement.bodyFatPercent ?? measurement.fatPercent),
      fatMassKg: numOrUndef(measurement.fatMassKg ?? measurement.fatMass),
      fatFreeMass: numOrUndef(measurement.fatFreeMass),
      muscleMassKg: numOrUndef(measurement.muscleMassKg ?? measurement.muscleMass),
      trunkFat: numOrUndef(measurement.trunkFat),
      visceralFat: numOrUndef(measurement.visceralFat),
      waterPercent: numOrUndef(measurement.waterPercent),
      waterLitres: numOrUndef(measurement.waterLitres),
      bmr: numOrUndef(measurement.bmr),
      appendicularLeanIndex: numOrUndef(measurement.appendicularLeanIndex),
      boneMass: numOrUndef(measurement.boneMass),
      waistCircumferenceCm: numOrUndef(measurement.waistCircumferenceCm ?? measurement.waist),
      notes: measurement.notes || undefined,
      source: measurement.source || 'Manual',
      updatedAt: Number(measurement.updatedAt) || Date.now()
    };

    return await this.mutation('measurements:save', formatted);
  }

  async syncCustomWeight(exerciseId, weight, updatedAt = Date.now()) {
    if (!exerciseId || isNaN(Number(weight))) return { success: false, code: 'INVALID_DATA', error: 'Peso inválido.' };
    return await this.mutation('sync:saveCustomWeight', {
      exerciseId,
      weight: Number(weight),
      updatedAt: Number(updatedAt) || Date.now()
    });
  }

  async syncProfile(profile) {
    if (!profile) return { success: false, code: 'INVALID_DATA', error: 'Perfil vacío.' };
    return await this.mutation('profile:save', {
      name: String(profile.name || ''),
      age: Number(profile.age) || 0,
      heightCm: Number(profile.height) || 0,
      targetWeightMin: Number(profile.targetWeightMin) || 0,
      targetWeightMax: Number(profile.targetWeightMax) || 0,
      condition: String(profile.condition || ''),
      startWeight: Number(profile.startWeight) || undefined,
      currentWeight: Number(profile.currentWeight) || undefined,
      skeletalMuscleMass: Number(profile.skeletalMuscleMass) || undefined,
      fatFreeMass: Number(profile.fatFreeMass) || undefined,
      trunkFat: Number(profile.trunkFat) || undefined,
      bodyFatPercent: Number(profile.bodyFatPercent) || undefined,
      fatMassKg: Number(profile.fatMassKg) || undefined,
      visceralFat: Number(profile.visceralFat) || undefined,
      basalMetabolicRate: Number(profile.basalMetabolicRate) || undefined,
      appendicularLeanIndex: Number(profile.appendicularLeanIndex) || undefined,
      waterTargetLitres: Number(profile.waterTargetLitres) || undefined,
      gymSchedule: String(profile.gymSchedule || ''),
      updatedAt: Number(profile.updatedAt) || Date.now()
    });
  }

  // Sincronización masiva (incluye eliminaciones pendientes)
  async syncAllLocalData(workouts, measurements, customWeights = {}, deletions = []) {
    return await this.mutation('sync:bulkSync', {
      workouts: workouts || [],
      measurements: measurements || [],
      customWeights: customWeights || {},
      deletions: deletions || []
    });
  }

  // Descarga paginada de entrenamientos (más recientes primero)
  async fetchCloudWorkouts(before = undefined, limit = 100) {
    const args = { limit };
    if (before !== undefined && before !== null) args.before = before;
    return await this.query('workouts:list', args);
  }

  async fetchAllCloudWorkouts(pageSize = 100) {
    const all = [];
    let before;
    let pages = 0;

    while (pages < 50) {
      pages++;
      const res = await this.fetchCloudWorkouts(before, pageSize);
      if (!res.success || !Array.isArray(res.data) || res.data.length === 0) {
        if (!res.success && all.length === 0) return res;
        break;
      }

      all.push(...res.data);
      if (res.data.length < pageSize) break;

      const oldest = res.data[res.data.length - 1];
      const nextBefore = Number(oldest?.createdAt);
      if (!Number.isFinite(nextBefore) || nextBefore === before) break;
      before = nextBefore;
    }

    return { success: true, data: all };
  }

  async fetchCloudMeasurements() {
    return await this.query('measurements:list', { limit: 500 });
  }

  async fetchCloudCustomWeights() {
    return await this.query('sync:listCustomWeights', {});
  }

  async fetchCloudNutrition() {
    return await this.query('nutrition:list', { limit: 365 });
  }

  async fetchCloudProfile() {
    return await this.query('profile:get', {});
  }
}

export const convex = new ConvexService();
