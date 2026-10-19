import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertSyncKey } from "./lib/auth";

// Guardar o actualizar una sesión de entrenamiento
export const save = mutation({
  args: {
    syncKey: v.string(),
    sessionId: v.string(),
    routineId: v.string(),
    routineName: v.string(),
    dayName: v.string(),
    startTime: v.string(),
    endTime: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    cardioDone: v.boolean(),
    cardioMinutes: v.optional(v.number()),
    exercises: v.array(
      v.object({
        exerciseId: v.string(),
        exerciseName: v.string(),
        isCardio: v.optional(v.boolean()),
        minutes: v.optional(v.number()),
        sets: v.array(
          v.object({
            setNumber: v.number(),
            weight: v.any(),
            reps: v.any(),
            completed: v.boolean(),
            rpe: v.optional(v.string()),
          })
        ),
        notes: v.optional(v.string()),
      })
    ),
    notes: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    const { syncKey: _syncKey, ...payload } = args;

    const existing = await ctx.db
      .query("workouts")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", payload.sessionId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...payload,
        updatedAt: payload.updatedAt || now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("workouts", {
        ...payload,
        createdAt: now,
        updatedAt: payload.updatedAt || now,
      });
    }
  },
});

// Listar sesiones paginadas por createdAt (más recientes primero).
export const list = query({
  args: {
    syncKey: v.string(),
    limit: v.optional(v.number()),
    before: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);
    const indexed = args.before !== undefined
      ? ctx.db.query("workouts").withIndex("by_createdAt", (q) => q.lt("createdAt", args.before!))
      : ctx.db.query("workouts").withIndex("by_createdAt");

    return await indexed.order("desc").take(limit);
  },
});

// Obtener el registro previo más reciente de un ejercicio específico
export const getLatestByExercise = query({
  args: {
    syncKey: v.string(),
    exerciseId: v.string(),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_createdAt")
      .order("desc")
      .take(30);

    for (const w of workouts) {
      const found = w.exercises.find((e) => e.exerciseId === args.exerciseId);
      if (found && found.sets && found.sets.length > 0) {
        const completedSets = found.sets.filter((s) => s.completed);
        const best = completedSets.length > 0 ? completedSets[0] : found.sets[0];
        return {
          bestWeight: best.weight,
          bestReps: best.reps,
          date: w.startTime,
        };
      }
    }
    return null;
  },
});

// Eliminar una sesión de entrenamiento
export const deleteSession = mutation({
  args: {
    syncKey: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    const existing = await ctx.db
      .query("workouts")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});
