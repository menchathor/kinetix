import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Guardar o actualizar el registro de nutrición de un día
export const saveDaily = mutation({
  args: {
    date: v.string(), // "YYYY-MM-DD"
    medicationTaken: v.boolean(),
    medicationTime: v.optional(v.string()),
    waterMl: v.number(),
    waterGoalMl: v.number(),
    completedMeals: v.any(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("nutrition_logs")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("nutrition_logs", {
        ...args,
        updatedAt: now,
      });
    }
  },
});

// Obtener el registro de un día específico
export const getDaily = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("nutrition_logs")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();
  },
});

// Listar historial reciente de nutrición
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 30;
    return await ctx.db.query("nutrition_logs").order("desc").take(limit);
  },
});
