// Funciones puras de normalización y merge Local-First.
// Se mantienen separadas de db.js para poder testearlas sin localStorage.

export function toTimestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value === null || value === undefined || value === '') return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function workoutKey(workout) {
  return workout?.id || workout?.sessionId || null;
}

export function workoutVersion(workout) {
  if (!workout) return 0;
  const updated = toTimestamp(workout.updatedAt);
  if (updated) return updated;
  const ended = toTimestamp(workout.endTime);
  if (ended) return ended;
  return Math.max(toTimestamp(workout.startTime), toTimestamp(workout.date));
}

export function normalizeWorkout(workout) {
  if (!workout || typeof workout !== 'object') return null;
  const key = workoutKey(workout);
  if (!key) return null;

  let startTime = workout.startTime || '';
  if (!startTime && workout.date) {
    startTime = String(workout.date).includes('T')
      ? workout.date
      : `${workout.date}T18:00:00.000Z`;
  }
  let date = workout.date || '';
  if (!date && startTime) {
    const parsed = new Date(startTime);
    date = Number.isNaN(parsed.getTime()) ? String(startTime).split('T')[0] : parsed.toLocaleDateString('en-CA');
  }

  // No persistimos metadatos internos de Convex en localStorage/backups.
  const { _id, _creationTime, ...clean } = workout;

  return {
    ...clean,
    id: key,
    sessionId: workout.sessionId || key,
    date: date || '',
    startTime: startTime || '',
    updatedAt: workoutVersion(workout) || Date.now()
  };
}

export function isTombstoned(tombstones, type, key, cloudVersion = 0) {
  const item = tombstones?.[type]?.[key];
  if (!item) return false;
  const deletedAt = typeof item === 'object' ? toTimestamp(item.deletedAt) : toTimestamp(item);
  return deletedAt >= toTimestamp(cloudVersion);
}

export function mergeWorkouts(localWorkouts = [], cloudWorkouts = [], tombstones = {}) {
  const map = new Map();

  for (const local of localWorkouts) {
    const normalized = normalizeWorkout(local);
    if (normalized) map.set(normalized.id, normalized);
  }

  for (const cloud of cloudWorkouts) {
    const normalized = normalizeWorkout(cloud);
    if (!normalized) continue;
    if (isTombstoned(tombstones, 'workouts', normalized.id, workoutVersion(normalized))) continue;

    const existing = map.get(normalized.id);
    if (!existing) {
      map.set(normalized.id, normalized);
      continue;
    }

    // Last-write-wins. En empate gana local para no perder ediciones offline.
    if (workoutVersion(normalized) > workoutVersion(existing)) {
      map.set(normalized.id, { ...existing, ...normalized, id: normalized.id });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    return toTimestamp(b.startTime || b.date) - toTimestamp(a.startTime || a.date);
  });
}

export function normalizeMeasurement(measurement, existing = {}) {
  if (!measurement || !measurement.date) return null;

  const weight = measurement.weight !== undefined && toNumber(measurement.weight) > 0
    ? toNumber(measurement.weight)
    : (toNumber(measurement.weightKg) > 0 ? toNumber(measurement.weightKg) : (existing.weight ?? existing.weightKg));

  const weightKg = measurement.weightKg !== undefined && toNumber(measurement.weightKg) > 0
    ? toNumber(measurement.weightKg)
    : (toNumber(measurement.weight) > 0 ? toNumber(measurement.weight) : (existing.weightKg ?? existing.weight));

  const fatPercent = measurement.bodyFatPercent ?? measurement.fatPercent ?? existing.bodyFatPercent ?? existing.fatPercent;
  const fatMass = measurement.fatMassKg ?? measurement.fatMass ?? existing.fatMassKg ?? existing.fatMass;
  const muscleMass = measurement.muscleMassKg ?? measurement.muscleMass ?? existing.muscleMassKg ?? existing.muscleMass;

  const { _id, _creationTime, ...cleanMeasurement } = measurement;

  return {
    ...existing,
    ...cleanMeasurement,
    date: measurement.date,
    weight: toNumber(weight),
    weightKg: toNumber(weightKg),
    fatPercent,
    bodyFatPercent: fatPercent,
    fatMass,
    fatMassKg: fatMass,
    fatFreeMass: measurement.fatFreeMass ?? existing.fatFreeMass,
    muscleMass,
    muscleMassKg: muscleMass,
    trunkFat: measurement.trunkFat ?? existing.trunkFat,
    visceralFat: measurement.visceralFat ?? existing.visceralFat ?? 0,
    waterPercent: measurement.waterPercent ?? existing.waterPercent,
    waterLitres: measurement.waterLitres ?? existing.waterLitres,
    bmr: measurement.bmr ?? existing.bmr,
    appendicularLeanIndex: measurement.appendicularLeanIndex ?? existing.appendicularLeanIndex,
    boneMass: measurement.boneMass ?? existing.boneMass,
    waistCircumferenceCm: measurement.waistCircumferenceCm ?? existing.waistCircumferenceCm,
    source: measurement.source || existing.source || 'Manual',
    updatedAt: measurementVersion(measurement) || Date.now()
  };
}

