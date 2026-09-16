// Cliente de Sincronización con Convex Cloud (Local-First)
import { CONFIG } from '../config.js';

class ConvexService {
  constructor() {
    this.baseUrl = CONFIG.CONVEX_URL ? CONFIG.CONVEX_URL.replace(/\/$/, '') : '';
    this.isOnline = navigator.onLine;
    this.lastSyncTime = null;
    this.syncListeners = [];

    // Escuchar cambios de conectividad
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners('online');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners('offline');
    });
  }

  onSyncStatus(callback) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(status, details = null) {
    this.syncListeners.forEach(cb => cb({ status, details, lastSync: this.lastSyncTime, isOnline: this.isOnline }));
  }

  // Llamar a una función de mutación en Convex
  async mutation(path, args = {}) {
    if (!this.baseUrl || !this.isOnline) {
      return { success: false, offline: true, error: 'Sin conexión a internet o Convex URL no configurada' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/mutation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path,
          args,
          format: 'clean_json',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Convex] Error en mutación ${path}:`, errorText);
        return { success: false, status: response.status, error: errorText };
      }

      const result = await response.json();
      this.lastSyncTime = new Date().toISOString();
      this.notifyListeners('synced', { path, result });
      return { success: true, data: result.value !== undefined ? result.value : result };
    } catch (err) {
      console.warn(`[Convex] Excepción en mutación ${path}:`, err);
      return { success: false, error: err.message, offline: !navigator.onLine };
    }
  }

  // Llamar a una función de consulta (query) en Convex
  async query(path, args = {}) {
    if (!this.baseUrl || !this.isOnline) {
      return { success: false, offline: true, error: 'Sin conexión a internet' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path,
          args,
          format: 'clean_json',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Convex] Error en query ${path}:`, errorText);
        return { success: false, status: response.status, error: errorText };
      }

      const result = await response.json();
      return { success: true, data: result.value !== undefined ? result.value : result };
    } catch (err) {
      console.warn(`[Convex] Excepción en query ${path}:`, err);
      return { success: false, error: err.message };
    }
  }

  // --- MÉTODOS DE NEGOCIO KINETIX ---

  // Sincronizar un entrenamiento terminado
  async syncWorkout(session) {
    if (!session) return;
    const formatted = {
      sessionId: session.id || session.sessionId || 'session_' + Date.now(),
      routineId: session.routineId || 'general',
      routineName: session.routineName || 'Sesión',
      dayName: session.dayName || '',
      startTime: session.startTime || new Date().toISOString(),
      endTime: session.endTime || undefined,
      durationMinutes: session.durationMinutes ? Number(session.durationMinutes) : undefined,
      cardioDone: !!session.cardioDone,
      cardioMinutes: session.cardioMinutes ? Number(session.cardioMinutes) : undefined,
      exercises: (session.exercises || []).map(ex => ({
        exerciseId: ex.exerciseId || ex.id || 'unknown',
        exerciseName: ex.exerciseName || ex.name || '',
        isCardio: !!ex.isCardio,
        sets: (ex.sets || []).map(s => ({
          setNumber: Number(s.setNumber) || 1,
          weight: s.weight ?? '',
          reps: s.reps ?? '',
          completed: !!s.completed,
          rpe: s.rpe || undefined,
        })),
        notes: ex.notes || undefined,
      })),
      notes: session.notes || undefined,
    };

    return await this.mutation('workouts:save', formatted);
  }

  // Sincronizar registro de nutrición diario
  async syncNutrition(date, log) {
    if (!date || !log) return;
    const formatted = {
      date,
      medicationTaken: !!log.medicationTaken,
      medicationTime: log.medicationTime || undefined,
      waterMl: Number(log.waterMl) || 0,
      waterGoalMl: Number(log.waterGoalMl) || 3000,
      completedMeals: log.completedMeals || {},
      notes: log.notes || undefined,
    };

    return await this.mutation('nutrition:saveDaily', formatted);
  }

  // Sincronizar nueva medición corporal
  async syncMeasurement(measurement) {
    if (!measurement || !measurement.date) return;
    const formatted = {
      date: measurement.date,
      weightKg: Number(measurement.weightKg) || 0,
      bodyFatPercent: measurement.bodyFatPercent ? Number(measurement.bodyFatPercent) : undefined,
      muscleMassKg: measurement.muscleMassKg ? Number(measurement.muscleMassKg) : undefined,
      visceralFat: measurement.visceralFat ? Number(measurement.visceralFat) : undefined,
      waistCircumferenceCm: measurement.waistCircumferenceCm ? Number(measurement.waistCircumferenceCm) : undefined,
      notes: measurement.notes || undefined,
      source: measurement.source || 'Manual',
    };

    return await this.mutation('measurements:save', formatted);
  }

  // Sincronización masiva de todo el historial local a Convex
  async syncAllLocalData(workouts, measurements) {
    return await this.mutation('sync:bulkSync', {
      workouts: workouts || [],
      measurements: measurements || [],
    });
  }

  // Descargar entrenamientos desde la nube
  async fetchCloudWorkouts() {
    return await this.query('workouts:list', {});
  }

  // Descargar mediciones desde la nube
  async fetchCloudMeasurements() {
    return await this.query('measurements:list', {});
  }
}

export const convex = new ConvexService();
