// Servicio de persistencia Local-First.
// - localStorage es la fuente rápida (lecturas sincrónicas para la UI).
// - IndexedDB guarda un espejo de recuperación ante desalojo/cuota.
// - Convex sincroniza con merge por updatedAt y tombstones de eliminación.
import { INITIAL_DATA } from '../data/initialData.js';
import { convex } from './convex.js';
import {
  mergeWorkouts,
  mergeMeasurements,
  mergeCustomWeights,
  mergeNutrition,
  normalizeWorkout,
  normalizeMeasurement,
  normalizeCustomWeight,
  pruneTombstones,
  workoutVersion,
  toTimestamp
} from './merge.js';

const KEYS = {
  SETTINGS: 'kinetix_settings',
  WORKOUT_LOGS: 'kinetix_workout_logs',
  ACTIVE_SESSION: 'kinetix_active_session',
  DAILY_NUTRITION: 'kinetix_daily_nutrition',
  MEASUREMENTS: 'kinetix_measurements',
  CUSTOM_WEIGHTS: 'kinetix_custom_weights',
  PROFILE: 'kinetix_profile',
  TOMBSTONES: 'kinetix_tombstones',
  SEED_FLAG: 'kinetix_seed_version',
  THEME: 'kinetix_theme'
};

const SEED_VERSION = '2';
const NUTRITION_PREFIX = `${KEYS.DAILY_NUTRITION}_`;
const IDB_NAME = 'kinetix-db';
const IDB_STORE = 'kv';
const IDB_SNAPSHOT_KEY = 'snapshot';

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

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn('[DB] No se pudo escribir en localStorage:', err?.name || err);
    return false;
  }
}

export class StorageService {
  constructor() {
    this.mirrorTimer = null;
    this.init();
    this.setupPersistence();
  }

  init() {
    // Migración transparente de datos previos con clave 'smartfit_*'
    try {
      const legacyWorkoutRaw = localStorage.getItem('smartfit_workout_logs');
      if (legacyWorkoutRaw && !localStorage.getItem(KEYS.WORKOUT_LOGS)) {
        localStorage.setItem(KEYS.WORKOUT_LOGS, legacyWorkoutRaw);
      }
      if (localStorage.getItem('smartfit_measurements') && !localStorage.getItem(KEYS.MEASUREMENTS)) {
        localStorage.setItem(KEYS.MEASUREMENTS, localStorage.getItem('smartfit_measurements'));
      }
      if (localStorage.getItem('smartfit_active_session') && !localStorage.getItem(KEYS.ACTIVE_SESSION)) {
        localStorage.setItem(KEYS.ACTIVE_SESSION, localStorage.getItem('smartfit_active_session'));
      }
      const legacyTheme = localStorage.getItem('smartfit_theme');
      if (legacyTheme && !localStorage.getItem(KEYS.THEME)) {
        localStorage.setItem(KEYS.THEME, legacyTheme);
      }
    } catch (migErr) {
      console.warn('[DB] Nota en migración legacy:', migErr);
    }

    // Settings por defecto (sólo en el primer arranque)
    if (!localStorage.getItem(KEYS.SETTINGS)) {
      writeJson(KEYS.SETTINGS, {
        timerDurationSeconds: 90,
        soundEnabled: true,
        vibrationEnabled: true,
        unit: 'kg',
        notificationsEnabled: true
      });
    }

    // Sólo se marca la semilla una vez. Nunca se reinsertan datos borrados
    // por el usuario ni se pisan importaciones.
    if (!localStorage.getItem(KEYS.SEED_FLAG)) {
      localStorage.setItem(KEYS.SEED_FLAG, SEED_VERSION);
    }
  }

  // --- ESPEJO INDEXEDDB + PERSISTENCIA ---
  async setupPersistence() {
    try {
      if (navigator.storage?.persist) {
        await navigator.storage.persist();
      }
    } catch {
      // El navegador puede rechazarlo; localStorage sigue funcionando.
    }
    this.restoreFromMirror().catch(() => {});
  }

