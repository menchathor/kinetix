import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeWaistStats,
  computeSleepDurationHours,
  computeSleepSummary
} from '../js/services/wellness-calc.js';

test('computeWaistStats calcula índice cintura/estatura, meta 0.5 y deltas', () => {
  const stats = computeWaistStats([
    { date: '2026-09-14', waistCm: 97.0 },
    { date: '2026-11-14', waistCm: 91.5 }
  ], 173);

  assert.equal(stats.count, 2);
  assert.equal(stats.targetWaistCm, 86.5);
  assert.equal(stats.deltaFromFirst, -5.5);
  assert.equal(stats.deltaFromPrevious, -5.5);
  assert.equal(stats.waistToHeightRatio, 0.53);
  assert.equal(stats.ratioStatus.level, 'improving');
});

test('computeWaistStats clasifica rango óptimo y vacío correctamente', () => {
  const empty = computeWaistStats([], 173);
  assert.equal(empty.count, 0);
  assert.equal(empty.targetWaistCm, 86.5);

  const optimal = computeWaistStats([{ date: '2026-12-01', waistCm: 84.0 }], 173);
  assert.equal(optimal.waistToHeightRatio, 0.49);
  assert.equal(optimal.ratioStatus.level, 'optimal');
});

test('computeSleepDurationHours calcula duración normal y cruce de medianoche', () => {
  assert.equal(computeSleepDurationHours('23:30', '06:30'), 7);
  assert.equal(computeSleepDurationHours('02:00', '05:30'), 3.5);
  assert.equal(computeSleepDurationHours('01:45', '05:45'), 4);
  assert.equal(computeSleepDurationHours('', '06:30'), null);
});

test('computeSleepSummary detecta alerta crítica con promedios de 3 a 4 horas', () => {
  const logs = [
    { date: '2026-11-10', hours: 3.5, quality: 2 },
    { date: '2026-11-11', hours: 4.0, quality: 2 },
    { date: '2026-11-12', hours: 3.0, quality: 1 },
    { date: '2026-11-13', hours: 4.0, quality: 2 }
  ];
  const summary = computeSleepSummary(logs, 7.5);

  assert.equal(summary.count, 4);
  assert.equal(summary.avgHours7, 3.6);
  assert.equal(summary.weeklyDebtHours, 15.5);
  assert.equal(summary.status.level, 'critical');
  assert.equal(summary.status.tone, 'rose');
});

test('computeSleepSummary clasifica estado insuficiente y óptimo', () => {
  const warning = computeSleepSummary([{ date: '2026-11-14', hours: 6.2, quality: 3 }], 7.5);
  assert.equal(warning.status.level, 'warning');

  const optimal = computeSleepSummary([{ date: '2026-11-14', hours: 7.5, quality: 5 }], 7.5);
  assert.equal(optimal.status.level, 'optimal');
  assert.equal(optimal.weeklyDebtHours, 0);
});
