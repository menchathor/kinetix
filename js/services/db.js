// Servicio de Abstracción de Base de Datos (Local-First + Convex Cloud)
import { INITIAL_DATA } from '../data/initialData.js';
import { convex } from './convex.js';

const KEYS = {
  SETTINGS: 'kinetix_settings',
  WORKOUT_LOGS: 'kinetix_workout_logs',
  ACTIVE_SESSION: 'kinetix_active_session',
  DAILY_NUTRITION: 'kinetix_daily_nutrition',
  MEASUREMENTS: 'kinetix_measurements'
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
        timerDurationSeconds: 90,
        soundEnabled: true,
        vibrationEnabled: true,
        unit: 'lb/placa'
      };
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(defaultSettings));
    }
    // Registro inicial de calibración con las marcas que Michael ya tomó
    const baselineSession = {
      id: 'session_baseline_20260910',
      date: '2026-09-10T18:30:00',
      routineId: 'calibracion_inicial',
      routineName: 'Calibración de Pesos Base',
      notes: 'Sesión de calibración de máquinas en Smart Fit (8-10 reps)',
      exercises: [
        { exerciseId: 'chest_press', exerciseName: 'Press Pecho Máquina', sets: [{ setNumber: 1, weight: 40, reps: 10, completed: true }] },
        { exerciseId: 'pec_deck', exerciseName: 'Mariposa Pectoral (Pec Deck)', sets: [{ setNumber: 1, weight: 47, reps: 10, completed: true }] },
        { exerciseId: 'shoulder_press', exerciseName: 'Press Hombro Máquina', sets: [{ setNumber: 1, weight: 25, reps: 10, completed: true }] },
        { exerciseId: 'lat_pulldown', exerciseName: 'Tracción Lateral Superior', sets: [{ setNumber: 1, weight: 47, reps: 10, completed: true }] },
        { exerciseId: 'lat_pulldown_neutral', exerciseName: 'Tracción Dorsal Fija', sets: [{ setNumber: 1, weight: 40, reps: 10, completed: true }] },
        { exerciseId: 'cable_row', exerciseName: 'Remo Sentado', sets: [{ setNumber: 1, weight: 33, reps: 10, completed: true }] },
        { exerciseId: 'machine_row_supported', exerciseName: 'Remo con Soporte', sets: [{ setNumber: 1, weight: 33, reps: 10, completed: true }] },
        { exerciseId: 'leg_press', exerciseName: 'Prensa de Piernas', sets: [{ setNumber: 1, weight: 75, reps: 10, completed: true }] },
        { exerciseId: 'leg_extension', exerciseName: 'Extensión Pierna', sets: [{ setNumber: 1, weight: 47, reps: 10, completed: true }] },
        { exerciseId: 'leg_curl', exerciseName: 'Contracción Pierna', sets: [{ setNumber: 1, weight: 46, reps: 10, completed: true }] },
        { exerciseId: 'leg_curl_p2', exerciseName: 'Contracción Pierna P2', sets: [{ setNumber: 1, weight: 46, reps: 10, completed: true }] },
        { exerciseId: 'hip_thrust_machine', exerciseName: 'Hip & Glute', sets: [{ setNumber: 1, weight: 89, reps: 10, completed: true }] },
        { exerciseId: 'biceps_cable_curl', exerciseName: 'Bíceps Polea Baja', sets: [{ setNumber: 1, weight: 21, reps: 10, completed: true }] },
        { exerciseId: 'triceps_pushdown', exerciseName: 'Tríceps Polea Alta', sets: [{ setNumber: 1, weight: 18, reps: 10, completed: true }] }
      ]
    };

    // Inicializar o actualizar logs de entrenamiento en localStorage
    let logs = [];
    try {
      logs = JSON.parse(localStorage.getItem(KEYS.WORKOUT_LOGS)) || [];
    } catch {
      logs = [];
    }

    if (logs.length === 0) {
      localStorage.setItem(KEYS.WORKOUT_LOGS, JSON.stringify([baselineSession]));
    } else {
      const baseIdx = logs.findIndex(l => l.id === 'session_baseline_20260910');
      if (baseIdx >= 0) {
        baselineSession.exercises.forEach(newEx => {
          const existingEx = logs[baseIdx].exercises.find(e => e.exerciseId === newEx.exerciseId);
          if (!existingEx) {
            logs[baseIdx].exercises.push(newEx);
          } else if (newEx.exerciseId === 'leg_curl' || newEx.exerciseId === 'leg_curl_p2') {
            existingEx.sets[0].weight = 46;
          }
        });
        localStorage.setItem(KEYS.WORKOUT_LOGS, JSON.stringify(logs));
      }
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

    // Sincronizar en segundo plano con Convex Cloud
    convex.syncWorkout(session).catch(err => {
      console.warn('[Convex] Error sincronizando entrenamiento:', err);
    });

    return session;
  }

  deleteWorkoutSession(sessionId) {
    let logs = this.getWorkoutLogs();
    logs = logs.filter(l => l.id !== sessionId);
    localStorage.setItem(KEYS.WORKOUT_LOGS, JSON.stringify(logs));

    // Eliminar en Convex Cloud
    convex.mutation('workouts:deleteSession', { sessionId }).catch(err => {
      console.warn('[Convex] Error eliminando entrenamiento en la nube:', err);
    });
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
    const today = data.date || new Date().toISOString().split('T')[0];
    convex.syncNutrition(today, data).catch(err => {
      console.warn('[Convex] Error sincronizando nutrición:', err);
    });
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
    convex.syncMeasurement(measurement).catch(err => {
      console.warn('[Convex] Error sincronizando medición:', err);
    });
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

  // Sincronizar todo el historial local a Convex Cloud
  async syncAllToConvex() {
    const workouts = this.getWorkoutLogs();
    const measurements = this.getMeasurements();
    return await convex.syncAllLocalData(workouts, measurements);
  }

  // Descargar y fusionar datos desde Convex Cloud hacia localStorage
  async pullFromConvex() {
    try {
      const [cloudWorkoutsRes, cloudMeasRes] = await Promise.all([
        convex.fetchCloudWorkouts(),
        convex.fetchCloudMeasurements()
      ]);

      let importedWorkouts = 0;
      let importedMeas = 0;

      if (cloudWorkoutsRes.success && Array.isArray(cloudWorkoutsRes.data)) {
        const localLogs = this.getWorkoutLogs();
        const localIds = new Set(localLogs.map(l => l.id || l.sessionId));
        
        for (const cw of cloudWorkoutsRes.data) {
          const id = cw.sessionId || cw.id;
          if (!localIds.has(id)) {
            localLogs.push(cw);
            importedWorkouts++;
          }
        }
        localStorage.setItem(KEYS.WORKOUT_LOGS, JSON.stringify(localLogs));
      }

      if (cloudMeasRes.success && Array.isArray(cloudMeasRes.data)) {
        const localMeas = this.getMeasurements();
        const localDates = new Set(localMeas.map(m => m.date));

        for (const cm of cloudMeasRes.data) {
          if (!localDates.has(cm.date)) {
            localMeas.push(cm);
            importedMeas++;
          }
        }
        localMeas.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        localStorage.setItem(KEYS.MEASUREMENTS, JSON.stringify(localMeas));
      }

      return { success: true, importedWorkouts, importedMeas };
    } catch (err) {
      console.warn('[Convex] Error al restaurar desde la nube:', err);
      return { success: false, error: err.message };
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
