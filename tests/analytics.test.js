import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getInitials,
  computeProfileStats,
  computeComposition,
  buildMonthlyWeightSeries,
  computeSessionVolume
} from '../js/services/analytics-calc.js';

test('getInitials obtiene iniciales limpias o AT por defecto', () => {
  assert.equal(getInitials('Michael Meneses'), 'MM');
  assert.equal(getInitials('Ana'), 'AN');
  assert.equal(getInitials('  '), 'AT');
});

test('computeProfileStats usa el peso cronológicamente más reciente sin ignorar báscula hogar', () => {
  const stats = computeProfileStats(
    { startWeight: 82.0, currentWeight: 82.0 },
    [
      { date: '2026-09-01', source: 'Smart Fit (InBody multicanal)', weight: 80.0, fatFreeMass: 56.0, fatMassKg: 24.0, bodyFatPercent: 30.0 },
      { date: '2026-10-10', source: 'Eufy Life (Báscula hogar)', weight: 78.2 }
    ]
  );

  assert.equal(stats.currentWeight, 78.2);
  assert.equal(stats.weightDiff, -3.8);
  assert.equal(stats.fatFreeMass, 56.0);
  assert.equal(stats.bodyFatPercent, 30.0);
});

test('computeComposition topa pureFatPercent en 100% cuando hay ganancia muscular sobre pérdida de peso', () => {
  const comp = computeComposition([
    { date: '2026-09-01', source: 'Smart Fit (InBody multicanal)', weight: 80.0, fatMassKg: 20.0, fatFreeMass: 60.0 },
    { date: '2026-10-01', source: 'Smart Fit (InBody multicanal)', weight: 79.0, fatMassKg: 17.5, fatFreeMass: 61.5 }
  ]);

  assert.equal(comp.weightLost, 1.0);
  assert.equal(comp.fatLost, 2.5);
  assert.equal(comp.rawFatPercent, 250);
  assert.equal(comp.pureFatPercent, 100);
});

test('buildMonthlyWeightSeries separa series de InBody y hogar en el mismo mes y día', () => {
  const series = buildMonthlyWeightSeries([
    { date: '2026-10-05', source: 'Eufy Life (Báscula hogar)', weight: 77.6 },
    { date: '2026-10-05', source: 'Smart Fit (InBody multicanal)', weight: 78.1 }
  ]);

  assert.deepEqual(series.keys, ['2026-10']);
  assert.deepEqual(series.homeData, [77.6]);
  assert.deepEqual(series.inbodyData, [78.1]);
});

test('computeSessionVolume suma solo series de fuerza completadas con peso > 0', () => {
  const volume = computeSessionVolume({
    exercises: [
      {
        exerciseId: 'chest_press',
        isCardio: false,
        sets: [
          { weight: 40, reps: 10, completed: true },
          { weight: 40, reps: 8, completed: true },
          { weight: 40, reps: 8, completed: false }
        ]
      },
      {
        exerciseId: 'cardio_z2',
        isCardio: true,
        sets: [{ weight: 20, reps: 20, completed: true }]
      }
    ]
  });

  assert.equal(volume, 720);
});
