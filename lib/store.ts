import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Rule {
  id: string;
  title: string;
  description: string;
  default_action: string;
  examples: string[];
}

interface AppStore {
  rules: Rule[];
  addRule: (rule: Rule) => void;
  updateRule: (rule: Rule) => void;
  deleteRule: (id: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      rules: [],
      addRule: (rule) => set((s) => ({ rules: [...s.rules, rule] })),
      updateRule: (rule) => set((s) => ({ rules: s.rules.map((r) => (r.id === rule.id ? rule : r)) })),
      deleteRule: (id) => set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),
    }),
    { name: "troll-store" }
  )
);
