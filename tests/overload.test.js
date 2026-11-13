import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBaseWeight,
  parseRepRange,
  getProgressiveOverloadSuggestion
} from '../js/services/overload.js';

test('parseBaseWeight convierte cadenas numéricas y descarta textos no numéricos', () => {
  assert.equal(parseBaseWeight(40), 40);
  assert.equal(parseBaseWeight('33'), 33);
  assert.equal(parseBaseWeight('22,5'), 22.5);
  assert.equal(parseBaseWeight('Pendiente'), '');
  assert.equal(parseBaseWeight('Auto'), '');
  assert.equal(parseBaseWeight('Corporal'), '');
  assert.equal(parseBaseWeight(''), '');
});

test('parseRepRange extrae rango mínimo y máximo', () => {
  assert.deepEqual(parseRepRange('8-10'), { raw: '8-10', min: 8, max: 10 });
  assert.deepEqual(parseRepRange('12'), { raw: '12', min: 12, max: 12 });
  assert.equal(parseRepRange('libre'), null);
});

test('getProgressiveOverloadSuggestion propone +5 kg en compuestos al cumplir tope de reps en todas las series', () => {
  const suggestion = getProgressiveOverloadSuggestion(
    { id: 'chest_press', defaultSets: 3, defaultReps: '8-10', baseWeight: '40' },
    {
      bestWeight: 40,
      sessionUpdatedAt: 1000,
      sets: [
        { weight: 40, reps: 10, completed: true },
        { weight: 40, reps: 9, completed: true },
        { weight: 40, reps: 8, completed: true }
      ]
    }
  );

  assert.equal(suggestion.shouldUpgrade, true);
  assert.equal(suggestion.increment, 5);
  assert.equal(suggestion.nextWeight, 45);
  assert.equal(suggestion.nextReps, 8);
});

test('getProgressiveOverloadSuggestion propone +2.5 kg en ejercicios de aislamiento/hombro', () => {
  const suggestion = getProgressiveOverloadSuggestion(
    { id: 'lateral_raise_machine', defaultSets: 3, defaultReps: '10-12', baseWeight: '15' },
    {
      bestWeight: 15,
      sessionUpdatedAt: 1000,
      sets: [
        { weight: 15, reps: 12, completed: true },
        { weight: 15, reps: 11, completed: true },
        { weight: 15, reps: 10, completed: true }
      ]
    }
  );

  assert.equal(suggestion.shouldUpgrade, true);
  assert.equal(suggestion.increment, 2.5);
  assert.equal(suggestion.nextWeight, 17.5);
  assert.equal(suggestion.nextReps, 10);
});

test('getProgressiveOverloadSuggestion devuelve progressHint cuando aún faltan reps o series', () => {
  const lackingReps = getProgressiveOverloadSuggestion(
    { id: 'chest_press', defaultSets: 3, defaultReps: '8-10', baseWeight: '40' },
    {
      bestWeight: 40,
      sessionUpdatedAt: 1000,
      sets: [
        { weight: 40, reps: 9, completed: true },
        { weight: 40, reps: 8, completed: true },
        { weight: 40, reps: 8, completed: true }
      ]
    }
  );
  assert.equal(lackingReps.shouldUpgrade, false);
  assert.match(lackingReps.progressHint, /1 rep/);

  const lackingSets = getProgressiveOverloadSuggestion(
    { id: 'chest_press', defaultSets: 3, defaultReps: '8-10', baseWeight: '40' },
    {
      bestWeight: 40,
      sessionUpdatedAt: 1000,
      sets: [
        { weight: 40, reps: 10, completed: true },
        { weight: 40, reps: 10, completed: true },
        { weight: 40, reps: 10, completed: false }
      ]
    }
  );
  assert.equal(lackingSets.shouldUpgrade, false);
  assert.match(lackingSets.progressHint, /falta 1 serie/);
});

test('getProgressiveOverloadSuggestion respeta peso manual más reciente que la sesión', () => {
  const suggestion = getProgressiveOverloadSuggestion(
    { id: 'chest_press', defaultSets: 3, defaultReps: '8-10', baseWeight: '40' },
    {
      bestWeight: 40,
      sessionUpdatedAt: 1000,
      sets: [
        { weight: 40, reps: 10, completed: true },
        { weight: 40, reps: 10, completed: true },
        { weight: 40, reps: 10, completed: true }
      ]
    },
    { weight: 42.5, updatedAt: 2000 }
  );

  assert.equal(suggestion, null);
});
