import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "../types";
import { StreamingIndicator } from "./StreamingIndicator";

interface MessageBubbleProps {
  message: Message;
  isStreaming: boolean;
  isLast: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming,
  isLast,
}) => {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex w-full mb-6 animate-fade-in ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-4 shadow-xl border ${
          isUser
            ? "bg-input border-primary/40 text-foreground rounded-tr-none"
            : "bg-card border-border border-l-4 border-l-primary text-foreground rounded-tl-none"
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap leading-relaxed break-words text-sm sm:text-base font-sans font-normal">
            {message.content}
          </div>
        ) : (
          <div className="prose prose-invert max-w-none text-sm sm:text-base font-sans font-light leading-relaxed space-y-2">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p className="mb-3 last:mb-0 inline-block w-full break-words">
                    {children}
                    {isLast && isStreaming && <StreamingIndicator />}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-primary">
                    {children}
                  </strong>
                ),
                h1: ({ children }) => (
                  <h1 className="text-xl font-semibold text-primary mt-4 mb-2 font-serif">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-semibold text-primary mt-3 mb-1.5 font-serif">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-semibold text-primary mt-2.5 mb-1 font-serif">
                    {children}
                  </h3>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>
                ),
                li: ({ children }) => <li className="mb-0.5">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-primary/50 pl-4 py-1 italic my-3 bg-input/30 rounded-r text-muted-foreground">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4 rounded-xl border border-border">
                    <table className="min-w-full divide-y divide-border/60 text-left text-sm">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-input text-primary font-medium uppercase tracking-wider text-xs">
                    {children}
                  </thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-border/40 bg-card/40">
                    {children}
                  </tbody>
                ),
                tr: ({ children }) => <tr>{children}</tr>,
                th: ({ children }) => <th className="px-4 py-3">{children}</th>,
                td: ({ children }) => <td className="px-4 py-2.5">{children}</td>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        <div className="flex justify-between items-center mt-2.5 pt-1.5 border-t border-border/20 text-[10px] text-muted-foreground font-mono select-none">
          <span>{isUser ? "You" : "Aradhana"}</span>
          <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
};