export function measurementVersion(measurement) {
  if (!measurement) return 0;
  const updated = toTimestamp(measurement.updatedAt);
  if (updated) return updated;
  const created = toTimestamp(measurement.createdAt);
  if (created) return created;
  return toTimestamp(measurement.date);
}

export function isInBodyMeasurement(measurement) {
  return String(measurement?.source || '').toLowerCase().includes('inbody');
}

export function measurementKey(measurement) {
  if (!measurement || !measurement.date) return null;
  const category = isInBodyMeasurement(measurement) ? 'inbody' : 'home';
  return `${measurement.date}::${category}`;
}

export function mergeMeasurements(localMeasurements = [], cloudMeasurements = [], tombstones = {}) {
  const map = new Map();

  for (const local of localMeasurements) {
    const normalized = normalizeMeasurement(local);
    const key = measurementKey(normalized);
    if (normalized && key) map.set(key, normalized);
  }

  for (const cloud of cloudMeasurements) {
    const normalized = normalizeMeasurement(cloud);
    const key = measurementKey(normalized);
    if (!normalized || !key) continue;

    const version = measurementVersion(normalized);
    if (
      isTombstoned(tombstones, 'measurements', key, version) ||
      isTombstoned(tombstones, 'measurements', normalized.date, version)
    ) {
      continue;
    }

    const existing = map.get(key);
    if (!existing) {
      map.set(key, normalized);
      continue;
    }
    if (version > measurementVersion(existing)) {
      map.set(key, normalizeMeasurement(normalized, existing));
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const byDate = (b.date || '').localeCompare(a.date || '');
    if (byDate !== 0) return byDate;
    return Number(isInBodyMeasurement(b)) - Number(isInBodyMeasurement(a));
  });
}

export function normalizeCustomWeight(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Valor heredado (v1.14): usamos un timestamp mínimo no nulo para que
    // se suba una vez a la nube y luego quede estable.
    return { weight: value, updatedAt: 1 };
  }
  if (value && typeof value === 'object') {
    const weight = Number(value.weight ?? value.value);
    if (!Number.isFinite(weight)) return null;
    return { weight, updatedAt: toTimestamp(value.updatedAt) };
  }
  return null;
}

// Recibe mapas { exerciseId: {weight, updatedAt} | number } y devuelve
// un mapa con metadatos, resolviendo por updatedAt (empate: local).
export function mergeCustomWeights(localWeights = {}, cloudWeights = {}) {
  const result = {};
  const ids = new Set([...Object.keys(localWeights || {}), ...Object.keys(cloudWeights || {})]);

  for (const id of ids) {
    const local = normalizeCustomWeight(localWeights?.[id]);
    const cloud = normalizeCustomWeight(cloudWeights?.[id]);
    if (!local && !cloud) continue;
    if (!local) {
      result[id] = cloud;
    } else if (!cloud) {
      result[id] = local;
    } else {
      result[id] = cloud.updatedAt > local.updatedAt ? cloud : local;
    }
  }

  return result;
}

function cleanNutrition(log) {
  if (!log) return log;
  const { _id, _creationTime, ...rest } = log;
  return rest;
}

export function mergeNutrition(localLog, cloudLog) {
  const local = cleanNutrition(localLog);
  const cloud = cleanNutrition(cloudLog);
  if (!local) return cloud || null;
  if (!cloud) return local;
  const localVersion = toTimestamp(local.updatedAt);
  const cloudVersion = toTimestamp(cloud.updatedAt);
  return cloudVersion > localVersion ? cloud : local;
}

function optionalPositive(value, fallback) {
  const num = Number(value);
  if (value !== undefined && value !== null && value !== '' && Number.isFinite(num) && num > 0) {
    return Math.round(num * 10) / 10;
  }
  return fallback;
}

