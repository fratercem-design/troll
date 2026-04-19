"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Rule {
  id: string
  title: string
  description: string
  default_action: string
  examples: string[]
}

interface AppStore {
  rules: Rule[]
  addRule: (rule: Rule) => void
  updateRule: (rule: Rule) => void
  deleteRule: (id: string) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      rules: [
        {
          id: "1",
          title: "No Hate Speech",
          description:
            "Comments containing slurs, hate speech, or dehumanizing language targeting protected groups.",
          default_action: "ban",
          examples: [],
        },
        {
          id: "2",
          title: "No Threats",
          description:
            "Comments containing threats of violence or harm to individuals or groups.",
          default_action: "ban",
          examples: [],
        },
        {
          id: "3",
          title: "No Harassment",
          description:
            "Targeted harassment, including sexual harassment, doxxing, or sustained negative attention toward individuals.",
          default_action: "timeout",
          examples: [],
        },
      ],
      addRule: (rule) =>
        set((state) => ({ rules: [...state.rules, rule] })),
      updateRule: (rule) =>
        set((state) => ({
          rules: state.rules.map((r) => (r.id === rule.id ? rule : r)),
        })),
      deleteRule: (id) =>
        set((state) => ({
          rules: state.rules.filter((r) => r.id !== id),
        })),
    }),
    { name: "troll-decoder-store" }
  )
)
