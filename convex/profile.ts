import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertSyncKey } from "./lib/auth";

// Perfil clínico y metas de recomposición. Se guarda un único documento y se
// edita desde Ajustes; así los datos personales no viven en el código fuente.
export const get = query({
  args: {
    syncKey: v.string(),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    return await ctx.db.query("user_profile").first();
  },
});

export const save = mutation({
  args: {
    syncKey: v.string(),
    name: v.string(),
    age: v.number(),
    heightCm: v.number(),
    targetWeightMin: v.number(),
    targetWeightMax: v.number(),
    condition: v.string(),
    startWeight: v.optional(v.number()),
    currentWeight: v.optional(v.number()),
    skeletalMuscleMass: v.optional(v.number()),
    fatFreeMass: v.optional(v.number()),
    trunkFat: v.optional(v.number()),
    bodyFatPercent: v.optional(v.number()),
    fatMassKg: v.optional(v.number()),
    visceralFat: v.optional(v.number()),
    basalMetabolicRate: v.optional(v.number()),
    appendicularLeanIndex: v.optional(v.number()),
    waterTargetLitres: v.optional(v.number()),
    gymSchedule: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertSyncKey(args.syncKey);
    const { syncKey: _syncKey, ...payload } = args;

    const existing = await ctx.db.query("user_profile").first();
    const updatedAt = args.updatedAt || Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...payload,
        updatedAt,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("user_profile", {
        ...payload,
        updatedAt,
      });
    }
  },
});
