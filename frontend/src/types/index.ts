export interface BirthDetails {
  date: string;
  time: string | null;
  place: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ToolActivity {
  tool: string;
  status: "running" | "done";
  startedAt: number;
  endedAt?: number;
}

export type SSEEvent =
  | { type: "token";      content: string }
  | { type: "tool_start"; tool: string }
  | { type: "tool_end";   tool: string }
  | { type: "error";      message: string }
  | { type: "done";       session_id: string };
