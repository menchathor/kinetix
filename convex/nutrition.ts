import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertSyncKey } from "./lib/auth";

// Guardar o actualizar el registro de nutrición de un día
export const saveDaily = mutation({
  args: {
    syncKey: v.string(),
    date: v.string(), // "YYYY-MM-DD"
    medicationTaken: v.boolean(),
    medicationTime: v.optional(v.string()),
    waterMl: v.number(),
    waterGoalMl: v.number(),
    completedMeals: v.any(),
    notes: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    const { syncKey: _syncKey, ...payload } = args;

    const existing = await ctx.db
      .query("nutrition_logs")
      .withIndex("by_date", (q) => q.eq("date", payload.date))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...payload,
        updatedAt: payload.updatedAt || now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("nutrition_logs", {
        ...payload,
        updatedAt: payload.updatedAt || now,
      });
    }
  },
});

// Obtener el registro de un día específico
export const getDaily = query({
  args: {
    syncKey: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    return await ctx.db
      .query("nutrition_logs")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();
  },
});

// Eliminar el registro de un día (limpieza / corrección de datos)
export const deleteDaily = mutation({
  args: {
    syncKey: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    const existing = await ctx.db
      .query("nutrition_logs")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});

// Listar historial reciente de nutrición
export const list = query({
  args: {
    syncKey: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    const limit = Math.min(Math.max(args.limit ?? 365, 1), 500);
    return await ctx.db.query("nutrition_logs").order("desc").take(limit);
  },
});
