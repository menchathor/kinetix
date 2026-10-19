import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertSyncKey } from "./lib/auth";

// Sincronización masiva de datos locales a la nube.
// Además de subir, procesa eliminaciones pendientes (tombstones) para que un
// borrado hecho offline no resucite en el siguiente pull.
export const bulkSync = mutation({
  args: {
    syncKey: v.string(),
    workouts: v.optional(v.array(v.any())),
    measurements: v.optional(v.array(v.any())),
    customWeights: v.optional(v.any()),
    deletions: v.optional(v.array(v.object({
      type: v.string(),
      key: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);

    let workoutsSynced = 0;
    let measurementsSynced = 0;
    let customWeightsSynced = 0;
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
        const existing = await ctx.db
          .query("measurements")
          .withIndex("by_date", (q) => q.eq("date", m.date))
          .first();

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

    if (args.deletions && Array.isArray(args.deletions)) {
      for (const deletion of args.deletions) {
        if (deletion.type === "workouts") {
          const existing = await ctx.db
            .query("workouts")
            .withIndex("by_sessionId", (q) => q.eq("sessionId", deletion.key))
            .first();
          if (existing) {
            await ctx.db.delete(existing._id);
            deletionsApplied++;
          }
        } else if (deletion.type === "measurements") {
          const existing = await ctx.db
            .query("measurements")
            .withIndex("by_date", (q) => q.eq("date", deletion.key))
            .first();
          if (existing) {
            await ctx.db.delete(existing._id);
            deletionsApplied++;
          }
        }
      }
    }

    return { success: true, workoutsSynced, measurementsSynced, customWeightsSynced, deletionsApplied };
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
