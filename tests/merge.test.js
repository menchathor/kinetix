import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toTimestamp,
  normalizeWorkout,
  workoutVersion,
  mergeWorkouts,
  normalizeMeasurement,
  mergeMeasurements,
  mergeCustomWeights,
  mergeNutrition,
  isTombstoned,
  pruneTombstones,
  measurementKey,
  mergeTapeMeasurements,
  mergeSleepLogs,
  mergeTrainingPauses
} from '../js/services/merge.js';

test('toTimestamp acepta ISO, números y valores inválidos', () => {
  assert.equal(toTimestamp(0), 0);
  assert.equal(toTimestamp(''), 0);
  assert.equal(toTimestamp('no-es-fecha'), 0);
  assert.equal(toTimestamp('2026-10-19T12:00:00.000Z'), Date.parse('2026-10-19T12:00:00.000Z'));
});

test('normalizeWorkout genera id, sessionId y updatedAt', () => {
  const normalized = normalizeWorkout({
    sessionId: 's1',
    routineId: 'torso1',
    date: '2026-10-19',
    startTime: '2026-10-19T18:00:00.000Z'
  });
  assert.equal(normalized.id, 's1');
  assert.equal(normalized.sessionId, 's1');
  assert.equal(normalized.date, '2026-10-19');
  assert.ok(normalized.updatedAt > 0);
});

test('mergeWorkouts: gana el updatedAt más reciente', () => {
  const local = [{
    id: 's1', sessionId: 's1', routineName: 'Local',
    startTime: '2026-10-01T18:00:00.000Z', updatedAt: 1000
  }];
  const cloud = [{
    id: 's1', sessionId: 's1', routineName: 'Nube',
    startTime: '2026-10-01T18:00:00.000Z', updatedAt: 2000
  }];
  const merged = mergeWorkouts(local, cloud, {});
  assert.equal(merged.length, 1);
  assert.equal(merged[0].routineName, 'Nube');
});

test('mergeWorkouts: local gana en empate', () => {
  const local = [{ id: 's1', sessionId: 's1', routineName: 'Local', updatedAt: 1000, startTime: '2026-10-01T18:00:00.000Z' }];
  const cloud = [{ id: 's1', sessionId: 's1', routineName: 'Nube', updatedAt: 1000, startTime: '2026-10-01T18:00:00.000Z' }];
  const merged = mergeWorkouts(local, cloud, {});
  assert.equal(merged[0].routineName, 'Local');
});

test('mergeWorkouts: un tombstone impide resucitar una sesión', () => {
  const cloud = [{ id: 's1', sessionId: 's1', startTime: '2026-10-01T18:00:00.000Z', updatedAt: 1000 }];
  const tombstones = { workouts: { s1: { deletedAt: 2000 } } };
  const merged = mergeWorkouts([], cloud, tombstones);
  assert.equal(merged.length, 0);
});

test('isTombstoned respeta un registro más nuevo que el borrado', () => {
  const tombstones = { workouts: { s1: { deletedAt: 1000 } } };
  assert.equal(isTombstoned(tombstones, 'workouts', 's1', 900), true);
  assert.equal(isTombstoned(tombstones, 'workouts', 's1', 1100), false);
  assert.equal(isTombstoned(tombstones, 'workouts', 'otro', 1100), false);
});

test('normalizeMeasurement unifica weight/weightKg y alias de grasa', () => {
  const measurement = normalizeMeasurement({
    date: '2026-10-19',
    weight: 80,
    fatPercent: 20,
    fatMass: 16,
    muscleMass: 36
  });
  assert.equal(measurement.weight, 80);
  assert.equal(measurement.weightKg, 80);
  assert.equal(measurement.fatPercent, 20);
  assert.equal(measurement.bodyFatPercent, 20);
  assert.equal(measurement.fatMassKg, 16);
  assert.equal(measurement.muscleMassKg, 36);
});

test('mergeMeasurements respeta updatedAt y tombstones', () => {
  const local = [{ date: '2026-10-19', weight: 80, updatedAt: 1000 }];
  const cloud = [
    { date: '2026-10-19', weightKg: 81, updatedAt: 2000 },
    { date: '2026-10-18', weightKg: 82, updatedAt: 2000 }
  ];
  const merged = mergeMeasurements(local, cloud, { measurements: { '2026-10-17': { deletedAt: 3000 } } });
  assert.equal(merged.find(m => m.date === '2026-10-19').weight, 81);
  assert.equal(merged.find(m => m.date === '2026-10-18').weight, 82);
  assert.equal(merged.length, 2);
});

test('mergeCustomWeights usa el updatedAt de cada máquina', () => {
  const local = { chest_press: { weight: 40, updatedAt: 1000 }, leg_press: { weight: 75, updatedAt: 3000 } };
  const cloud = { chest_press: { weight: 45, updatedAt: 2000 }, leg_press: { weight: 70, updatedAt: 2000 } };
  const merged = mergeCustomWeights(local, cloud);
  assert.equal(merged.chest_press.weight, 45);
  assert.equal(merged.leg_press.weight, 75);
});

test('mergeCustomWeights migra valores numéricos antiguos', () => {
  const merged = mergeCustomWeights({ chest_press: 40 }, {});
  assert.deepEqual(merged.chest_press, { weight: 40, updatedAt: 1 });
});

test('mergeNutrition gana el updatedAt más reciente', () => {
  const local = { date: '2026-10-19', waterMl: 500, updatedAt: 1000 };
  const cloud = { date: '2026-10-19', waterMl: 1000, updatedAt: 2000 };
  assert.equal(mergeNutrition(local, cloud).waterMl, 1000);
  assert.equal(mergeNutrition(cloud, local).waterMl, 1000);
});

