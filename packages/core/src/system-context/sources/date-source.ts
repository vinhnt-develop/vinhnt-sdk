import type { ContextSourceValue, ContextSourceKey } from "../types.js";

export function createDateSource(): ContextSourceValue<{ date: string; time: string; timezone: string }> {
  return {
    key: "core.date" as ContextSourceKey,
    priority: 30,
    async load() {
      const now = new Date();
      return {
        date: now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
        time: now.toLocaleTimeString("en-US"),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    },
    renderBaseline(value) {
      return `## Current Date & Time\n- Date: ${value.date}\n- Time: ${value.time}\n- Timezone: ${value.timezone}`;
    },
    renderUpdate(value, previous) {
      if (value.date === previous.date) return null;
      return `[Context update — date changed]\nThe current date is now ${value.date}.`;
    },
    renderRemoval() {
      return "[Context source removed: date]";
    },
  };
}
