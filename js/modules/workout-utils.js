// Helpers compartidos entre el controlador y las plantillas del entreno.
import { CONFIG } from '../config.js';
import { db } from '../services/db.js';

export function getExerciseDefinition(routine, exerciseId) {
  return (routine?.exercises || []).find(exercise => exercise.id === exerciseId) || {};
}

export function restSeconds() {
  return Number(db.getSettings().timerDurationSeconds) || CONFIG.DEFAULT_REST_SECONDS;
}
