// Lógica pura de sobrecarga progresiva ("Smart Coach") y parsing de cargas base.
// Separada de db.js para poder testearla sin localStorage.

const SMALL_INCREMENT_IDS = new Set([
  'shoulder_press',
  'shoulder_press_t2',
  'lateral_raise_machine',
  'cable_lateral_raise',
  'rear_delt_face_pull',
  'face_pull',
  'biceps_cable_curl',
  'biceps_curl_t2',
  'triceps_pushdown',
  'triceps_extension_t2',
  'ab_crunch_machine'
]);

export function parseBaseWeight(baseWeight) {
  if (typeof baseWeight === 'number') {
    return Number.isFinite(baseWeight) && baseWeight > 0 ? baseWeight : '';
  }
  const raw = String(baseWeight || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  if (lower === 'pendiente' || lower === 'auto' || lower === 'corporal') return '';
  const match = raw.match(/^\d+(?:[.,]\d+)?/);
  if (!match) return '';
  const parsed = Number(match[0].replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : '';
}

export function parseRepRange(defaultReps = '8-10') {
  const repsStr = String(defaultReps || '8-10');
  const parts = repsStr.match(/\d+/g);
  if (!parts || parts.length === 0) return null;
  const min = parseInt(parts[0], 10);
  const max = parts.length > 1 ? parseInt(parts[1], 10) : min;
  return { raw: repsStr, min, max };
}

export function getProgressiveOverloadSuggestion(exerciseDef, prevLog, customMeta = null) {
  if (!exerciseDef || exerciseDef.isCardio) return null;
  const exerciseId = exerciseDef.id || exerciseDef.exerciseId;
  if (!exerciseId) return null;

  if (!prevLog || !Array.isArray(prevLog.sets) || prevLog.sets.length === 0) return null;

  // Si el usuario fijó un peso objetivo después de la última sesión,
  // respetamos su decisión y no proponemos otra cosa.
  if (customMeta && Number(customMeta.updatedAt) > (prevLog.sessionUpdatedAt || 0)) {
    return null;
  }

  const repRange = parseRepRange(exerciseDef.defaultReps);
  if (!repRange) return null;

  const baseNumeric = parseBaseWeight(exerciseDef.baseWeight);
  const currentTargetWeight = Number(prevLog.bestWeight) || (typeof baseNumeric === 'number' ? baseNumeric : 0);
  if (!currentTargetWeight || currentTargetWeight <= 0) return null;

  const targetSets = Number(exerciseDef.defaultSets) || prevLog.sets.length || 3;
  const setsAtTargetWeight = prevLog.sets.filter(
    (set) => set.completed && (Number(set.weight) || 0) >= currentTargetWeight
  );

  const increment = SMALL_INCREMENT_IDS.has(exerciseId) ? 2.5 : 5;
  const nextWeight = Math.round((currentTargetWeight + increment) * 10) / 10;

  if (setsAtTargetWeight.length < targetSets) {
    return {
      shouldUpgrade: false,
      exerciseId,
      previousWeight: Number(prevLog.bestWeight) || currentTargetWeight,
      targetRepRange: repRange.raw,
      targetSets,
      completedSets: setsAtTargetWeight.length,
      minTargetReps: repRange.min,
      maxTargetReps: repRange.max,
      currentTargetWeight,
      increment,
      nextWeight,
      nextReps: repRange.min,
      progressHint: `Te ${targetSets - setsAtTargetWeight.length === 1 ? 'falta 1 serie' : `faltan ${targetSets - setsAtTargetWeight.length} series`} con ${currentTargetWeight} kg para optar a +${increment} kg.`
    };
  }

  const bestRepsAtWeight = Math.max(...setsAtTargetWeight.map((set) => Number(set.reps) || 0));
  const allSetsMetMin = setsAtTargetWeight.every((set) => (Number(set.reps) || 0) >= repRange.min);

  if (bestRepsAtWeight >= repRange.max && allSetsMetMin) {
    return {
      shouldUpgrade: true,
      exerciseId,
      previousWeight: Number(prevLog.bestWeight) || currentTargetWeight,
      previousReps: bestRepsAtWeight,
      targetRepRange: repRange.raw,
      targetSets,
      completedSets: setsAtTargetWeight.length,
      minTargetReps: repRange.min,
      maxTargetReps: repRange.max,
      currentTargetWeight,
      increment,
      nextWeight,
      nextReps: repRange.min
    };
  }

  let progressHint = '';
  if (!allSetsMetMin) {
    progressHint = `Lleva todas las series al mínimo de ${repRange.min} reps con ${currentTargetWeight} kg para subir a ${nextWeight} kg.`;
  } else {
    const missingReps = Math.max(1, repRange.max - bestRepsAtWeight);
    progressHint = `A ${missingReps} rep${missingReps === 1 ? '' : 's'} de alcanzar ${repRange.max} reps y subir a ${nextWeight} kg (+${increment} kg).`;
  }

  return {
    shouldUpgrade: false,
    exerciseId,
    previousWeight: Number(prevLog.bestWeight) || currentTargetWeight,
    previousReps: bestRepsAtWeight,
    targetRepRange: repRange.raw,
    targetSets,
    completedSets: setsAtTargetWeight.length,
    minTargetReps: repRange.min,
    maxTargetReps: repRange.max,
    currentTargetWeight,
    increment,
    nextWeight,
    nextReps: repRange.min,
    progressHint
  };
}
