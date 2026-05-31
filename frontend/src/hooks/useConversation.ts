import { useSessionStore } from "../store/sessionStore";
import { useStream } from "./useStream";

export function useConversation() {
  const store = useSessionStore();
  const { sendMessage } = useStream();

  const clearConversation = () => {
    store.clearSession();
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
