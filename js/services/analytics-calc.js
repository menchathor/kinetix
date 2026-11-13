// Funciones puras de cálculo clínico, series de peso, volumen e iniciales.
import { toNumber } from '../utils/escape.js';

export function isInBodySource(source) {
  return String(source || '').toLowerCase().includes('inbody');
}

export function getInitials(name) {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'AT';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function sortedMeasurementsAscending(measurements = []) {
  return [...measurements]
    .filter((measurement) => measurement && measurement.date)
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      // Si hay dos mediciones el mismo día, ordenamos home antes que inbody.
      return Number(isInBodySource(a.source)) - Number(isInBodySource(b.source));
    });
}

function pickLatestMetric(primary, secondary, ...keys) {
  for (const key of keys) {
    const val = primary?.[key];
    if (val !== undefined && val !== null && val !== '' && Number(val) > 0) {
      return toNumber(val);
    }
  }
  for (const key of keys) {
    const val = secondary?.[key];
    if (val !== undefined && val !== null && val !== '' && Number(val) > 0) {
      return toNumber(val);
    }
  }
  return 0;
}

// El peso actual siempre usa la medición cronológicamente más reciente (hogar o InBody).
// La composición detallada prioriza el último control clínico cuando el pesaje más reciente no la incluye.
export function computeProfileStats(profile = {}, measurements = []) {
  const sorted = [...measurements]
    .filter((m) => m && m.date)
    .sort((a, b) => {
      const byDate = (b.date || '').localeCompare(a.date || '');
      if (byDate !== 0) return byDate;
      return Number(isInBodySource(b.source)) - Number(isInBodySource(a.source));
    });

  const latestAny = sorted[0] || {};
  const latestInBody = sorted.find((m) => isInBodySource(m.source)) || {};

  const currentWeight = pickLatestMetric(latestAny, latestInBody, 'weight', 'weightKg')
    || toNumber(profile.currentWeight);
  const startWeight = toNumber(profile.startWeight) || currentWeight;
  const weightDiff = startWeight > 0 && currentWeight > 0
    ? Math.round((currentWeight - startWeight) * 10) / 10
    : null;

  return {
    currentWeight,
    currentWeightSource: latestAny.source || '',
    currentWeightDate: latestAny.date || '',
    weightDiff,
    fatFreeMass: pickLatestMetric(latestAny, latestInBody, 'fatFreeMass') || toNumber(profile.fatFreeMass),
    skeletalMuscleMass: pickLatestMetric(latestAny, latestInBody, 'muscleMassKg', 'muscleMass') || toNumber(profile.skeletalMuscleMass),
    bodyFatPercent: pickLatestMetric(latestAny, latestInBody, 'bodyFatPercent', 'fatPercent') || toNumber(profile.bodyFatPercent),
    fatMassKg: pickLatestMetric(latestAny, latestInBody, 'fatMassKg', 'fatMass') || toNumber(profile.fatMassKg),
    trunkFat: pickLatestMetric(latestAny, latestInBody, 'trunkFat') || toNumber(profile.trunkFat),
    visceralFat: pickLatestMetric(latestAny, latestInBody, 'visceralFat') || toNumber(profile.visceralFat),
    bmr: Math.round(pickLatestMetric(latestAny, latestInBody, 'bmr') || toNumber(profile.basalMetabolicRate))
  };
}

