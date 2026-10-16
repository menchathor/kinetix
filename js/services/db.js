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

// Utilidad universal para formateo de fechas evitando desfases UTC/zona horaria
export function formatDisplayDate(dateOrSession, options = {}) {
  let val = dateOrSession;
  if (dateOrSession && typeof dateOrSession === 'object') {
    val = dateOrSession.startTime || dateOrSession.date;
  }
  if (!val) return '';

  // Si es un string YYYY-MM-DD puro sin hora, new Date("YYYY-MM-DD") se parsea en UTC
  // y en zonas horarias negativas (ej. Chile UTC-3) resta 1 día.
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-').map(Number);
    const localNoon = new Date(y, m - 1, d, 12, 0, 0);
    return localNoon.toLocaleDateString('es-CL', options);
  }

  const dateObj = new Date(val);
  if (isNaN(dateObj.getTime())) return String(val);
  return dateObj.toLocaleDateString('es-CL', options);
}

export class StorageService {
  constructor() {
    this.init();
  }

  init() {
    // Inicializar o actualizar mediciones en localStorage
    let measurements = [];
    try {
      measurements = JSON.parse(localStorage.getItem(KEYS.MEASUREMENTS)) || [];
    } catch {
      measurements = [];
    }
    const existingDates = new Set(measurements.map(m => m.date));
    let measUpdated = false;
    for (const initM of INITIAL_DATA.measurementsHistory) {
      if (!existingDates.has(initM.date)) {
        measurements.push(initM);
        measUpdated = true;
      }
    }
    if (measUpdated || !localStorage.getItem(KEYS.MEASUREMENTS)) {
      measurements.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      localStorage.setItem(KEYS.MEASUREMENTS, JSON.stringify(measurements));
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
      sessionId: 'session_baseline_20260910',
      date: '2026-09-10T18:30:00',
      startTime: '2026-09-10T18:30:00.000Z',
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
      const logs = JSON.parse(localStorage.getItem(KEYS.WORKOUT_LOGS)) || [];
      return logs.map(l => {
        const startTime = l.startTime || (l.date ? (l.date.includes('T') ? l.date : l.date + 'T18:00:00.000Z') : '');
        let date = l.date;
        if (!date && startTime) {
          const d = new Date(startTime);
          date = !isNaN(d.getTime()) ? d.toLocaleDateString('en-CA') : startTime.split('T')[0];
        }
        return {
          ...l,
          id: l.id || l.sessionId,
          sessionId: l.sessionId || l.id,
          date: date || '',
          startTime: startTime || ''
        };
      });
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
    if (!session.sessionId) {
      session.sessionId = session.id;
    }
    if (!session.startTime) {
      session.startTime = session.date && session.date.includes('T') ? session.date : new Date().toISOString();
    }
    if (!session.date) {
      const d = new Date(session.startTime);
      session.date = !isNaN(d.getTime()) ? d.toLocaleDateString('en-CA') : new Date().toLocaleDateString('en-CA');
    }
    // Reemplazar si ya existía o agregar al inicio
    const index = logs.findIndex(l => (l.id === session.id || l.sessionId === session.id));
    if (index >= 0) {
      logs[index] = session;
    } else {
      logs.unshift(session);
    }
    logs.sort((a, b) => new Date(b.startTime || b.date || 0) - new Date(a.startTime || a.date || 0));
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
    const today = new Date().toLocaleDateString('en-CA');
    return `${KEYS.DAILY_NUTRITION}_${today}`;
  }

  getTodayNutrition() {
    const key = this.getTodayNutritionKey();
    const today = new Date().toLocaleDateString('en-CA');
    try {
      return JSON.parse(localStorage.getItem(key)) || {
        date: today,
        medicationTaken: false,
        waterMl: 0,
        completedMeals: {},
        notes: ''
      };
    } catch {
      return {
        date: today,
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
    const today = data.date || new Date().toLocaleDateString('en-CA');
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
    measurement.id = measurement.id || 'meas_' + Date.now();
    const existingIdx = list.findIndex(m => m.date === measurement.date);
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...measurement };
    } else {
      list.unshift(measurement);
    }
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    localStorage.setItem(KEYS.MEASUREMENTS, JSON.stringify(list));
    convex.syncMeasurement(measurement).catch(err => {
      console.warn('[Convex] Error sincronizando medición:', err);
    });
    return measurement;
  }

  deleteMeasurement(date) {
    let list = this.getMeasurements();
    list = list.filter(m => m.date !== date);
    localStorage.setItem(KEYS.MEASUREMENTS, JSON.stringify(list));
    convex.mutation('measurements:deleteMeasurement', { date }).catch(err => {
      console.warn('[Convex] Error eliminando medición en la nube:', err);
    });
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

  // Sincronización bidireccional completa (Local-First: Push + Pull + Normalización)
  async syncTwoWay(options = {}) {
    if (!navigator.onLine) {
      return { success: false, offline: true, error: 'Sin conexión a internet' };
    }

    try {
      // 1. Obtener datos locales actuales
      const localWorkouts = this.getWorkoutLogs();
      const localMeas = this.getMeasurements();
      const localCustomWeights = this.getCustomWeights();

      // 2. Subir datos locales a Convex Cloud (Push preventivo)
      let pushRes = null;
      try {
        pushRes = await convex.syncAllLocalData(localWorkouts, localMeas, localCustomWeights);
      } catch (pushErr) {
        console.warn('[DB] Advertencia al subir datos locales a Convex:', pushErr);
      }

      // 3. Descargar todo el historial desde Convex Cloud (Pull)
      const [cloudWorkoutsRes, cloudMeasRes, cloudCustomWeightsRes] = await Promise.all([
        convex.fetchCloudWorkouts(),
        convex.fetchCloudMeasurements(),
        convex.fetchCloudCustomWeights()
      ]);

      let importedWorkouts = 0;
      let importedMeas = 0;
      let importedWeights = 0;

      // 4. Fusionar y normalizar entrenamientos
      if (cloudWorkoutsRes.success && Array.isArray(cloudWorkoutsRes.data)) {
        const workoutMap = new Map();

        // Registrar existentes locales
        for (const lw of localWorkouts) {
          const key = lw.id || lw.sessionId;
          if (key) {
            const startTime = lw.startTime || (lw.date ? (lw.date.includes('T') ? lw.date : lw.date + 'T18:00:00.000Z') : '');
            let date = lw.date;
            if ((!date || /^\d{4}-\d{2}-\d{2}$/.test(date)) && startTime) {
              const d = new Date(startTime);
              if (!isNaN(d.getTime())) date = d.toLocaleDateString('en-CA');
            }
            workoutMap.set(key, {
              ...lw,
              id: key,
              sessionId: key,
              date: date || '',
              startTime: startTime || ''
            });
          }
        }

        // Fusionar con los de Convex Cloud
        for (const cw of cloudWorkoutsRes.data) {
          const key = cw.sessionId || cw.id;
          if (!key) continue;

          const isNew = !workoutMap.has(key);
          if (isNew) importedWorkouts++;

          const existing = workoutMap.get(key) || {};
          const startTime = cw.startTime || existing.startTime || (cw.date ? (cw.date.includes('T') ? cw.date : cw.date + 'T18:00:00.000Z') : new Date().toISOString());
          const d = new Date(startTime);
          const localDateStr = !isNaN(d.getTime()) ? d.toLocaleDateString('en-CA') : '';
          const date = localDateStr || cw.date || existing.date || new Date().toLocaleDateString('en-CA');

          const normalized = {
            ...existing,
            ...cw,
            id: key,
            sessionId: key,
            date,
            startTime
          };

          workoutMap.set(key, normalized);
        }

        // Ordenar cronológicamente descendente (más reciente primero por timestamp exacto)
        const mergedWorkouts = Array.from(workoutMap.values());
        mergedWorkouts.sort((a, b) => new Date(b.startTime || b.date || 0) - new Date(a.startTime || a.date || 0));
        localStorage.setItem(KEYS.WORKOUT_LOGS, JSON.stringify(mergedWorkouts));
      }

      // 5. Fusionar y normalizar mediciones (incluyendo bioimpedancia completa)
      if (cloudMeasRes.success && Array.isArray(cloudMeasRes.data)) {
        const measMap = new Map();

        for (const lm of localMeas) {
          if (lm.date) measMap.set(lm.date, lm);
        }

        for (const cm of cloudMeasRes.data) {
          if (!cm.date) continue;
          const isNew = !measMap.has(cm.date);
          if (isNew) importedMeas++;

          const existing = measMap.get(cm.date) || {};
          const normalized = {
            ...existing,
            ...cm,
            weight: cm.weight !== undefined && cm.weight > 0 ? cm.weight : (cm.weightKg || existing.weight || 0),
            weightKg: cm.weightKg !== undefined && cm.weightKg > 0 ? cm.weightKg : (cm.weight || existing.weightKg || 0),
            fatPercent: cm.bodyFatPercent ?? cm.fatPercent ?? existing.fatPercent ?? existing.bodyFatPercent,
            bodyFatPercent: cm.bodyFatPercent ?? cm.fatPercent ?? existing.bodyFatPercent ?? existing.fatPercent,
            fatMass: cm.fatMassKg ?? cm.fatMass ?? existing.fatMass ?? existing.fatMassKg,
            fatMassKg: cm.fatMassKg ?? cm.fatMass ?? existing.fatMassKg ?? existing.fatMass,
            fatFreeMass: cm.fatFreeMass ?? existing.fatFreeMass,
            muscleMass: cm.muscleMass !== undefined ? cm.muscleMass : (cm.muscleMassKg ?? existing.muscleMass),
            muscleMassKg: cm.muscleMassKg !== undefined ? cm.muscleMassKg : (cm.muscleMass ?? existing.muscleMassKg),
            trunkFat: cm.trunkFat ?? existing.trunkFat,
            visceralFat: cm.visceralFat !== undefined ? cm.visceralFat : (existing.visceralFat || 0),
            waterPercent: cm.waterPercent ?? existing.waterPercent,
            waterLitres: cm.waterLitres ?? existing.waterLitres,
            bmr: cm.bmr ?? existing.bmr,
            waistCircumferenceCm: cm.waistCircumferenceCm ?? existing.waistCircumferenceCm,
            source: cm.source || existing.source || 'Manual'
          };

          measMap.set(cm.date, normalized);
        }

        const mergedMeas = Array.from(measMap.values());
        mergedMeas.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        localStorage.setItem(KEYS.MEASUREMENTS, JSON.stringify(mergedMeas));
      }

      // 6. Fusionar pesos base personalizados (customWeights)
      if (cloudCustomWeightsRes && cloudCustomWeightsRes.success && cloudCustomWeightsRes.data && typeof cloudCustomWeightsRes.data === 'object') {
        const mergedWeights = { ...localCustomWeights };
        for (const [exId, wVal] of Object.entries(cloudCustomWeightsRes.data)) {
          const numW = Number(wVal);
          if (!isNaN(numW) && numW > 0) {
            if (mergedWeights[exId] === undefined) importedWeights++;
            mergedWeights[exId] = numW;
          }
        }
        localStorage.setItem(KEYS.CUSTOM_WEIGHTS, JSON.stringify(mergedWeights));
      }

      const totalWorkouts = this.getWorkoutLogs().length;
      const totalMeas = this.getMeasurements().length;

      return {
        success: true,
        uploadedWorkouts: pushRes?.data?.workoutsSynced ?? 0,
        uploadedMeas: pushRes?.data?.measurementsSynced ?? 0,
        importedWorkouts,
        importedMeas,
        importedWeights,
        totalWorkouts,
        totalMeas
      };
    } catch (err) {
      console.warn('[DB] Error en sincronización bidireccional:', err);
      return { success: false, error: err.message };
    }
  }

  // Compatibilidad con llamadas previas
  async syncAllToConvex() {
    return await this.syncTwoWay();
  }

  async pullFromConvex() {
    return await this.syncTwoWay();
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
    const numericWeight = Number(weight) || 0;
    weights[exerciseId] = numericWeight;
    localStorage.setItem(KEYS.CUSTOM_WEIGHTS, JSON.stringify(weights));

    // Sincronizar con Convex Cloud en segundo plano
    convex.syncCustomWeight(exerciseId, numericWeight).catch(err => {
      console.warn('[Convex] Error sincronizando peso personalizado:', err);
    });

    return weights;
  }

  // Sugerencia inteligente de sobrecarga progresiva ("Smart Coach")
  getProgressiveOverloadSuggestion(exerciseDef) {
    if (!exerciseDef || exerciseDef.isCardio) return null;
    const exerciseId = exerciseDef.id || exerciseDef.exerciseId;
    if (!exerciseId) return null;

    const prevLog = this.getLastExerciseLog(exerciseId);
    if (!prevLog || !prevLog.sets || prevLog.sets.length === 0) return null;

    // Parsear el rango de repeticiones objetivo (ej. "8-10" -> min 8, max 10)
    const repsStr = String(exerciseDef.defaultReps || '8-10');
    const parts = repsStr.match(/\d+/g);
    if (!parts || parts.length === 0) return null;
    const minTargetReps = parseInt(parts[0], 10);
    const maxTargetReps = parts.length > 1 ? parseInt(parts[1], 10) : minTargetReps;

    const customW = this.getCustomWeight(exerciseId);
    const defaultBaseW = Number(exerciseDef.baseWeight) || 0;
    const currentTargetWeight = customW !== null ? Number(customW) : (prevLog.bestWeight || defaultBaseW);

    if (!currentTargetWeight || currentTargetWeight <= 0) return null;

    // Verificar si en la última sesión alcanzó o superó el tope de repeticiones con al menos el peso objetivo actual
    const setsAtTargetWeight = prevLog.sets.filter(s => s.completed && (Number(s.weight) || 0) >= currentTargetWeight);
    if (setsAtTargetWeight.length === 0) return null;

    const bestRepsAtWeight = Math.max(...setsAtTargetWeight.map(s => Number(s.reps) || 0));
    const allSetsMetMin = setsAtTargetWeight.every(s => (Number(s.reps) || 0) >= minTargetReps);

    if (bestRepsAtWeight >= maxTargetReps && allSetsMetMin) {
      // Determinar incremento sugerido (+5 lb para compuestos/pierna/espalda/pecho, +2.5 lb para aislamiento/brazos/hombros)
      const smallIncrementIds = new Set([
        'shoulder_press', 'shoulder_press_t2', 'lateral_raise_machine',
        'rear_delt_face_pull', 'biceps_cable_curl', 'biceps_curl_t2',
        'triceps_pushdown', 'triceps_extension_t2', 'ab_crunch_machine'
      ]);
      const increment = smallIncrementIds.has(exerciseId) ? 2.5 : 5;
      const nextWeight = Math.round((currentTargetWeight + increment) * 10) / 10;

      return {
        shouldUpgrade: true,
        exerciseId,
        previousWeight: prevLog.bestWeight,
        previousReps: bestRepsAtWeight,
        targetRepRange: repsStr,
        currentTargetWeight,
        increment,
        nextWeight
      };
    }

    return null;
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
          prDate = session.startTime || session.date;
        }

        latestWeight = maxSetWeight;
        latestDate = session.startTime || session.date;

        history.push({
          date: session.startTime || session.date,
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
      version: '1.13',
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