test('pruneTombstones elimina registros antiguos', () => {
  const now = Date.now();
  const pruned = pruneTombstones({
    workouts: {
      old: { deletedAt: now - 1000 * 60 * 60 * 24 * 120 },
      recent: { deletedAt: now - 1000 }
    }
  });
  assert.equal(pruned.workouts.old, undefined);
  assert.ok(pruned.workouts.recent);
});

test('workoutVersion usa updatedAt o startTime', () => {
  assert.equal(workoutVersion({ updatedAt: 5000, startTime: '2026-01-01T00:00:00.000Z' }), 5000);
  assert.ok(workoutVersion({ startTime: '2026-01-01T00:00:00.000Z' }) > 0);
});

test('mergeMeasurements conserva mediciones hogar e InBody el mismo día y respeta tombstone por fuente', () => {
  const local = [
    { date: '2026-10-19', source: 'Eufy Life (Báscula hogar)', weight: 78.4, updatedAt: 1000 }
  ];
  const cloud = [
    { date: '2026-10-19', source: 'Smart Fit (InBody multicanal)', weight: 78.9, bodyFatPercent: 20.1, updatedAt: 2000 },
    { date: '2026-10-18', source: 'Smart Fit (InBody multicanal)', weight: 79.1, updatedAt: 1000 }
  ];
  const inbodyTombKey = measurementKey({ date: '2026-10-18', source: 'Smart Fit (InBody multicanal)' });
  const merged = mergeMeasurements(local, cloud, {
    measurements: {
      [inbodyTombKey]: { deletedAt: 3000 }
    }
  });

  assert.equal(merged.length, 2);
  assert.equal(merged[0].date, '2026-10-19');
  assert.match(merged[0].source, /InBody/i);
  assert.equal(merged[1].date, '2026-10-19');
  assert.match(merged[1].source, /Báscula hogar/i);
});

test('mergeTapeMeasurements aplica LWW por fecha y respeta tombstones', () => {
  const local = [
    { date: '2026-11-14', waistCm: 92.5, hipCm: 101.0, updatedAt: 2000 }
  ];
  const cloud = [
    { date: '2026-11-14', waistCm: 93.0, updatedAt: 1000 },
    { date: '2026-11-01', waistCm: 94.0, updatedAt: 1000 },
    { date: '2026-10-20', waistCm: 95.5, updatedAt: 1500 }
  ];
  const merged = mergeTapeMeasurements(local, cloud, {
    tape: {
      '2026-11-01': { deletedAt: 2500 }
    }
  });

  assert.equal(merged.length, 2);
  assert.equal(merged[0].date, '2026-11-14');
  assert.equal(merged[0].waistCm, 92.5);
  assert.equal(merged[0].hipCm, 101.0);
  assert.equal(merged[1].date, '2026-10-20');
});

test('mergeSleepLogs aplica LWW por fecha, preserva factores y respeta tombstones', () => {
  const local = [
    { date: '2026-11-13', hours: 4.0, quality: 2, factors: ['stress'], updatedAt: 1500 }
  ];
  const cloud = [
    { date: '2026-11-13', hours: 4.5, quality: 3, bedtime: '01:30', wakeTime: '06:00', factors: ['stress', 'screens'], updatedAt: 3000 },
    { date: '2026-11-10', hours: 3.5, updatedAt: 1000 },
    { date: '2026-11-12', hours: 4.0, quality: 2, factors: ['wakeups'], updatedAt: 2000 }
  ];
  const merged = mergeSleepLogs(local, cloud, {
    sleep: {
      '2026-11-10': { deletedAt: 2500 }
    }
  });

  assert.equal(merged.length, 2);
  assert.equal(merged[0].date, '2026-11-13');
  assert.equal(merged[0].hours, 4.5);
  assert.equal(merged[0].bedtime, '01:30');
  assert.deepEqual(merged[0].factors, ['stress', 'screens']);
  assert.equal(merged[1].date, '2026-11-12');
});

test('mergeTrainingPauses aplica LWW por pauseId y respeta tombstones', () => {
  const local = [
    {
      pauseId: 'p1',
      startDate: '2026-11-16',
      endDate: '2026-11-22',
      reason: 'illness',
      title: 'Resfrío fuerte',
      updatedAt: 2000
    }
  ];
  const cloud = [
    {
      pauseId: 'p1',
      startDate: '2026-11-16',
      endDate: '2026-11-20',
      reason: 'illness',
      title: 'Resfrío leve',
      updatedAt: 1000
    },
    {
      pauseId: 'p_deleted',
      startDate: '2026-10-05',
      endDate: '2026-10-08',
      reason: 'travel',
      updatedAt: 1000
    },
    {
      pauseId: 'p2',
      startDate: '2026-10-18',
      endDate: '2026-10-20',
      reason: 'travel',
      title: 'Viaje a Osorno donde Francisca',
      updatedAt: 1500
    }
  ];

  const merged = mergeTrainingPauses(local, cloud, {
    pauses: {
      p_deleted: { deletedAt: 2500 }
    }
  });

  assert.equal(merged.length, 2);
  assert.equal(merged[0].pauseId, 'p1');
  assert.equal(merged[0].endDate, '2026-11-22');
  assert.equal(merged[0].title, 'Resfrío fuerte');
  assert.equal(merged[1].pauseId, 'p2');
});
