// Cálculos puros para cinta métrica (cintura/estatura) y sueño/recuperación.
import { toNumber } from '../utils/escape.js';

export const SLEEP_TARGET_HOURS = 7.5;

export const SLEEP_FACTORS = [
  { id: 'stress', label: 'Estrés / carga mental' },
  { id: 'caffeine', label: 'Cafeína tarde' },
  { id: 'screens', label: 'Pantallas antes de dormir' },
  { id: 'late_dinner', label: 'Cena pesada o tardía' },
  { id: 'late_training', label: 'Entreno tarde' },
  { id: 'wakeups', label: 'Despertares nocturnos' }
];

function round1(val) {
  return Math.round((Number(val) || 0) * 10) / 10;
}

/**
 * Calcula estadísticas clínicas de cintura y perímetros corporales.
 */
export function computeWaistStats(tapeLogs = [], heightCm = 173) {
  const ascending = [...(tapeLogs || [])]
    .filter((item) => item && item.date && Number(item.waistCm) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const safeHeight = Number(heightCm) > 0 ? Number(heightCm) : 173;
  const targetWaistCm = round1(safeHeight * 0.5);

  if (ascending.length === 0) {
    return {
      count: 0,
      latest: null,
      first: null,
      previous: null,
      deltaFromFirst: null,
      deltaFromPrevious: null,
      waistToHeightRatio: null,
      ratioStatus: null,
      targetWaistCm
    };
  }

  const first = ascending[0];
  const latest = ascending[ascending.length - 1];
  const previous = ascending.length >= 2 ? ascending[ascending.length - 2] : null;

  const latestWaist = toNumber(latest.waistCm);
  const deltaFromFirst = ascending.length >= 2 ? round1(latestWaist - toNumber(first.waistCm)) : null;
  const deltaFromPrevious = previous ? round1(latestWaist - toNumber(previous.waistCm)) : null;
  const ratio = Math.round((latestWaist / safeHeight) * 100) / 100;

  let ratioStatus;
  if (ratio < 0.5) {
    ratioStatus = { level: 'optimal', label: 'Rango óptimo (<0.50)', tone: 'emerald' };
  } else if (ratio <= 0.55) {
    ratioStatus = { level: 'improving', label: 'Zona de mejora (0.50–0.55)', tone: 'amber' };
  } else {
    ratioStatus = { level: 'elevated', label: 'Riesgo central (>0.55)', tone: 'rose' };
  }

  return {
    count: ascending.length,
    ascending,
    latest,
    first,
    previous,
    deltaFromFirst,
    deltaFromPrevious,
    waistToHeightRatio: ratio,
    ratioStatus,
    targetWaistCm
  };
}

/**
 * Calcula horas dormidas entre hora de acostarse y despertar (soporta cruce de medianoche).
 */
export function computeSleepDurationHours(bedtime, wakeTime) {
  const parseTime = (str) => {
    const match = String(str || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  };

  const startMin = parseTime(bedtime);
  const endMin = parseTime(wakeTime);
  if (startMin === null || endMin === null) return null;

  let diff = endMin - startMin;
  if (diff <= 0) diff += 24 * 60;
  return round1(diff / 60);
}

/**
 * Resume las noches registradas, deuda semanal de sueño y recomendación fisiológica.
 */
export function computeSleepSummary(sleepLogs = [], targetHours = SLEEP_TARGET_HOURS) {
  const goal = Number(targetHours) > 0 ? Number(targetHours) : SLEEP_TARGET_HOURS;
  const ascending = [...(sleepLogs || [])]
    .filter((item) => item && item.date && Number.isFinite(Number(item.hours)))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (ascending.length === 0) {
    return {
      count: 0,
      latest: null,
      recent7: [],
      recent14: [],
      avgHours7: null,
      avgQuality7: null,
      weeklyDebtHours: null,
      status: {
        level: 'empty',
        label: 'Sin registros aún',
        tone: 'slate',
        headline: 'Registra tu descanso de anoche para evaluar recuperación',
        advice: 'Dormir menos de 6 h eleva el cortisol, retiene agua y frena la pérdida de grasa abdominal.'
      }
    };
  }

  const latest = ascending[ascending.length - 1];
  const recent7 = ascending.slice(-7);
  const recent14 = ascending.slice(-14);

  const totalHours7 = recent7.reduce((sum, item) => sum + toNumber(item.hours), 0);
  const avgHours7 = round1(totalHours7 / recent7.length);
  const weeklyDebtHours = round1(
    recent7.reduce((sum, item) => sum + Math.max(0, goal - toNumber(item.hours)), 0)
  );

  const rated7 = recent7.filter((item) => Number(item.quality) >= 1);
  const avgQuality7 = rated7.length > 0
    ? round1(rated7.reduce((sum, item) => sum + Number(item.quality), 0) / rated7.length)
    : null;

  let status;
  if (avgHours7 < 5.5) {
    status = {
      level: 'critical',
      label: 'Déficit severo',
      tone: 'rose',
      headline: `Promedio de ${avgHours7} h/noche: alerta de recuperación`,
      advice: 'Con menos de 5.5 h sube el cortisol, aumenta el apetito y sube la retención hídrica (puede ocultar pérdida de grasa en báscula). Prioriza técnica con RPE moderado (sin forzar PRs) y no bajes calorías hoy.'
    };
  } else if (avgHours7 < 6.8) {
    status = {
      level: 'warning',
      label: 'Sueño insuficiente',
      tone: 'amber',
      headline: `Promedio de ${avgHours7} h/noche: margen de mejora`,
      advice: 'Estás por debajo de la zona óptima (7–8 h). Corta cafeína antes de las 14:00, baja pantallas 45 min antes de dormir y apunta a acostarte 30–45 min antes hoy.'
    };
  } else {
    status = {
      level: 'optimal',
      label: 'Recuperación óptima',
      tone: 'emerald',
      headline: `Promedio de ${avgHours7} h/noche: entorno hormonal favorable`,
      advice: 'Buen descanso para sostener la conversión T4 → T3, reparar fibras musculares y controlar la grasa visceral.'
    };
  }

  return {
    count: ascending.length,
    latest,
    recent7,
    recent14,
    avgHours7,
    avgQuality7,
    weeklyDebtHours,
    targetHours: goal,
    status
  };
}

export const PAUSE_REASONS = [
  {
    id: 'illness',
    label: 'Resfrío / Enfermedad',
    tone: 'rose',
    defaultTitle: 'Pausa por resfrío y recuperación',
    guidance: 'Si hay tos, mucosidad o malestar general, parar protege tu sistema inmune y acorta la recaída. Prioriza sueño, líquidos y comer a mantenimiento.'
  },
  {
    id: 'travel',
    label: 'Viaje familiar',
    tone: 'sky',
    defaultTitle: 'Viaje familiar (pausa planificada)',
    guidance: 'Viajar para compartir con tu familia también suma a tu salud. Mantén caminatas e hidratación y al regresar retoma progresivamente.'
  },
  {
    id: 'recovery',
    label: 'Descarga / Sueño',
    tone: 'amber',
    defaultTitle: 'Pausa por descanso y recuperación',
    guidance: 'Cuando el sueño cae varios días seguidos, descargar evita elevar el cortisol y frenar la recuperación hormonal.'
  },
  {
    id: 'work',
    label: 'Trabajo / Agenda',
    tone: 'indigo',
    defaultTitle: 'Pausa por carga laboral',
    guidance: 'No intentes compensar sesiones acumulando fatiga al volver; retoma tu pauta normal con buena técnica.'
  },
  {
    id: 'other',
    label: 'Otro motivo',
    tone: 'slate',
    defaultTitle: 'Pausa de entrenamiento',
    guidance: 'Dejar registrado el motivo evita la sensación de abandono y mantiene tu historial fiel a tu contexto real.'
  }
];

export function getPauseReasonMeta(reasonId) {
  return PAUSE_REASONS.find((item) => item.id === reasonId) || PAUSE_REASONS[PAUSE_REASONS.length - 1];
}

export function addDaysToDateKey(dateStr, days = 0) {
  const match = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(dateStr || '');
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + Number(days || 0), 12, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computePauseDaysCount(startDate, endDate) {
  const s = String(startDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const e = String(endDate || startDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!s || !e) return 1;
  const startUtc = Date.UTC(Number(s[1]), Number(s[2]) - 1, Number(s[3]));
  const endUtc = Date.UTC(Number(e[1]), Number(e[2]) - 1, Number(e[3]));
  const diffDays = Math.round((endUtc - startUtc) / 86400000) + 1;
  return Math.max(1, diffDays);
}

export function findActivePauseForDate(pauses = [], dateStr) {
  if (!dateStr || !Array.isArray(pauses)) return null;
  const matches = pauses.filter((p) => {
    if (!p || !p.startDate) return false;
    const end = p.endDate || p.startDate;
    return p.startDate <= dateStr && dateStr <= end;
  });
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0))[0];
}

export function summarizeTrainingPauses(pauses = [], referenceDateStr) {
  const sorted = [...(pauses || [])]
    .filter((p) => p && p.startDate)
    .sort((a, b) => {
      const byStart = (b.startDate || '').localeCompare(a.startDate || '');
      if (byStart !== 0) return byStart;
      return (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0);
    });
  const totalDays = sorted.reduce((sum, p) => sum + computePauseDaysCount(p.startDate, p.endDate), 0);
  const activePause = referenceDateStr ? findActivePauseForDate(sorted, referenceDateStr) : null;
  return {
    total: sorted.length,
    totalDays,
    activePause,
    list: sorted
  };
}
