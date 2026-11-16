import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertSyncKey } from "./lib/auth";

// Guardar o actualizar una pausa / recuperación de entrenamiento
export const save = mutation({
  args: {
    syncKey: v.string(),
    pauseId: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    reason: v.string(),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    const { syncKey: _syncKey, ...payload } = args;

    const existing = await ctx.db
      .query("training_pauses")
      .withIndex("by_pauseId", (q) => q.eq("pauseId", payload.pauseId))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...payload,
        updatedAt: payload.updatedAt || now,
      });
      return existing._id;
    }

    return await ctx.db.insert("training_pauses", {
      ...payload,
      createdAt: now,
      updatedAt: payload.updatedAt || now,
    });
  },
});

export const list = query({
  args: {
    syncKey: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    const limit = Math.min(Math.max(args.limit ?? 200, 1), 500);
    return await ctx.db.query("training_pauses").order("desc").take(limit);
  },
});

export const deletePause = mutation({
  args: {
    syncKey: v.string(),
    pauseId: v.string(),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    const existing = await ctx.db
      .query("training_pauses")
      .withIndex("by_pauseId", (q) => q.eq("pauseId", args.pauseId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});
