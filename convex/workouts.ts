import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Guardar o actualizar una sesión de entrenamiento
export const save = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("workouts")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("workouts", {
        ...args,
        createdAt: now,
      });
    }
  },
});

// Listar todas las sesiones de entrenamiento ordenadas por fecha más reciente
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);

    return workouts;
  },
});

// Obtener el registro previo más reciente de un ejercicio específico
export const getLatestByExercise = query({
  args: {
    exerciseId: v.string(),
  },
  handler: async (ctx, args) => {
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
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
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
