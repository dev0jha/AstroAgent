import { useSessionStore } from "../store/sessionStore";
import { useStream } from "./useStream";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export function useConversation() {
  const store = useSessionStore();
  const { sendMessage } = useStream();

  const clearConversation = () => {
    const oldSessionId = store.sessionId;
    store.clearSession();
    useSessionStore.persist.clearStorage();
    fetch(`${API_BASE}/api/session/${oldSessionId}`, { method: "DELETE" }).catch(() => {});
  };

  return {
    messages: store.messages,
    isStreaming: store.isStreaming,
    toolActivities: store.toolActivities,
    error: store.error,
    birthDetails: store.birthDetails,
    sessionId: store.sessionId,
    sendMessage,
    clearConversation,
    setError: store.setError,
  };
}
