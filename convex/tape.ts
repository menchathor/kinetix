import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertSyncKey } from "./lib/auth";

// Guardar o actualizar una medición de cinta métrica (cintura obligatoria)
export const save = mutation({
  args: {
    syncKey: v.string(),
    date: v.string(),
    waistCm: v.number(),
    abdomenCm: v.optional(v.number()),
    hipCm: v.optional(v.number()),
    chestCm: v.optional(v.number()),
    armCm: v.optional(v.number()),
    thighCm: v.optional(v.number()),
    notes: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    const { syncKey: _syncKey, ...payload } = args;

    const existing = await ctx.db
      .query("tape_measurements")
      .withIndex("by_date", (q) => q.eq("date", payload.date))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...payload,
        updatedAt: payload.updatedAt || now,
      });
      return existing._id;
    }

    return await ctx.db.insert("tape_measurements", {
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
    const limit = Math.min(Math.max(args.limit ?? 500, 1), 500);
    return await ctx.db.query("tape_measurements").order("desc").take(limit);
  },
});

export const deleteTape = mutation({
  args: {
    syncKey: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    const existing = await ctx.db
      .query("tape_measurements")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});
