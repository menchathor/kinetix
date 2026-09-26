// Servicio de Abstracción de Base de Datos (Local-First + Convex Cloud)
import { INITIAL_DATA } from '../data/initialData.js';
import { convex } from './convex.js';

const KEYS = {
  SETTINGS: 'kinetix_settings',
  WORKOUT_LOGS: 'kinetix_workout_logs',
  ACTIVE_SESSION: 'kinetix_active_session',
  DAILY_NUTRITION: 'kinetix_daily_nutrition',
  MEASUREMENTS: 'kinetix_measurements',
  CUSTOM_WEIGHTS: 'kinetix_custom_weights'
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
      logs = [baselineSession];
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

    // Migración transparente de datos previos con clave 'smartfit_*'
    try {
      const legacyWorkoutRaw = localStorage.getItem('smartfit_workout_logs');
      if (legacyWorkoutRaw) {
        const oldLogs = JSON.parse(legacyWorkoutRaw) || [];
        if (oldLogs.length > 0) {
          const currentIds = new Set(logs.map(l => l.id || l.sessionId));
          let migrated = 0;
          for (const oldLog of oldLogs) {
            const id = oldLog.id || oldLog.sessionId;
            if (id && !currentIds.has(id)) {
              logs.push(oldLog);
              migrated++;
            }
          }
          if (migrated > 0) {
            logs.sort((a, b) => new Date(b.date || b.startTime || 0) - new Date(a.date || a.startTime || 0));
            localStorage.setItem(KEYS.WORKOUT_LOGS, JSON.stringify(logs));
            console.log(`[DB] Migrados con éxito ${migrated} entrenamientos desde smartfit_workout_logs`);
          }
        }
      }
      if (localStorage.getItem('smartfit_measurements') && !localStorage.getItem(KEYS.MEASUREMENTS)) {
        localStorage.setItem(KEYS.MEASUREMENTS, localStorage.getItem('smartfit_measurements'));
      }
      if (localStorage.getItem('smartfit_active_session') && !localStorage.getItem(KEYS.ACTIVE_SESSION)) {
        localStorage.setItem(KEYS.ACTIVE_SESSION, localStorage.getItem('smartfit_active_session'));
      }
    } catch (migErr) {
      console.warn('[DB] Nota en migración legacy:', migErr);
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

  // --- GESTIÓN DE PESOS BASE PERSONALIZADOS & BITÁCORA ---
  getCustomWeights() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.CUSTOM_WEIGHTS)) || {};
    } catch {
      return {};
    }
  }

  getCustomWeight(exerciseId) {
    const weights = this.getCustomWeights();
    return weights[exerciseId] !== undefined ? weights[exerciseId] : null;
  }

  setCustomWeight(exerciseId, weight) {
    const weights = this.getCustomWeights();
    weights[exerciseId] = Number(weight) || 0;
    localStorage.setItem(KEYS.CUSTOM_WEIGHTS, JSON.stringify(weights));
    return weights;
  }

  // Obtener estadísticas de evolución y bitácora para un ejercicio específico
  getExerciseEvolutionStats(exerciseId) {
    const logs = this.getWorkoutLogs();
    const customWeights = this.getCustomWeights();
    let baselineWeight = null;
    let prWeight = 0;
    let prDate = null;
    let latestWeight = null;
    let latestDate = null;
    let totalCompletedSets = 0;
    let totalSessions = 0;
    const history = [];

    // Recorrer los entrenamientos cronológicamente (del más antiguo al más reciente)
    const chronologicalLogs = [...logs].reverse();

    for (const session of chronologicalLogs) {
      if (!session.exercises || !Array.isArray(session.exercises)) continue;
      const ex = session.exercises.find(e => e.exerciseId === exerciseId);
      if (!ex || !ex.sets || ex.sets.length === 0) continue;

      const validSets = ex.sets.filter(s => s.completed);
      if (validSets.length > 0) {
        totalSessions++;
        totalCompletedSets += validSets.length;
        const maxSetWeight = Math.max(...validSets.map(s => Number(s.weight) || 0));

        if (baselineWeight === null && maxSetWeight > 0) {
          baselineWeight = maxSetWeight;
        }

        if (maxSetWeight > prWeight) {
          prWeight = maxSetWeight;
          prDate = session.date || session.startTime;
        }

        latestWeight = maxSetWeight;
        latestDate = session.date || session.startTime;

        history.push({
          date: session.date || session.startTime,
          routineName: session.routineName || 'Sesión',
          sets: validSets.map(s => ({
            setNumber: s.setNumber,
            weight: Number(s.weight) || 0,
            reps: Number(s.reps) || 0,
            completed: s.completed,
            rpe: s.rpe || ''
          })),
          bestWeight: maxSetWeight
        });
      }
    }

    // Si aún no hay baseline en sesiones, buscar en initialData
    if (baselineWeight === null || baselineWeight === 0) {
      for (const r of Object.values(INITIAL_DATA.routines)) {
        const found = r.exercises?.find(e => e.id === exerciseId);
        if (found && !isNaN(Number(found.baseWeight))) {
          baselineWeight = Number(found.baseWeight);
          break;
        }
      }
    }

    const configuredTarget = customWeights[exerciseId];
    const currentWeight = configuredTarget !== undefined 
      ? configuredTarget 
      : (latestWeight || baselineWeight || 0);

    const effectivePr = Math.max(prWeight, currentWeight, baselineWeight || 0);
    const base = baselineWeight || currentWeight || 0;
    const progressKg = base > 0 ? (effectivePr - base) : 0;
    const progressPercent = base > 0 ? Math.round(((effectivePr - base) / base) * 100) : 0;

    return {
      exerciseId,
      baselineWeight: base,
      targetWeight: currentWeight,
      prWeight: effectivePr,
      prDate,
      latestWeight,
      latestDate,
      totalSessions,
      totalCompletedSets,
      progressKg,
      progressPercent,
      history: history.reverse() // Más reciente primero para la UI
    };
  }

  // Obtener consolidado de todas las variantes de fuerza del programa
  getAllExercisesAnalytics() {
    const uniqueExercisesMap = new Map();

    Object.values(INITIAL_DATA.routines).forEach(routine => {
      (routine.exercises || []).forEach(ex => {
        if (!ex.isCardio && !uniqueExercisesMap.has(ex.id)) {
          uniqueExercisesMap.set(ex.id, {
            ...ex,
            routineId: routine.id,
            routineName: routine.name,
            dayName: routine.dayName
          });
        }
      });
    });

    const results = [];
    uniqueExercisesMap.forEach((def, id) => {
      const stats = this.getExerciseEvolutionStats(id);
      results.push({
        ...def,
        stats
      });
    });

    return results;
  }

  // --- EXPORTAR E IMPORTAR DATOS (BACKUP) ---
  exportAllData() {
    const exportData = {
      version: '1.7',
      exportDate: new Date().toISOString(),
      profile: INITIAL_DATA.profile,
      settings: this.getSettings(),
      customWeights: this.getCustomWeights(),
      workoutLogs: this.getWorkoutLogs(),
      measurements: this.getMeasurements()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kinetix_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.workoutLogs) localStorage.setItem(KEYS.WORKOUT_LOGS, JSON.stringify(data.workoutLogs));
      if (data.measurements) localStorage.setItem(KEYS.MEASUREMENTS, JSON.stringify(data.measurements));
      if (data.settings) localStorage.setItem(KEYS.SETTINGS, JSON.stringify(data.settings));
      if (data.customWeights) localStorage.setItem(KEYS.CUSTOM_WEIGHTS, JSON.stringify(data.customWeights));
      return { success: true, count: data.workoutLogs?.length || 0 };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

export const db = new StorageService();
