// Servicio de Abstracción de Base de Datos (Local-First + Cloud Ready)
import { INITIAL_DATA } from '../data/initialData.js';

const KEYS = {
  SETTINGS: 'smartfit_settings',
  WORKOUT_LOGS: 'smartfit_workout_logs',
  ACTIVE_SESSION: 'smartfit_active_session',
  DAILY_NUTRITION: 'smartfit_daily_nutrition',
  MEASUREMENTS: 'smartfit_measurements'
};

export class StorageService {
  constructor() {
    this.init();
  }

  init() {
    // Inicializar mediciones si no existen
    if (!localStorage.getItem(KEYS.MEASUREMENTS)) {
      localStorage.setItem(KEYS.MEASUREMENTS, JSON.stringify(INITIAL_DATA.measurementsHistory));
    }
    // Inicializar settings
    if (!localStorage.getItem(KEYS.SETTINGS)) {
      const defaultSettings = {
        cloudProvider: 'none', // 'none' | 'supabase' | 'firebase'
        supabaseUrl: '',
        supabaseKey: '',
        firebaseConfig: '',
        timerDurationSeconds: 90,
        soundEnabled: true,
        vibrationEnabled: true,
        unit: 'lb/placa'
      };
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(defaultSettings));
    }
    // Inicializar logs de entrenamiento si no existen
    if (!localStorage.getItem(KEYS.WORKOUT_LOGS)) {
      // Registro inicial de calibración con las marcas que Michael ya tomó
      const baselineSession = {
        id: 'session_baseline_20260910',
        date: '2026-09-10T18:30:00',
        routineId: 'calibracion_inicial',
        routineName: 'Calibración de Pesos Base',
        notes: 'Primera sesión de calibración de máquinas en Smart Fit (8-10 reps)',
        exercises: [
          { exerciseId: 'chest_press', exerciseName: 'Press Pecho Máquina', sets: [{ setNumber: 1, weight: 40, reps: 10, completed: true }] },
          { exerciseId: 'pec_deck', exerciseName: 'Mariposa Pectoral (Pec Deck)', sets: [{ setNumber: 1, weight: 47, reps: 10, completed: true }] },
          { exerciseId: 'shoulder_press', exerciseName: 'Press Hombro Máquina', sets: [{ setNumber: 1, weight: 25, reps: 10, completed: true }] },
          { exerciseId: 'leg_press', exerciseName: 'Prensa de Piernas', sets: [{ setNumber: 1, weight: 75, reps: 10, completed: true }] },
          { exerciseId: 'leg_extension', exerciseName: 'Extensión Pierna', sets: [{ setNumber: 1, weight: 47, reps: 10, completed: true }] },
          { exerciseId: 'leg_curl', exerciseName: 'Curl Femoral (Contracción)', sets: [{ setNumber: 1, weight: 40, reps: 10, completed: true }] },
          { exerciseId: 'biceps_cable_curl', exerciseName: 'Bíceps Polea Baja', sets: [{ setNumber: 1, weight: 21, reps: 10, completed: true }] },
          { exerciseId: 'triceps_pushdown', exerciseName: 'Tríceps Polea Alta', sets: [{ setNumber: 1, weight: 18, reps: 10, completed: true }] }
        ]
      };
      localStorage.setItem(KEYS.WORKOUT_LOGS, JSON.stringify([baselineSession]));
    }
  }

  // --- ENTRENAMIENTOS ---
  getWorkoutLogs() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.WORKOUT_LOGS)) || [];
    } catch {
      return [];
    }
  }

  saveWorkoutSession(session) {
    const logs = this.getWorkoutLogs();
    // Generar ID si no existe
    if (!session.id) {
      session.id = 'session_' + Date.now();
    }
    // Reemplazar si ya existía o agregar al inicio
    const index = logs.findIndex(l => l.id === session.id);
    if (index >= 0) {
      logs[index] = session;
    } else {
      logs.unshift(session);
    }
    localStorage.setItem(KEYS.WORKOUT_LOGS, JSON.stringify(logs));
    this.clearActiveSession();

    // Intentar sincronizar con nube si está configurada
    this.syncToCloud('workout', session);
    return session;
  }

  deleteWorkoutSession(sessionId) {
    let logs = this.getWorkoutLogs();
    logs = logs.filter(l => l.id !== sessionId);
    localStorage.setItem(KEYS.WORKOUT_LOGS, JSON.stringify(logs));
  }

  // Obtener el último registro de un ejercicio específico para mostrar referencia previa
  getLastExerciseLog(exerciseId) {
    const logs = this.getWorkoutLogs();
    for (const session of logs) {
      if (session.exercises && Array.isArray(session.exercises)) {
        const found = session.exercises.find(e => e.exerciseId === exerciseId);
        if (found && found.sets && found.sets.length > 0) {
          // Obtener el mejor set o el último completado
          const validSets = found.sets.filter(s => s.completed);
          if (validSets.length > 0) {
            return {
              date: session.date,
              sets: validSets,
              bestWeight: Math.max(...validSets.map(s => Number(s.weight) || 0)),
              bestReps: Math.max(...validSets.map(s => Number(s.reps) || 0))
            };
          }
        }
      }
    }
    return null;
  }

  // --- SESIÓN ACTIVA (Borrador en vivo durante el entreno) ---
  getActiveSession() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.ACTIVE_SESSION));
    } catch {
      return null;
    }
  }

  saveActiveSession(session) {
    localStorage.setItem(KEYS.ACTIVE_SESSION, JSON.stringify(session));
  }

  clearActiveSession() {
    localStorage.removeItem(KEYS.ACTIVE_SESSION);
  }

  // --- NUTRICIÓN & HÁBITOS DIARIOS ---
  getTodayNutritionKey() {
    const today = new Date().toISOString().split('T')[0];
    return `${KEYS.DAILY_NUTRITION}_${today}`;
  }

  getTodayNutrition() {
    const key = this.getTodayNutritionKey();
    try {
      return JSON.parse(localStorage.getItem(key)) || {
        date: new Date().toISOString().split('T')[0],
        medicationTaken: false,
        waterMl: 0,
        completedMeals: {},
        notes: ''
      };
    } catch {
      return {
        date: new Date().toISOString().split('T')[0],
        medicationTaken: false,
        waterMl: 0,
        completedMeals: {},
        notes: ''
      };
    }
  }

  saveTodayNutrition(data) {
    const key = this.getTodayNutritionKey();
    localStorage.setItem(key, JSON.stringify(data));
  }

  // --- MEDICIONES CORPORALES ---
  getMeasurements() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.MEASUREMENTS)) || [];
    } catch {
      return [];
    }
  }

  addMeasurement(measurement) {
    const list = this.getMeasurements();
    measurement.id = 'meas_' + Date.now();
    list.unshift(measurement);
    localStorage.setItem(KEYS.MEASUREMENTS, JSON.stringify(list));
    this.syncToCloud('measurement', measurement);
    return measurement;
  }

  // --- CONFIGURACIÓN & CLOUD ---
  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.SETTINGS)) || {};
    } catch {
      return {};
    }
  }

  saveSettings(settings) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }

  // Sincronización en segundo plano con Supabase / Firebase
  async syncToCloud(type, payload) {
    const settings = this.getSettings();
    if (settings.cloudProvider === 'supabase' && settings.supabaseUrl && settings.supabaseKey) {
      try {
        // Enviar a Endpoint REST de Supabase directamente vía fetch
        const table = type === 'workout' ? 'workouts' : 'measurements';
        const url = `${settings.supabaseUrl}/rest/v1/${table}`;
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': settings.supabaseKey,
            'Authorization': `Bearer ${settings.supabaseKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(payload)
        });
        console.log(`[Cloud Sync] Sincronizado ${type} en Supabase`);
      } catch (err) {
        console.warn(`[Cloud Sync] Error sincronizando a Supabase (offline):`, err);
      }
    }
  }

  // --- EXPORTAR E IMPORTAR DATOS (BACKUP) ---
  exportAllData() {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      profile: INITIAL_DATA.profile,
      settings: this.getSettings(),
      workoutLogs: this.getWorkoutLogs(),
      measurements: this.getMeasurements()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartfit_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.workoutLogs) localStorage.setItem(KEYS.WORKOUT_LOGS, JSON.stringify(data.workoutLogs));
      if (data.measurements) localStorage.setItem(KEYS.MEASUREMENTS, JSON.stringify(data.measurements));
      if (data.settings) localStorage.setItem(KEYS.SETTINGS, JSON.stringify(data.settings));
      return { success: true, count: data.workoutLogs?.length || 0 };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

export const db = new StorageService();
