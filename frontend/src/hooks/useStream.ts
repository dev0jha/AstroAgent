import { useSessionStore } from "../store/sessionStore";
import { BirthDetails, SSEEvent } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export function useStream() {
  const store = useSessionStore();

  const sendMessage = async (message: string, birthDetails?: BirthDetails) => {
    store.addUserMessage(message);
    store.startAssistantMessage();
    store.setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: store.sessionId,
          message,
          birth_details: birthDetails ?? null,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const chunk of lines) {
          const dataLine = chunk.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          const json = dataLine.replace("data: ", "").trim();
          if (!json) continue;

          try {
            const event: SSEEvent = JSON.parse(json);

            if (event.type === "token")      store.appendToken(event.content);
            if (event.type === "tool_start") store.addToolActivity(event.tool);
            if (event.type === "tool_end")   store.completeToolActivity(event.tool);
            if (event.type === "error")      store.setError(event.message);
            if (event.type === "done")       store.finalizeAssistantMessage("");

          } catch { /* skip malformed SSE lines */ }
        }
      }
    } catch (err: any) {
      store.setError(err.message ?? "Connection error");
      store.finalizeAssistantMessage("");
    }
  };

  return { sendMessage };
}
