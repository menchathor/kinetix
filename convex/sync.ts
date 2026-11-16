import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertSyncKey } from "./lib/auth";

function isInBodySource(source?: string): boolean {
  return String(source || "").toLowerCase().includes("inbody");
}

// Sincronización masiva de datos locales a la nube.
// Además de subir, procesa eliminaciones pendientes (tombstones) para que un
// borrado hecho offline no resucite en el siguiente pull.
export const bulkSync = mutation({
  args: {
    syncKey: v.string(),
    workouts: v.optional(v.array(v.any())),
    measurements: v.optional(v.array(v.any())),
    customWeights: v.optional(v.any()),
    tapeMeasurements: v.optional(v.array(v.any())),
    sleepLogs: v.optional(v.array(v.any())),
    trainingPauses: v.optional(v.array(v.any())),
    deletions: v.optional(v.array(v.object({
      type: v.string(),
      key: v.string(),
      deletedAt: v.optional(v.number()),
    }))),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);

    let workoutsSynced = 0;
    let measurementsSynced = 0;
    let customWeightsSynced = 0;
    let tapeSynced = 0;
    let sleepSynced = 0;
    let pausesSynced = 0;
    let deletionsApplied = 0;

    if (args.workouts && Array.isArray(args.workouts)) {
      for (const w of args.workouts) {
        if (!w.id && !w.sessionId) continue;
        const sessionId = w.sessionId || w.id;
        const existing = await ctx.db
          .query("workouts")
          .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
          .first();

        const now = Date.now();
        const doc = {
          sessionId,
          routineId: w.routineId || "general",
          routineName: w.routineName || "Sesión",
          dayName: w.dayName || "",
          startTime: w.startTime || (w.date ? (w.date.includes("T") ? w.date : w.date + "T18:00:00.000Z") : new Date().toISOString()),
          endTime: w.endTime,
          durationMinutes: w.durationMinutes || 0,
          cardioDone: !!w.cardioDone,
          cardioMinutes: w.cardioMinutes,
          exercises: (w.exercises || []).map((ex: any) => ({
            exerciseId: ex.exerciseId || ex.id || "unknown",
            exerciseName: ex.exerciseName || ex.name || "",
            isCardio: !!ex.isCardio,
            minutes: ex.minutes === undefined ? undefined : Number(ex.minutes) || 0,
            sets: (ex.sets || []).map((s: any) => ({
              setNumber: Number(s.setNumber) || 1,
              weight: s.weight ?? "",
              reps: s.reps ?? "",
              completed: !!s.completed,
              rpe: s.rpe || "",
            })),
            notes: ex.notes || "",
          })),
          notes: w.notes || "",
          createdAt: w.startTime ? new Date(w.startTime).getTime() : now,
          updatedAt: Number(w.updatedAt) || now,
        };

        if (existing) {
          await ctx.db.patch(existing._id, doc);
        } else {
          await ctx.db.insert("workouts", doc);
        }
        workoutsSynced++;
      }
    }

    if (args.measurements && Array.isArray(args.measurements)) {
      for (const m of args.measurements) {
        if (!m.date) continue;
        const candidates = await ctx.db
          .query("measurements")
          .withIndex("by_date", (q) => q.eq("date", m.date))
          .collect();
        const targetIsInBody = isInBodySource(m.source);
        const existing = candidates.find((doc) => isInBodySource(doc.source) === targetIsInBody);

        const numOrUndef = (val: any) => (val !== undefined && val !== null && val !== "" && !isNaN(Number(val)) ? Number(val) : undefined);
        const now = Date.now();

        const doc = {
          date: m.date,
          weightKg: Number(m.weightKg || m.weight) || 0,
          bodyFatPercent: numOrUndef(m.bodyFatPercent ?? m.fatPercent),
          fatMassKg: numOrUndef(m.fatMassKg ?? m.fatMass),
          fatFreeMass: numOrUndef(m.fatFreeMass),
          muscleMassKg: numOrUndef(m.muscleMassKg ?? m.muscleMass),
          trunkFat: numOrUndef(m.trunkFat),
          visceralFat: numOrUndef(m.visceralFat),
          waterPercent: numOrUndef(m.waterPercent),
          waterLitres: numOrUndef(m.waterLitres),
          bmr: numOrUndef(m.bmr),
          appendicularLeanIndex: numOrUndef(m.appendicularLeanIndex),
          boneMass: numOrUndef(m.boneMass),
          waistCircumferenceCm: numOrUndef(m.waistCircumferenceCm ?? m.waist),
          notes: m.notes || "",
          source: m.source || "Manual",
          createdAt: m.date ? new Date(m.date).getTime() : now,
          updatedAt: Number(m.updatedAt) || now,
        };

        if (existing) {
          await ctx.db.patch(existing._id, doc);
        } else {
          await ctx.db.insert("measurements", doc);
        }
        measurementsSynced++;
      }
    }

    if (args.customWeights && typeof args.customWeights === "object") {
      for (const [exerciseId, weightVal] of Object.entries(args.customWeights)) {
        const raw = weightVal as any;
        const weight = Number(raw && typeof raw === "object" ? raw.weight : raw);
        if (!exerciseId || isNaN(weight)) continue;

        const existing = await ctx.db
          .query("custom_weights")
          .withIndex("by_exerciseId", (q) => q.eq("exerciseId", exerciseId))
          .first();

        const now = Date.now();
        const updatedAt = raw && typeof raw === "object" && Number(raw.updatedAt)
          ? Number(raw.updatedAt)
          : now;

        if (existing) {
          await ctx.db.patch(existing._id, {
            weight,
            updatedAt,
          });
        } else {
          await ctx.db.insert("custom_weights", {
            exerciseId,
            weight,
            updatedAt,
          });
        }
        customWeightsSynced++;
      }
    }

    if (args.tapeMeasurements && Array.isArray(args.tapeMeasurements)) {
      const numOrUndef = (val: any) => (val !== undefined && val !== null && val !== "" && !isNaN(Number(val)) ? Number(val) : undefined);
      for (const t of args.tapeMeasurements) {
        if (!t?.date || !Number(t.waistCm)) continue;
        const existing = await ctx.db
          .query("tape_measurements")
          .withIndex("by_date", (q) => q.eq("date", t.date))
          .first();
        const now = Date.now();
        const doc = {
          date: t.date,
          waistCm: Number(t.waistCm),
          abdomenCm: numOrUndef(t.abdomenCm),
          hipCm: numOrUndef(t.hipCm),
          chestCm: numOrUndef(t.chestCm),
          armCm: numOrUndef(t.armCm),
          thighCm: numOrUndef(t.thighCm),
          notes: t.notes || "",
          createdAt: t.date ? new Date(t.date).getTime() : now,
          updatedAt: Number(t.updatedAt) || now,
        };
        if (existing) await ctx.db.patch(existing._id, doc);
        else await ctx.db.insert("tape_measurements", doc);
        tapeSynced++;
      }
    }

    if (args.sleepLogs && Array.isArray(args.sleepLogs)) {
      const numOrUndef = (val: any) => (val !== undefined && val !== null && val !== "" && !isNaN(Number(val)) ? Number(val) : undefined);
      for (const s of args.sleepLogs) {
        if (!s?.date || s.hours === undefined || s.hours === null || isNaN(Number(s.hours))) continue;
        const existing = await ctx.db
          .query("sleep_logs")
          .withIndex("by_date", (q) => q.eq("date", s.date))
          .first();
        const now = Date.now();
        const doc = {
          date: s.date,
          hours: Number(s.hours),
          quality: numOrUndef(s.quality),
          bedtime: s.bedtime || undefined,
          wakeTime: s.wakeTime || undefined,
          wakeups: numOrUndef(s.wakeups),
          factors: Array.isArray(s.factors) ? s.factors.map(String) : undefined,
          notes: s.notes || "",
          createdAt: s.date ? new Date(s.date).getTime() : now,
          updatedAt: Number(s.updatedAt) || now,
        };
        if (existing) await ctx.db.patch(existing._id, doc);
        else await ctx.db.insert("sleep_logs", doc);
        sleepSynced++;
      }
    }

    if (args.trainingPauses && Array.isArray(args.trainingPauses)) {
      for (const p of args.trainingPauses) {
        const pauseId = p?.pauseId || p?.id;
        if (!pauseId || !p?.startDate) continue;
        const existing = await ctx.db
          .query("training_pauses")
          .withIndex("by_pauseId", (q) => q.eq("pauseId", String(pauseId)))
          .first();
        const now = Date.now();
        const doc = {
          pauseId: String(pauseId),
          startDate: String(p.startDate),
          endDate: String(p.endDate || p.startDate),
          reason: String(p.reason || "other"),
          title: p.title ? String(p.title) : undefined,
          notes: p.notes ? String(p.notes) : "",
          createdAt: Number(p.createdAt) || now,
          updatedAt: Number(p.updatedAt) || now,
        };
        if (existing) await ctx.db.patch(existing._id, doc);
        else await ctx.db.insert("training_pauses", doc);
        pausesSynced++;
      }
    }

    if (args.deletions && Array.isArray(args.deletions)) {
      for (const deletion of args.deletions) {
        const deletedAt = Number(deletion.deletedAt) || 0;
        if (deletion.type === "workouts") {
          const existing = await ctx.db
            .query("workouts")
            .withIndex("by_sessionId", (q) => q.eq("sessionId", deletion.key))
            .first();
          const existingVersion = existing ? (existing.updatedAt || existing.createdAt || 0) : 0;
          if (existing && (!deletedAt || deletedAt >= existingVersion)) {
            await ctx.db.delete(existing._id);
            deletionsApplied++;
          }
        } else if (deletion.type === "measurements") {
          const [datePart, category] = deletion.key.split("::");
          const candidates = await ctx.db
            .query("measurements")
            .withIndex("by_date", (q) => q.eq("date", datePart))
            .collect();
          for (const existing of candidates) {
            if (category === "inbody" && !isInBodySource(existing.source)) continue;
            if (category === "home" && isInBodySource(existing.source)) continue;
            const existingVersion = existing.updatedAt || existing.createdAt || 0;
            if (!deletedAt || deletedAt >= existingVersion) {
              await ctx.db.delete(existing._id);
              deletionsApplied++;
            }
          }
        } else if (deletion.type === "tape") {
          const existing = await ctx.db
            .query("tape_measurements")
            .withIndex("by_date", (q) => q.eq("date", deletion.key))
            .first();
          const existingVersion = existing ? (existing.updatedAt || existing.createdAt || 0) : 0;
          if (existing && (!deletedAt || deletedAt >= existingVersion)) {
            await ctx.db.delete(existing._id);
            deletionsApplied++;
          }
        } else if (deletion.type === "sleep") {
          const existing = await ctx.db
            .query("sleep_logs")
            .withIndex("by_date", (q) => q.eq("date", deletion.key))
            .first();
          const existingVersion = existing ? (existing.updatedAt || existing.createdAt || 0) : 0;
          if (existing && (!deletedAt || deletedAt >= existingVersion)) {
            await ctx.db.delete(existing._id);
            deletionsApplied++;
          }
        } else if (deletion.type === "pauses") {
          const existing = await ctx.db
            .query("training_pauses")
            .withIndex("by_pauseId", (q) => q.eq("pauseId", deletion.key))
            .first();
          const existingVersion = existing ? (existing.updatedAt || existing.createdAt || 0) : 0;
          if (existing && (!deletedAt || deletedAt >= existingVersion)) {
            await ctx.db.delete(existing._id);
            deletionsApplied++;
          }
        }
      }
    }

    return { success: true, workoutsSynced, measurementsSynced, customWeightsSynced, tapeSynced, sleepSynced, pausesSynced, deletionsApplied };
  },
});

// Guardar peso base personalizado individual
export const saveCustomWeight = mutation({
  args: {
    syncKey: v.string(),
    exerciseId: v.string(),
    weight: v.number(),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);

    const existing = await ctx.db
      .query("custom_weights")
      .withIndex("by_exerciseId", (q) => q.eq("exerciseId", args.exerciseId))
      .first();

    const updatedAt = args.updatedAt || Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        weight: args.weight,
        updatedAt,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("custom_weights", {
        exerciseId: args.exerciseId,
        weight: args.weight,
        updatedAt,
      });
    }
  },
});

// Obtener todos los pesos personalizados con su marca de tiempo
export const listCustomWeights = query({
  args: {
    syncKey: v.string(),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    const rows = await ctx.db.query("custom_weights").collect();
    const map: Record<string, { weight: number; updatedAt: number }> = {};
    for (const r of rows) {
      map[r.exerciseId] = { weight: r.weight, updatedAt: r.updatedAt };
    }
    return map;
  },
});