  openIDB() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB no disponible'));
        return;
      }
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(IDB_STORE)) {
          request.result.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async withStore(mode, callback) {
    const db = await this.openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, mode);
      const store = tx.objectStore(IDB_STORE);
      let result;
      try {
        result = callback(store);
      } catch (err) {
        reject(err);
        return;
      }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  scheduleMirror() {
    if (this.mirrorTimer) clearTimeout(this.mirrorTimer);
    this.mirrorTimer = setTimeout(() => {
      this.mirrorToIndexedDB().catch(() => {});
    }, 200);
  }

  buildSnapshot() {
    const nutrition = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(NUTRITION_PREFIX)) {
          nutrition[key] = readJson(key, null);
        }
      }
    } catch {
      // localStorage bloqueado
    }

    return {
      savedAt: Date.now(),
      workouts: readJson(KEYS.WORKOUT_LOGS, []),
      measurements: readJson(KEYS.MEASUREMENTS, []),
      customWeights: readJson(KEYS.CUSTOM_WEIGHTS, {}),
      settings: readJson(KEYS.SETTINGS, {}),
      profile: readJson(KEYS.PROFILE, null),
      tombstones: readJson(KEYS.TOMBSTONES, {}),
      nutrition
    };
  }

  async mirrorToIndexedDB() {
    const snapshot = this.buildSnapshot();
    await this.withStore('readwrite', (store) => store.put(snapshot, IDB_SNAPSHOT_KEY));
  }

  async restoreFromMirror() {
    const db = await this.openIDB();
    const snapshot = await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const request = tx.objectStore(IDB_STORE).get(IDB_SNAPSHOT_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!snapshot) return;
    let restored = false;

    if (!localStorage.getItem(KEYS.WORKOUT_LOGS) && Array.isArray(snapshot.workouts)) {
      writeJson(KEYS.WORKOUT_LOGS, snapshot.workouts);
      restored = true;
    }
    if (!localStorage.getItem(KEYS.MEASUREMENTS) && Array.isArray(snapshot.measurements)) {
      writeJson(KEYS.MEASUREMENTS, snapshot.measurements);
      restored = true;
    }
    if (!localStorage.getItem(KEYS.CUSTOM_WEIGHTS) && snapshot.customWeights) {
      writeJson(KEYS.CUSTOM_WEIGHTS, snapshot.customWeights);
      restored = true;
    }
    if (!localStorage.getItem(KEYS.PROFILE) && snapshot.profile) {
      writeJson(KEYS.PROFILE, snapshot.profile);
      restored = true;
    }
    if (!localStorage.getItem(KEYS.TOMBSTONES) && snapshot.tombstones) {
      writeJson(KEYS.TOMBSTONES, snapshot.tombstones);
      restored = true;
    }
    if (snapshot.nutrition && typeof snapshot.nutrition === 'object') {
      for (const [key, value] of Object.entries(snapshot.nutrition)) {
        if (key.startsWith(NUTRITION_PREFIX) && !localStorage.getItem(key) && value) {
          writeJson(key, value);
          restored = true;
        }
      }
    }

    if (restored && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kinetix:restored'));
    }
  }

  // --- PERFIL ---
  getProfile() {
    const stored = readJson(KEYS.PROFILE, {}) || {};
    const profile = { ...INITIAL_DATA.profile, ...stored };
    return {
      ...profile,
      height: Number(profile.height) || Number(profile.heightCm) || INITIAL_DATA.profile.height,
      heightCm: Number(profile.heightCm) || Number(profile.height) || INITIAL_DATA.profile.height,
      updatedAt: toTimestamp(profile.updatedAt)
    };
  }

  saveProfile(profile) {
    const merged = {
      ...this.getProfile(),
      ...profile,
      updatedAt: Date.now()
    };
    writeJson(KEYS.PROFILE, merged);
    this.scheduleMirror();
    convex.syncProfile(merged).catch(() => {});
    return merged;
  }

  applyCloudProfile(profile) {
    if (!profile) return false;
    const { _id, _creationTime, ...clean } = profile;
    const mapped = {
      ...clean,
      height: Number(profile.heightCm) || Number(profile.height) || 0,
      heightCm: Number(profile.heightCm) || Number(profile.height) || 0,
      updatedAt: toTimestamp(profile.updatedAt)
    };
    writeJson(KEYS.PROFILE, mapped);
    this.scheduleMirror();
    return true;
  }

  // --- ENTRENAMIENTOS ---
  getWorkoutLogs() {
    const logs = readJson(KEYS.WORKOUT_LOGS, []);
    if (!Array.isArray(logs)) return [];
    return logs
      .map((log) => normalizeWorkout(log))
      .filter(Boolean)
      .sort((a, b) => toTimestamp(b.startTime || b.date) - toTimestamp(a.startTime || a.date));
  }

  saveWorkoutSession(session) {
    const logs = this.getWorkoutLogs();
    const normalized = normalizeWorkout({
      ...session,
      id: session.id || session.sessionId || `session_${Date.now()}`,
      updatedAt: Date.now()
    });
    if (!normalized) return session;

    const index = logs.findIndex((log) => log.id === normalized.id || log.sessionId === normalized.id);
    if (index >= 0) logs[index] = normalized;
    else logs.unshift(normalized);

    logs.sort((a, b) => toTimestamp(b.startTime || b.date) - toTimestamp(a.startTime || a.date));
    writeJson(KEYS.WORKOUT_LOGS, logs);
    this.clearActiveSession();
    this.scheduleMirror();

    convex.syncWorkout(normalized).catch(() => {});
    return normalized;
  }

  deleteWorkoutSession(sessionId) {
    const logs = this.getWorkoutLogs().filter((log) => log.id !== sessionId && log.sessionId !== sessionId);
    writeJson(KEYS.WORKOUT_LOGS, logs);
    this.addTombstone('workouts', sessionId);
    this.scheduleMirror();

    convex.mutation('workouts:deleteSession', { sessionId }).catch(() => {});
  }

  // Obtener el último registro de un ejercicio específico para mostrar referencia previa
  getLastExerciseLog(exerciseId) {
    const logs = this.getWorkoutLogs();
    for (const session of logs) {
      if (!Array.isArray(session.exercises)) continue;
      const found = session.exercises.find((exercise) => exercise.exerciseId === exerciseId);
      if (!found || !Array.isArray(found.sets) || found.sets.length === 0) continue;

      const validSets = found.sets.filter((set) => set.completed);
      if (validSets.length === 0) continue;

      // El peso y las reps deben salir del MISMO set, no del máximo de cada uno.
      const bestSet = validSets.reduce((best, current) => {
        const currentWeight = Number(current.weight) || 0;
        const bestWeight = Number(best.weight) || 0;
        if (currentWeight > bestWeight) return current;
        if (currentWeight === bestWeight && (Number(current.reps) || 0) > (Number(best.reps) || 0)) return current;
        return best;
      }, validSets[0]);

      return {
        date: session.date,
        sets: validSets,
        bestSet,
        bestWeight: Number(bestSet.weight) || 0,
        bestReps: Number(bestSet.reps) || 0
      };
    }
    return null;
  }

  // --- SESIÓN ACTIVA (Borrador en vivo durante el entreno) ---
  getActiveSession() {
    return readJson(KEYS.ACTIVE_SESSION, null);
  }

  saveActiveSession(session) {
    writeJson(KEYS.ACTIVE_SESSION, session);
    this.scheduleMirror();
  }

  clearActiveSession() {
    localStorage.removeItem(KEYS.ACTIVE_SESSION);
  }

  // --- NUTRICIÓN & HÁBITOS DIARIOS ---
  getNutritionKey(date = todayKey()) {
    return `${NUTRITION_PREFIX}${date}`;
  }

  getNutrition(date = todayKey()) {
    return readJson(this.getNutritionKey(date), {
      date,
      medicationTaken: false,
      waterMl: 0,
      waterGoalMl: 3000,
      completedMeals: {},
      notes: ''
    });
  }

  getTodayNutritionKey() {
    return this.getNutritionKey(todayKey());
  }

  getTodayNutrition() {
    return this.getNutrition(todayKey());
  }

  saveNutrition(date, data) {
    const key = this.getNutritionKey(date);
    const payload = { ...data, date, updatedAt: Date.now() };
    writeJson(key, payload);
    this.scheduleMirror();
    convex.syncNutrition(date, payload).catch(() => {});
    return payload;
  }

  saveTodayNutrition(data) {
    return this.saveNutrition(data?.date || todayKey(), data);
  }

  getAllNutritionLogs() {
    const logs = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(NUTRITION_PREFIX)) {
          const value = readJson(key, null);
          if (value) logs.push(value);
        }
      }
    } catch {
      // localStorage bloqueado
    }
    return logs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  // --- MEDICIONES CORPORALES ---
  getMeasurements() {
    const list = readJson(KEYS.MEASUREMENTS, []);
    if (!Array.isArray(list)) return [];
    return list
      .map((measurement) => normalizeMeasurement(measurement))
      .filter(Boolean)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  addMeasurement(measurement) {
    const list = this.getMeasurements();
    const normalized = normalizeMeasurement({ ...measurement, updatedAt: Date.now() });
    if (!normalized) return measurement;

    const existingIdx = list.findIndex((item) => item.date === normalized.date);
    if (existingIdx >= 0) {
      list[existingIdx] = normalizeMeasurement(normalized, list[existingIdx]);
      this.clearTombstone('measurements', normalized.date);
    } else {
      list.unshift(normalized);
    }
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    writeJson(KEYS.MEASUREMENTS, list);
    this.scheduleMirror();

    convex.syncMeasurement(normalized).catch(() => {});
    return normalized;
  }

  deleteMeasurement(date) {
    const list = this.getMeasurements().filter((item) => item.date !== date);
    writeJson(KEYS.MEASUREMENTS, list);
    this.addTombstone('measurements', date);
    this.scheduleMirror();

    convex.mutation('measurements:deleteMeasurement', { date }).catch(() => {});
  }

  // --- CONFIGURACIÓN ---
  getSettings() {
    return readJson(KEYS.SETTINGS, {});
  }

  saveSettings(settings) {
    writeJson(KEYS.SETTINGS, settings);
    this.scheduleMirror();
  }

  getTheme() {
    return localStorage.getItem(KEYS.THEME) || 'dark';
  }

  setTheme(theme) {
    localStorage.setItem(KEYS.THEME, theme === 'light' ? 'light' : 'dark');
  }

  // --- TOMBSTONES (eliminaciones offline) ---
  getTombstones() {
    return readJson(KEYS.TOMBSTONES, {}) || {};
  }

  addTombstone(type, key) {
    const tombstones = this.getTombstones();
    if (!tombstones[type]) tombstones[type] = {};
    tombstones[type][key] = { deletedAt: Date.now() };
    writeJson(KEYS.TOMBSTONES, tombstones);
  }

  clearTombstone(type, key) {
    const tombstones = this.getTombstones();
    if (tombstones[type] && tombstones[type][key]) {
      delete tombstones[type][key];
      writeJson(KEYS.TOMBSTONES, tombstones);
    }
  }

  pendingDeletions() {
    const tombstones = this.getTombstones();
    const deletions = [];
    for (const [type, entries] of Object.entries(tombstones)) {
      for (const key of Object.keys(entries || {})) {
        deletions.push({ type, key });
      }
    }
    return deletions;
  }

  // --- SINCRONIZACIÓN BIDIRECCIONAL ---
  async syncTwoWay() {
    if (!navigator.onLine) {
      return { success: false, offline: true, code: 'OFFLINE', error: 'Sin conexión a internet' };
    }
    if (!convex.hasSyncKey()) {
      return {
        success: false,
        code: 'SYNC_KEY_REQUIRED',
        error: 'Configura la clave de sincronización en Ajustes para respaldar en la nube.'
      };
    }

    const tombstones = this.getTombstones();
    const localWorkouts = this.getWorkoutLogs();
    const localMeas = this.getMeasurements();
    const localCustomWeights = this.getCustomWeightsMeta();
    const localProfile = this.getProfile();

    // 1. PULL primero: así una nube vieja nunca pisa cambios locales más nuevos.
    const [cloudWorkoutsRes, cloudMeasRes, cloudCustomRes, cloudNutritionRes, cloudProfileRes] = await Promise.all([
      convex.fetchAllCloudWorkouts(),
      convex.fetchCloudMeasurements(),
      convex.fetchCloudCustomWeights(),
      convex.fetchCloudNutrition(),
      convex.fetchCloudProfile()
    ]);

    const authError = [cloudWorkoutsRes, cloudMeasRes, cloudCustomRes, cloudNutritionRes, cloudProfileRes]
      .find((res) => res && !res.success && (res.code === 'SYNC_KEY_INVALID' || res.code === 'SYNC_KEY_NOT_CONFIGURED' || res.code === 'SYNC_KEY_REQUIRED'));
    if (authError) {
      return { success: false, code: authError.code, error: authError.error };
    }

    const cloudWorkouts = cloudWorkoutsRes.success && Array.isArray(cloudWorkoutsRes.data) ? cloudWorkoutsRes.data : null;
    const cloudMeas = cloudMeasRes.success && Array.isArray(cloudMeasRes.data) ? cloudMeasRes.data : null;
    const cloudCustom = cloudCustomRes.success && cloudCustomRes.data && typeof cloudCustomRes.data === 'object' ? cloudCustomRes.data : null;
    const cloudNutrition = cloudNutritionRes.success && Array.isArray(cloudNutritionRes.data) ? cloudNutritionRes.data : null;
    const cloudProfile = cloudProfileRes.success ? cloudProfileRes.data : null;

    // Si falló una consulta crítica, abortamos para no subir datos incompletos.
    if (!cloudWorkouts || !cloudMeas || !cloudCustom) {
      const failed = [cloudWorkoutsRes, cloudMeasRes, cloudCustomRes].find((res) => !res.success);
      return { success: false, code: failed?.code || 'PULL_FAILED', error: failed?.error || 'No se pudo leer la nube.' };
    }

    // 2. MERGE last-write-wins con tombstones.
    const localWorkoutIds = new Set(localWorkouts.map((w) => w.id));
    const localMeasDates = new Set(localMeas.map((m) => m.date));
    const localWeightIds = new Set(Object.keys(localCustomWeights));

    const importedWorkouts = cloudWorkouts.filter((w) => {
      const id = w.sessionId || w.id;
      return id && !localWorkoutIds.has(id);
    }).length;
    const importedMeas = cloudMeas.filter((m) => m.date && !localMeasDates.has(m.date)).length;
    const importedWeights = Object.keys(cloudCustom).filter((id) => !localWeightIds.has(id)).length;

    const mergedWorkouts = mergeWorkouts(localWorkouts, cloudWorkouts, tombstones);
    const mergedMeas = mergeMeasurements(localMeas, cloudMeas, tombstones);
    const mergedWeights = mergeCustomWeights(localCustomWeights, cloudCustom);

    // 3. Nutrición: mezclar por día (la nube ahora sí se descarga).
    if (cloudNutrition) {
      for (const cloudLog of cloudNutrition) {
        if (!cloudLog?.date) continue;
        const key = this.getNutritionKey(cloudLog.date);
        const localLog = readJson(key, null);
        const merged = mergeNutrition(localLog, cloudLog);
        if (merged) writeJson(key, merged);
      }
    }

    // 4. Perfil: gana el updatedAt más reciente y, si el local es más nuevo,
    // se sube para que una edición offline no se quede sin respaldar.
    const cloudProfileVersion = toTimestamp(cloudProfile?.updatedAt);
    const localProfileVersion = toTimestamp(localProfile.updatedAt);
    let uploadedProfile = false;
    let profileApplied = false;
    if (cloudProfile && cloudProfileVersion > localProfileVersion) {
      profileApplied = this.applyCloudProfile(cloudProfile);
    } else if (localProfileVersion > cloudProfileVersion) {
      const profilePush = await convex.syncProfile(localProfile);
      uploadedProfile = Boolean(profilePush?.success);
    }

    // 5. Persistir el merge local.
    writeJson(KEYS.WORKOUT_LOGS, mergedWorkouts);
    writeJson(KEYS.MEASUREMENTS, mergedMeas);
    writeJson(KEYS.CUSTOM_WEIGHTS, mergedWeights);

    // 6. Push sólo de lo que cambió o no existe en la nube.
    const cloudWorkoutVersions = new Map(cloudWorkouts.map((w) => [w.sessionId || w.id, workoutVersion(w)]));
    const workoutsToPush = mergedWorkouts.filter((w) => workoutVersion(w) > (cloudWorkoutVersions.get(w.id) || 0));

    const cloudMeasVersions = new Map(cloudMeas.map((m) => [m.date, toTimestamp(m.updatedAt) || toTimestamp(m.createdAt)]));
    const measToPush = mergedMeas.filter((m) => m.date && (toTimestamp(m.updatedAt) > (cloudMeasVersions.get(m.date) || 0)));

    const cloudWeightVersions = new Map(Object.entries(cloudCustom).map(([id, value]) => [id, toTimestamp(value?.updatedAt)]));
    const weightsToPush = {};
    for (const [id, entry] of Object.entries(mergedWeights)) {
      if (entry.updatedAt > (cloudWeightVersions.get(id) || 0)) weightsToPush[id] = entry;
    }

    // 7. Nutrición creada offline: subir los días que la nube no tenga o que
    // sean más antiguos que la versión local.
    let uploadedNutrition = 0;
    if (cloudNutrition) {
      const cloudNutritionVersions = new Map(
        cloudNutrition.map((log) => [log.date, toTimestamp(log.updatedAt)])
      );
      const nutritionToPush = this.getAllNutritionLogs().filter((log) => {
        return log?.date && toTimestamp(log.updatedAt) > (cloudNutritionVersions.get(log.date) || 0);
      });

      for (const log of nutritionToPush) {
        const res = await convex.syncNutrition(log.date, log);
        if (res && res.success) uploadedNutrition++;
      }
    }

    const deletions = this.pendingDeletions();
    let pushRes = null;
    try {
      pushRes = await convex.syncAllLocalData(workoutsToPush, measToPush, weightsToPush, deletions);
    } catch (pushErr) {
      console.warn('[DB] Error subiendo a Convex:', pushErr);
    }

    if (pushRes && !pushRes.success) {
      return { success: false, code: pushRes.code || 'PUSH_FAILED', error: pushRes.error || 'No se pudo respaldar en la nube.' };
    }

    // 7. Limpiar tombstones muy antiguos (se conservan 90 días por seguridad).
    writeJson(KEYS.TOMBSTONES, pruneTombstones(tombstones));

    this.scheduleMirror();

    const totalWorkouts = this.getWorkoutLogs().length;
    const totalMeas = this.getMeasurements().length;

    return {
      success: true,
      uploadedWorkouts: pushRes?.data?.workoutsSynced ?? 0,
      uploadedMeas: pushRes?.data?.measurementsSynced ?? 0,
      importedWorkouts,
      importedMeas,
      importedWeights,
      uploadedNutrition,
      uploadedProfile,
      profileApplied,
      deletionsApplied: pushRes?.data?.deletionsApplied ?? 0,
      totalWorkouts,
      totalMeas
    };
  }

  // Compatibilidad con llamadas previas
  async syncAllToConvex() {
    return await this.syncTwoWay();
  }

  async pullFromConvex() {
    return await this.syncTwoWay();
  }

  // --- PESOS BASE PERSONALIZADOS ---
  // El almacenamiento ahora incluye updatedAt. getCustomWeights() mantiene la
  // forma simple { id: number } para el resto de la app.
  getCustomWeightsMeta() {
    const raw = readJson(KEYS.CUSTOM_WEIGHTS, {});
    const result = {};
    if (!raw || typeof raw !== 'object') return result;
    for (const [id, value] of Object.entries(raw)) {
      const normalized = normalizeCustomWeight(value);
      if (normalized) result[id] = normalized;
    }
    return result;
  }

  getCustomWeights() {
    const meta = this.getCustomWeightsMeta();
    const result = {};
    for (const [id, entry] of Object.entries(meta)) {
      result[id] = entry.weight;
    }
    return result;
  }

  getCustomWeight(exerciseId) {
    const entry = this.getCustomWeightsMeta()[exerciseId];
    return entry ? entry.weight : null;
  }

  setCustomWeight(exerciseId, weight) {
    const meta = this.getCustomWeightsMeta();
    const numericWeight = Number(weight) || 0;
    const updatedAt = Date.now();
    meta[exerciseId] = { weight: numericWeight, updatedAt };
    writeJson(KEYS.CUSTOM_WEIGHTS, meta);
    this.scheduleMirror();

    convex.syncCustomWeight(exerciseId, numericWeight, updatedAt).catch(() => {});
    return this.getCustomWeights();
  }

  // Sugerencia inteligente de sobrecarga progresiva ("Smart Coach")
  getProgressiveOverloadSuggestion(exerciseDef) {
    if (!exerciseDef || exerciseDef.isCardio) return null;
    const exerciseId = exerciseDef.id || exerciseDef.exerciseId;
    if (!exerciseId) return null;

    const prevLog = this.getLastExerciseLog(exerciseId);
    if (!prevLog || !prevLog.sets || prevLog.sets.length === 0) return null;

    const repsStr = String(exerciseDef.defaultReps || '8-10');
    const parts = repsStr.match(/\d+/g);
    if (!parts || parts.length === 0) return null;
    const minTargetReps = parseInt(parts[0], 10);
    const maxTargetReps = parts.length > 1 ? parseInt(parts[1], 10) : minTargetReps;

    const customW = this.getCustomWeight(exerciseId);
    const defaultBaseW = Number(exerciseDef.baseWeight) || 0;
    const currentTargetWeight = customW !== null ? Number(customW) : (prevLog.bestWeight || defaultBaseW);

    if (!currentTargetWeight || currentTargetWeight <= 0) return null;

    const setsAtTargetWeight = prevLog.sets.filter((set) => set.completed && (Number(set.weight) || 0) >= currentTargetWeight);
    if (setsAtTargetWeight.length === 0) return null;

    const bestRepsAtWeight = Math.max(...setsAtTargetWeight.map((set) => Number(set.reps) || 0));
    const allSetsMetMin = setsAtTargetWeight.every((set) => (Number(set.reps) || 0) >= minTargetReps);

    if (bestRepsAtWeight >= maxTargetReps && allSetsMetMin) {
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

    const chronologicalLogs = [...logs].reverse();

    for (const session of chronologicalLogs) {
      if (!Array.isArray(session.exercises)) continue;
      const exercise = session.exercises.find((item) => item.exerciseId === exerciseId);
      if (!exercise || !Array.isArray(exercise.sets) || exercise.sets.length === 0) continue;

      const validSets = exercise.sets.filter((set) => set.completed);
      if (validSets.length > 0) {
        totalSessions++;
        totalCompletedSets += validSets.length;
        const maxSetWeight = Math.max(...validSets.map((set) => Number(set.weight) || 0));

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
          sets: validSets.map((set) => ({
            setNumber: set.setNumber,
            weight: Number(set.weight) || 0,
            reps: Number(set.reps) || 0,
            completed: set.completed,
            rpe: set.rpe || ''
          })),
          bestWeight: maxSetWeight
        });
      }
    }

    if (baselineWeight === null || baselineWeight === 0) {
      for (const routine of Object.values(INITIAL_DATA.routines)) {
        const found = routine.exercises?.find((exercise) => exercise.id === exerciseId);
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
      history: history.reverse()
    };
  }

  // Obtener consolidado de todas las variantes de fuerza del programa
  getAllExercisesAnalytics() {
    const uniqueExercisesMap = new Map();

    Object.values(INITIAL_DATA.routines).forEach((routine) => {
      (routine.exercises || []).forEach((exercise) => {
        if (!exercise.isCardio && !uniqueExercisesMap.has(exercise.id)) {
          uniqueExercisesMap.set(exercise.id, {
            ...exercise,
            routineId: routine.id,
            routineName: routine.name,
            dayName: routine.dayName
          });
        }
      });
    });

    const results = [];
    uniqueExercisesMap.forEach((definition, id) => {
      results.push({
        ...definition,
        stats: this.getExerciseEvolutionStats(id)
      });
    });

    return results;
  }

  // --- EXPORTAR E IMPORTAR DATOS (BACKUP) ---
  exportAllData() {
    const exportData = {
      version: '2',
      exportDate: new Date().toISOString(),
      profile: this.getProfile(),
      settings: this.getSettings(),
      customWeights: this.getCustomWeightsMeta(),
      workoutLogs: this.getWorkoutLogs(),
      measurements: this.getMeasurements(),
      nutrition: this.getAllNutritionLogs(),
      seedVersion: localStorage.getItem(KEYS.SEED_FLAG) || SEED_VERSION
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kinetix_backup_${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  validateImport(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { valid: false, error: 'El archivo no contiene un objeto de respaldo válido.' };
    }
    if (data.version && String(data.version) !== '2' && String(data.version) !== '1.14' && String(data.version) !== '1') {
      return { valid: false, error: `Versión de respaldo no soportada: ${data.version}.` };
    }
    if (data.workoutLogs !== undefined && !Array.isArray(data.workoutLogs)) {
      return { valid: false, error: 'workoutLogs debe ser una lista.' };
    }
    if (data.measurements !== undefined && !Array.isArray(data.measurements)) {
      return { valid: false, error: 'measurements debe ser una lista.' };
    }
    if (data.nutrition !== undefined && !Array.isArray(data.nutrition)) {
      return { valid: false, error: 'nutrition debe ser una lista.' };
    }
    return { valid: true };
  }

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      const validation = this.validateImport(data);
      if (!validation.valid) return { success: false, error: validation.error };

      if (Array.isArray(data.workoutLogs)) {
        writeJson(KEYS.WORKOUT_LOGS, data.workoutLogs.map((log) => normalizeWorkout(log)).filter(Boolean));
      }
      if (Array.isArray(data.measurements)) {
        writeJson(KEYS.MEASUREMENTS, data.measurements.map((measurement) => normalizeMeasurement(measurement)).filter(Boolean));
      }
      if (data.settings && typeof data.settings === 'object') {
        writeJson(KEYS.SETTINGS, { ...this.getSettings(), ...data.settings });
      }
      if (data.customWeights && typeof data.customWeights === 'object') {
        writeJson(KEYS.CUSTOM_WEIGHTS, mergeCustomWeights({}, data.customWeights));
      }
      if (data.profile && typeof data.profile === 'object') {
        writeJson(KEYS.PROFILE, { ...data.profile, updatedAt: Date.now() });
      }
      if (Array.isArray(data.nutrition)) {
        for (const log of data.nutrition) {
          if (log?.date) writeJson(this.getNutritionKey(log.date), log);
        }
      }

      // Un respaldo restaurado es la nueva verdad: no debe quedar bloqueado
      // por eliminaciones pendientes de una sesión anterior.
      localStorage.removeItem(KEYS.TOMBSTONES);

      localStorage.setItem(KEYS.SEED_FLAG, SEED_VERSION);
      this.scheduleMirror();
      return { success: true, count: data.workoutLogs?.length || 0 };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

export const db = new StorageService();
