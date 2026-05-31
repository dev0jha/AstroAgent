import React from "react";
import { ToolActivity as ToolActivityType } from "../types";

const TOOL_LABELS: Record<string, string> = {
  geocode: "📍 Locating your birthplace...",
  chart: "✦ Computing your natal chart...",
  transit: "🌙 Fetching today's transits...",
  knowledge: "📖 Consulting the stars...",
};

interface ToolActivityProps {
  activities: ToolActivityType[];
}

export const ToolActivity: React.FC<ToolActivityProps> = ({ activities }) => {
  if (activities.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 p-3 my-2 rounded-xl bg-card border border-border max-w-md animate-fade-in shadow-lg">
      <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
        Cosmic Calculations
      </div>
      <div className="flex flex-col gap-2">
        {activities.map((act, index) => {
          const isRunning = act.status === "running";
          const elapsed = act.endedAt ? act.endedAt - act.startedAt : null;
          const label = TOOL_LABELS[act.tool] ?? `Invoking ${act.tool}...`;

          return (
            <div
              key={`${act.tool}-${index}`}
              className="flex items-center justify-between text-sm py-1 border-b border-border/40 last:border-0"
            >
              <div className="flex items-center gap-2 text-foreground">
                {isRunning ? (
                  <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-success select-none">✓</span>
                )}
                <span className={isRunning ? "text-foreground font-medium" : "text-muted-foreground"}>
                  {label}
                </span>
              </div>
              {!isRunning && elapsed !== null && (
                <span className="text-xs text-muted-foreground bg-input/60 px-1.5 py-0.5 rounded font-mono">
                  {elapsed}ms
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
