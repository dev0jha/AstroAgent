import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { BirthDetails, Message, ToolActivity } from "../types";

interface SessionStore {
  sessionId: string;
  birthDetails: BirthDetails | null;
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  toolActivities: ToolActivity[];
  error: string | null;

  setBirthDetails: (d: BirthDetails) => void;
  addUserMessage: (content: string) => string;
  startAssistantMessage: () => string;
  appendToken: (token: string) => void;
  finalizeAssistantMessage: (id: string) => void;
  setStreaming: (v: boolean) => void;
  addToolActivity: (tool: string) => void;
  completeToolActivity: (tool: string) => void;
  setError: (e: string | null) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      sessionId: uuidv4(),
      birthDetails: null,
      messages: [],
      isStreaming: false,
      streamingContent: "",
      toolActivities: [],
      error: null,

      setBirthDetails: (d) => set({ birthDetails: d }),

      addUserMessage: (content) => {
        const id = uuidv4();
        set((s) => ({
          messages: [...s.messages, { id, role: "user", content, timestamp: Date.now() }],
        }));
        return id;
      },

      startAssistantMessage: () => {
        const id = uuidv4();
        set((s) => ({
          messages: [...s.messages, { id, role: "assistant", content: "", timestamp: Date.now() }],
          streamingContent: "",
          isStreaming: true,
        }));
        return id;
      },

      appendToken: (token) =>
        set((s) => {
          const newContent = s.streamingContent + token;
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") {
            msgs[msgs.length - 1] = { ...last, content: newContent };
          }
          return { messages: msgs, streamingContent: newContent };
        }),

      finalizeAssistantMessage: (_id) =>
        set({ isStreaming: false, streamingContent: "", toolActivities: [] }),

      setStreaming: (v) => set({ isStreaming: v }),

      addToolActivity: (tool) =>
        set((s) => ({
          toolActivities: [
            ...s.toolActivities,
            { tool, status: "running", startedAt: Date.now() },
          ],
        })),

      completeToolActivity: (tool) =>
        set((s) => ({
          toolActivities: s.toolActivities.map((t) =>
            t.tool === tool && t.status === "running"
              ? { ...t, status: "done", endedAt: Date.now() }
              : t
          ),
        })),

      setError: (e) => set({ error: e }),

      clearSession: () =>
        set({
          sessionId: uuidv4(),
          messages: [],
          birthDetails: null,
          isStreaming: false,
          streamingContent: "",
          toolActivities: [],
          error: null,
        }),
    }),
    {
      name: "aradhana-session",
      partialize: (s) => ({
        sessionId: s.sessionId,
        birthDetails: s.birthDetails,
        // Do NOT persist messages — can grow unbounded
      }),
    }
  )
);
