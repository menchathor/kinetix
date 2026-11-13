import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertSyncKey } from "./lib/auth";

function isInBodySource(source?: string): boolean {
  return String(source || "").toLowerCase().includes("inbody");
}

// Guardar o actualizar una medición corporal / bioimpedancia
export const save = mutation({
  args: {
    syncKey: v.string(),
    date: v.string(), // "YYYY-MM-DD"
    weightKg: v.number(),
    bodyFatPercent: v.optional(v.number()),
    fatMassKg: v.optional(v.number()),
    fatFreeMass: v.optional(v.number()),
    muscleMassKg: v.optional(v.number()),
    trunkFat: v.optional(v.number()),
    visceralFat: v.optional(v.number()),
    waterPercent: v.optional(v.number()),
    waterLitres: v.optional(v.number()),
    bmr: v.optional(v.number()),
    appendicularLeanIndex: v.optional(v.number()),
    boneMass: v.optional(v.number()),
    waistCircumferenceCm: v.optional(v.number()),
    notes: v.optional(v.string()),
    source: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    const { syncKey: _syncKey, ...payload } = args;

    const candidates = await ctx.db
      .query("measurements")
      .withIndex("by_date", (q) => q.eq("date", payload.date))
      .collect();
    const targetIsInBody = isInBodySource(payload.source);
    const existing = candidates.find((doc) => isInBodySource(doc.source) === targetIsInBody);

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...payload,
        updatedAt: payload.updatedAt || now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("measurements", {
        ...payload,
        createdAt: now,
        updatedAt: payload.updatedAt || now,
      });
    }
  },
});

// Listar mediciones ordenadas cronológicamente para las gráficas
export const list = query({
  args: {
    syncKey: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    const limit = Math.min(Math.max(args.limit ?? 500, 1), 500);
    return await ctx.db.query("measurements").order("desc").take(limit);
  },
});

// Eliminar una medición por fecha (y opcionalmente categoría InBody / hogar)
export const deleteMeasurement = mutation({
  args: {
    syncKey: v.string(),
    date: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    const candidates = await ctx.db
      .query("measurements")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();

    if (candidates.length === 0) return false;

    if (args.source !== undefined) {
      const targetIsInBody = isInBodySource(args.source);
      const match = candidates.find((doc) => isInBodySource(doc.source) === targetIsInBody);
      if (match) {
        await ctx.db.delete(match._id);
        return true;
      }
      return false;
    }

    for (const doc of candidates) {
      await ctx.db.delete(doc._id);
    }
    return true;
  },
});