export function computeComposition(measurements = [], profile = {}) {
  const sorted = sortedMeasurementsAscending(measurements);
  const inbody = sorted.filter((m) => isInBodySource(m.source));
  const firstClinical = inbody[0] || sorted[0] || null;
  const lastClinical = inbody[inbody.length - 1] || sorted[sorted.length - 1] || null;
  const latestAny = sorted[sorted.length - 1] || null;

  const currentWeight = toNumber(latestAny?.weight ?? latestAny?.weightKg ?? lastClinical?.weight ?? lastClinical?.weightKg ?? profile.currentWeight);
  const clinicalCurrentWeight = toNumber(lastClinical?.weight ?? lastClinical?.weightKg ?? currentWeight);
  const startWeight = toNumber(firstClinical?.weight ?? firstClinical?.weightKg ?? profile.startWeight) || currentWeight;
  const weightDiff = startWeight > 0 && currentWeight > 0
    ? Math.round((currentWeight - startWeight) * 10) / 10
    : null;

  const fatFreeMass = pickLatestMetric(lastClinical, latestAny, 'fatFreeMass') || toNumber(profile.fatFreeMass);
  const visceralFat = pickLatestMetric(lastClinical, latestAny, 'visceralFat') || toNumber(profile.visceralFat);
  const hasComparison = Boolean(firstClinical && lastClinical && firstClinical.date !== lastClinical.date);

  const startFat = toNumber(firstClinical?.fatMassKg ?? firstClinical?.fatMass);
  const endFat = toNumber(lastClinical?.fatMassKg ?? lastClinical?.fatMass);
  const weightLost = startWeight > 0 && clinicalCurrentWeight > 0
    ? Math.round((startWeight - clinicalCurrentWeight) * 10) / 10
    : 0;
  const fatLost = startFat > 0 && endFat >= 0 ? Math.round((startFat - endFat) * 10) / 10 : 0;
  const rawFatPercent = weightLost > 0 && fatLost > 0 ? Math.round((fatLost / weightLost) * 100) : null;
  const pureFatPercent = rawFatPercent !== null ? Math.min(100, rawFatPercent) : null;

  return {
    sorted,
    first: firstClinical,
    last: lastClinical,
    latestAny,
    hasComparison,
    currentWeight,
    clinicalCurrentWeight,
    startWeight,
    weightDiff,
    fatFreeMass,
    visceralFat,
    startFat,
    endFat,
    weightLost,
    fatLost,
    pureFatPercent,
    rawFatPercent,
    startFatPercent: toNumber(firstClinical?.bodyFatPercent ?? firstClinical?.fatPercent),
    endFatPercent: toNumber(lastClinical?.bodyFatPercent ?? lastClinical?.fatPercent),
    startTrunkFat: toNumber(firstClinical?.trunkFat),
    endTrunkFat: toNumber(lastClinical?.trunkFat),
    startVisceral: toNumber(firstClinical?.visceralFat),
    endVisceral: toNumber(lastClinical?.visceralFat),
    startLean: toNumber(firstClinical?.fatFreeMass),
    endLean: toNumber(lastClinical?.fatFreeMass ?? profile.fatFreeMass),
    bmr: Math.round(toNumber(lastClinical?.bmr ?? profile.basalMetabolicRate))
  };
}

// Agrupa por mes y equipo: la última medición de cada mes para InBody y
// para báscula hogar. Devuelve null cuando un equipo no midió ese mes.
export function buildMonthlyWeightSeries(measurements = []) {
  const monthMap = new Map();

  sortedMeasurementsAscending(measurements).forEach((measurement) => {
    if (!measurement.date || !/^\d{4}-\d{2}/.test(measurement.date)) return;
    const weight = Number(measurement.weight) || Number(measurement.weightKg) || 0;
    if (weight <= 0) return;

    const monthKey = measurement.date.slice(0, 7);
    const category = isInBodySource(measurement.source) ? 'inbody' : 'home';
    const bucket = monthMap.get(monthKey) || {};
    const previous = bucket[category];

    if (!previous || measurement.date >= previous.date) {
      bucket[category] = { ...measurement, weight };
    }
    monthMap.set(monthKey, bucket);
  });

  const keys = Array.from(monthMap.keys()).sort();

  return {
    keys,
    labels: keys.map((key) => `${key.slice(5, 7)}/${key.slice(0, 4)}`),
    inbodyData: keys.map((key) => monthMap.get(key)?.inbody?.weight ?? null),
    homeData: keys.map((key) => monthMap.get(key)?.home?.weight ?? null),
    inbodyMeta: keys.map((key) => monthMap.get(key)?.inbody || null),
    homeMeta: keys.map((key) => monthMap.get(key)?.home || null)
  };
}

export function computeSessionVolume(session) {
  if (!session || !Array.isArray(session.exercises)) return 0;
  let total = 0;
  for (const ex of session.exercises) {
    if (ex.isCardio || !Array.isArray(ex.sets)) continue;
    for (const set of ex.sets) {
      if (!set.completed) continue;
      const weight = Number(set.weight);
      const reps = Number(set.reps);
      if (Number.isFinite(weight) && weight > 0 && Number.isFinite(reps) && reps > 0) {
        total += weight * reps;
      }
    }
  }
  return Math.round(total);
}
