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

export function mergeMeasurements(localMeasurements = [], cloudMeasurements = [], tombstones = {}) {
  const map = new Map();

  for (const local of localMeasurements) {
    const normalized = normalizeMeasurement(local);
    if (normalized) map.set(normalized.date, normalized);
  }

  for (const cloud of cloudMeasurements) {
    const normalized = normalizeMeasurement(cloud);
    if (!normalized) continue;
    if (isTombstoned(tombstones, 'measurements', normalized.date, measurementVersion(normalized))) continue;

    const existing = map.get(normalized.date);
    if (!existing) {
      map.set(normalized.date, normalized);
      continue;
    }
    if (measurementVersion(normalized) > measurementVersion(existing)) {
      map.set(normalized.date, normalizeMeasurement(normalized, existing));
    }
  }

  return Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export function normalizeCustomWeight(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { weight: value, updatedAt: 0 };
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
