import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Tabla de sesiones de entrenamiento (Workouts)
  workouts: defineTable({
    sessionId: v.string(),
    routineId: v.string(), // "torso1", "pierna1", "torso2", "pierna2"
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
            weight: v.any(), // puede ser número, string o "Zona 2"
            reps: v.any(),   // puede ser número o "20 min"
            completed: v.boolean(),
            rpe: v.optional(v.string()),
          })
        ),
        notes: v.optional(v.string()),
      })
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_routineId", ["routineId"])
    .index("by_createdAt", ["createdAt"]),

  // Tabla de registro diario de nutrición, agua y medicación
  nutrition_logs: defineTable({
    date: v.string(), // "YYYY-MM-DD"
    medicationTaken: v.boolean(),
    medicationTime: v.optional(v.string()),
    waterMl: v.number(),
    waterGoalMl: v.number(),
    completedMeals: v.any(), // Record de IDs de comidas completadas
    notes: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_date", ["date"]),

  // Tabla de mediciones corporales y bioimpedancia (Evolución)
  measurements: defineTable({
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
    source: v.optional(v.string()), // "Eufy", "InBody Smart Fit", "Manual"
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_date", ["date"]),

  // Tabla de pesos personalizados por máquina (Sincronización multi-dispositivo)
  custom_weights: defineTable({
    exerciseId: v.string(),
    weight: v.number(),
    updatedAt: v.number(),
  }).index("by_exerciseId", ["exerciseId"]),

  // Perfil clínico y metas de recomposición (editable desde Ajustes)
  user_profile: defineTable({
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
    updatedAt: v.number(),
  }),
});
