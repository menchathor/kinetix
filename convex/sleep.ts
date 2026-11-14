import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertSyncKey } from "./lib/auth";

// Guardar o actualizar el registro de sueño de un día
export const save = mutation({
  args: {
    syncKey: v.string(),
    date: v.string(),
    hours: v.number(),
    quality: v.optional(v.number()),
    bedtime: v.optional(v.string()),
    wakeTime: v.optional(v.string()),
    wakeups: v.optional(v.number()),
    factors: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    const { syncKey: _syncKey, ...payload } = args;

    const existing = await ctx.db
      .query("sleep_logs")
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

    return await ctx.db.insert("sleep_logs", {
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
    const limit = Math.min(Math.max(args.limit ?? 365, 1), 500);
    return await ctx.db.query("sleep_logs").order("desc").take(limit);
  },
});

export const deleteSleep = mutation({
  args: {
    syncKey: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    const existing = await ctx.db
      .query("sleep_logs")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});
