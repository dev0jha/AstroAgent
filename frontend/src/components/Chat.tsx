import React, { useState, useRef, useEffect } from "react";
import { useSessionStore } from "../store/sessionStore";
import { useConversation } from "../hooks/useConversation";
import { MessageBubble } from "./MessageBubble";
import { ToolActivity } from "./ToolActivity";
import { BirthForm } from "./BirthForm";
import { SidebarTrigger } from "./ui/sidebar";

export const Chat: React.FC = () => {
  const store = useSessionStore();
  const {
    messages,
    isStreaming,
    toolActivities,
    error,
    birthDetails,
    sendMessage,
    clearConversation,
    setError,
  } = useConversation();

  const [input, setInput] = useState("");
  const [isBirthFormOpen, setIsBirthFormOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming, toolActivities]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;

    const currentMsg = input;
    setInput("");

    if (!birthDetails) {
      setPendingMessage(currentMsg);
      setIsBirthFormOpen(true);
      return;
    }

    sendMessage(currentMsg, birthDetails);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative z-10">
      {/* Chat Header */}
      <header className="h-16 border-b border-white/[0.06] bg-gradient-to-r from-white/[0.04] to-white/[0.02] backdrop-blur-xl px-6 flex items-center select-none shrink-0 relative shadow-[0_4px_30px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-3 absolute left-4">
          <SidebarTrigger className="md:hidden text-muted-foreground hover:text-primary" />
        </div>

        <div className="flex flex-col items-center mx-auto">
          <span className="font-serif text-primary text-lg leading-tight font-semibold">Aradhana</span>
          <span className="text-[10px] text-muted-foreground font-mono tracking-wider">SPIRITUAL ASTROLOGY COMPANION</span>
        </div>

        <div className="flex items-center gap-3 absolute right-6">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] text-muted-foreground font-mono uppercase">EPHEMERIS ONLINE</span>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-destructive/15 border-b border-destructive/20 text-destructive px-6 py-3 flex items-center justify-between text-xs font-light sm:text-sm shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold">⚠️ Warning:</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-muted-foreground hover:text-destructive text-base leading-none font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Chat Messages Feed */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="max-w-3xl mx-auto min-h-full flex flex-col justify-end">
          {messages.length === 0 ? (
            <div className="my-auto text-center max-w-lg mx-auto py-12 px-4 animate-fade-in select-none">
              <div className="text-4xl sm:text-5xl text-primary font-serif mb-4 leading-none">✦ Namaste ✦</div>
              <p className="text-sm sm:text-base text-muted-foreground font-light leading-relaxed mb-6">
                Welcome to Aradhana, your sacred space for spiritual astrology exploration. Share your birth coordinates once to cast your Swiss Ephemeris chart, calculate exact house positions, map daily transits, and consult deep cosmic wisdom.
              </p>
              <button
                onClick={() => setIsBirthFormOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6 py-3 text-sm font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(200,169,110,0.25),0_4px_16px_rgba(200,169,110,0.15)] hover:shadow-[0_0_30px_rgba(200,169,110,0.35),0_4px_20px_rgba(200,169,110,0.2)] transition-all duration-300 border border-white/10"
              >
                Cast Your Chart
              </button>
            </div>
          ) : (
            <div className="w-full">
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming && idx === messages.length - 1}
                  isLast={idx === messages.length - 1}
                />
              ))}

              {isStreaming && (
                <div className="max-w-[85%] sm:max-w-[75%]">
                  <ToolActivity activities={toolActivities} />
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Message Input Footer */}
      <footer className="border-t border-white/[0.06] bg-gradient-to-r from-white/[0.03] to-white/[0.01] backdrop-blur-xl p-4 sm:p-6 shrink-0 shadow-[0_-4px_30px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="max-w-3xl mx-auto flex items-end gap-3 relative">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !birthDetails
                ? "Enter your cosmic inquiry (birth details required)..."
                : "Ask about your natal chart, today's transits, or general astrology..."
            }
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 outline-none text-sm sm:text-base text-foreground resize-none placeholder:text-muted-foreground/40 font-sans focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:shadow-[0_0_15px_rgba(200,169,110,0.1)] min-h-[46px] max-h-[120px] transition-all duration-300 backdrop-blur-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:hover:bg-primary text-primary-foreground w-11 h-11 flex items-center justify-center rounded-xl shadow-[0_0_15px_rgba(200,169,110,0.2)] hover:shadow-[0_0_20px_rgba(200,169,110,0.3)] transition-all duration-300 flex-shrink-0 cursor-pointer disabled:cursor-not-allowed border border-white/10"
          >
            <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </footer>

      {/* Birth Details Form Modal */}
      <BirthForm
        isOpen={isBirthFormOpen}
        onClose={() => setIsBirthFormOpen(false)}
        pendingMessage={pendingMessage}
        onSuccess={() => setPendingMessage("")}
      />
    </div>
  );
};
