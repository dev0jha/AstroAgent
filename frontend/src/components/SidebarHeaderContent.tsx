import React from "react";
import { useSessionStore } from "../store/sessionStore";
import { useConversation } from "../hooks/useConversation";

export const SidebarHeaderContent: React.FC = () => {
  const store = useSessionStore();
  const { clearConversation } = useConversation();
  const birthDetails = store.birthDetails;

  return (
    <div className="flex flex-col gap-4 p-2">
      <div className="flex items-center gap-2 select-none">
        <span className="text-lg font-serif text-primary tracking-wide">
          ✦ Aradhana
        </span>
      </div>

      <div className="rounded-xl bg-sidebar-accent/50 p-4 border border-sidebar-border">
        <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3 select-none">
          Your Birth Chart
        </h3>

        {birthDetails ? (
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Date</div>
              <div className="text-foreground font-medium">{birthDetails.date}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Time</div>
              <div className="text-foreground font-medium">
                {birthDetails.time ? birthDetails.time : "Unknown (12:00 UTC Noon)"}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Place</div>
              <div className="text-foreground font-medium break-words leading-snug">
                {birthDetails.place}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground mb-4 font-light leading-relaxed">
              No birth details casted yet. Provide them to unlock full calculations.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 mt-auto">
        <button
          onClick={clearConversation}
          className="w-full bg-transparent hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg py-2 text-xs font-semibold tracking-wider uppercase border border-sidebar-border hover:border-destructive/25 transition-all duration-200"
        >
          Reset Session
        </button>
        <div className="text-[10px] text-muted-foreground text-center font-mono select-none mt-1">
          v1.0 · Powered by Swisseph
        </div>
      </div>
    </div>
  );
};
