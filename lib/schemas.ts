import { z } from "zod"

export const TacticSchema = z.object({
  name: z.string(),
  confidence: z.number(),
  evidence_phrases: z.array(z.string()),
})

export const RiskSchema = z.object({
  level: z.enum(["high", "medium", "low"]),
  reasons: z.array(z.string()),
  contains_hate_or_slur: z.boolean(),
  contains_threat: z.boolean(),
  sexual_harassment: z.boolean(),
})

export const AnalysisResultSchema = z.object({
  translation_plain: z.string(),
  translation_intent: z.string(),
  likely_goal: z.string(),
  risk: RiskSchema,
  tactics: z.array(TacticSchema),
  recommended_action: z.object({
    primary: z.string(),
    why: z.string(),
  }),
  replies: z.record(z.string().nullable()),
  coach_notes: z.array(z.string()),
})

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>
