import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Sincronización masiva de datos locales a la nube
export const bulkSync = mutation({
  args: {
    workouts: v.optional(v.array(v.any())),
    measurements: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    let workoutsSynced = 0;
    let measurementsSynced = 0;

    if (args.workouts && Array.isArray(args.workouts)) {
      for (const w of args.workouts) {
        if (!w.id && !w.sessionId) continue;
        const sessionId = w.sessionId || w.id;
        const existing = await ctx.db
          .query("workouts")
          .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
          .first();

        const doc = {
          sessionId,
          routineId: w.routineId || "general",
          routineName: w.routineName || "Sesión",
          dayName: w.dayName || "",
          startTime: w.startTime || new Date().toISOString(),
          endTime: w.endTime,
          durationMinutes: w.durationMinutes || 0,
          cardioDone: !!w.cardioDone,
          cardioMinutes: w.cardioMinutes,
          exercises: (w.exercises || []).map((ex: any) => ({
            exerciseId: ex.exerciseId || ex.id || "unknown",
            exerciseName: ex.exerciseName || ex.name || "",
            isCardio: !!ex.isCardio,
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
          createdAt: w.startTime ? new Date(w.startTime).getTime() : Date.now(),
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

        const doc = {
          date: m.date,
          weightKg: Number(m.weightKg) || 0,
          bodyFatPercent: m.bodyFatPercent ? Number(m.bodyFatPercent) : undefined,
          muscleMassKg: m.muscleMassKg ? Number(m.muscleMassKg) : undefined,
          visceralFat: m.visceralFat ? Number(m.visceralFat) : undefined,
          waistCircumferenceCm: m.waistCircumferenceCm ? Number(m.waistCircumferenceCm) : undefined,
          notes: m.notes || "",
          source: m.source || "Manual",
          createdAt: m.date ? new Date(m.date).getTime() : Date.now(),
        };

        if (existing) {
          await ctx.db.patch(existing._id, doc);
        } else {
          await ctx.db.insert("measurements", doc);
        }
        measurementsSynced++;
      }
    }

    return { success: true, workoutsSynced, measurementsSynced };
  },
});