export function normalizeTapeMeasurement(entry, existing = {}) {
  if (!entry || !entry.date) return null;
  const waistCm = optionalPositive(entry.waistCm ?? entry.waistCircumferenceCm ?? entry.waist, existing.waistCm);
  if (!waistCm || waistCm <= 0) return null;

  const { _id, _creationTime, ...clean } = entry;
  return {
    ...existing,
    ...clean,
    date: String(entry.date),
    waistCm,
    abdomenCm: optionalPositive(entry.abdomenCm, existing.abdomenCm),
    hipCm: optionalPositive(entry.hipCm, existing.hipCm),
    chestCm: optionalPositive(entry.chestCm, existing.chestCm),
    armCm: optionalPositive(entry.armCm, existing.armCm),
    thighCm: optionalPositive(entry.thighCm, existing.thighCm),
    notes: entry.notes !== undefined ? String(entry.notes || '') : (existing.notes || ''),
    updatedAt: measurementVersion(entry) || Date.now()
  };
}

export function normalizeSleepLog(entry, existing = {}) {
  if (!entry || !entry.date) return null;
  const rawHours = Number(entry.hours);
  const fallbackHours = Number(existing.hours);
  const baseHours = Number.isFinite(rawHours) ? rawHours : fallbackHours;
  if (!Number.isFinite(baseHours) || baseHours < 0 || baseHours > 24) return null;

  const rawQuality = Number(entry.quality ?? existing.quality);
  const quality = Number.isFinite(rawQuality) && rawQuality >= 1 && rawQuality <= 5
    ? Math.round(rawQuality)
    : undefined;

  const rawWakeups = entry.wakeups ?? existing.wakeups;
  const wakeupsNum = Number(rawWakeups);
  const wakeups = rawWakeups !== undefined && rawWakeups !== null && rawWakeups !== '' && Number.isFinite(wakeupsNum) && wakeupsNum >= 0
    ? Math.round(wakeupsNum)
    : undefined;

  const factors = Array.isArray(entry.factors)
    ? entry.factors.map((item) => String(item).trim()).filter(Boolean)
    : (Array.isArray(existing.factors) ? existing.factors : []);

  const { _id, _creationTime, ...clean } = entry;
  return {
    ...existing,
    ...clean,
    date: String(entry.date),
    hours: Math.round(baseHours * 10) / 10,
    quality,
    bedtime: entry.bedtime !== undefined ? (entry.bedtime || undefined) : existing.bedtime,
    wakeTime: entry.wakeTime !== undefined ? (entry.wakeTime || undefined) : existing.wakeTime,
    wakeups,
    factors,
    notes: entry.notes !== undefined ? String(entry.notes || '') : (existing.notes || ''),
    updatedAt: measurementVersion(entry) || Date.now()
  };
}

function mergeByDate(localList = [], cloudList = [], tombstones = {}, tombstoneType, normalizeFn) {
  const map = new Map();

  for (const local of localList) {
    const normalized = normalizeFn(local);
    if (normalized) map.set(normalized.date, normalized);
  }

  for (const cloud of cloudList) {
    const normalized = normalizeFn(cloud);
    if (!normalized) continue;
    const version = measurementVersion(normalized);
    if (isTombstoned(tombstones, tombstoneType, normalized.date, version)) continue;

    const existing = map.get(normalized.date);
    if (!existing) {
      map.set(normalized.date, normalized);
      continue;
    }
    if (version > measurementVersion(existing)) {
      map.set(normalized.date, normalizeFn(normalized, existing));
    }
  }

  return Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export function mergeTapeMeasurements(localTape = [], cloudTape = [], tombstones = {}) {
  return mergeByDate(localTape, cloudTape, tombstones, 'tape', normalizeTapeMeasurement);
}

export function mergeSleepLogs(localSleep = [], cloudSleep = [], tombstones = {}) {
  return mergeByDate(localSleep, cloudSleep, tombstones, 'sleep', normalizeSleepLog);
}

export function pruneTombstones(tombstones = {}, maxAgeMs = 1000 * 60 * 60 * 24 * 90) {
  const cutoff = Date.now() - maxAgeMs;
  const result = {};
  for (const [type, entries] of Object.entries(tombstones || {})) {
    result[type] = {};
    for (const [key, value] of Object.entries(entries || {})) {
      const deletedAt = typeof value === 'object' ? toTimestamp(value.deletedAt) : toTimestamp(value);
      if (deletedAt >= cutoff) result[type][key] = value;
    }
  }
  return result;
}
