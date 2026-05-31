import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { HumanMessage } from "@langchain/core/messages";
import { AgentState, BirthDetails } from "../../agent/state";

// Sessions map shared with server.ts via module export
export const sessions = new Map<string, Partial<AgentState>>();

export function createChatRouter(agentGraph: any) {
  const router = Router();

  router.post("/", async (req: Request, res: Response) => {
    const { session_id, message, birth_details } = req.body as {
      session_id?: string;
      message: string;
      birth_details?: BirthDetails;
    };

    if (!message?.trim()) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const sessionId = session_id ?? uuidv4();
    const existingState = sessions.get(sessionId) ?? {};

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Session-Id", sessionId);
    res.flushHeaders();

    const sendEvent = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Merge incoming birth_details if provided
      const mergedBirthDetails: BirthDetails | null =
        birth_details ?? existingState.birthDetails ?? null;

      // If new birth_details provided, clear cached chart (re-compute)
      const natalChart =
        birth_details && JSON.stringify(birth_details) !== JSON.stringify(existingState.birthDetails)
          ? null
          : existingState.natalChart ?? null;

      const inputState: Partial<AgentState> = {
        ...existingState,
        sessionId,
        birthDetails: mergedBirthDetails,
        natalChart,
        messages: [
          ...(existingState.messages ?? []),
          new HumanMessage(message),
        ],
        error: null,
      };

      // Emit tool activity events by intercepting graph stream
      const stream = await agentGraph.stream(inputState, {
        streamMode: "updates",
      });

      const toolNodeNames = ["geocode", "chart", "transit", "knowledge"];
      let finalState: Partial<AgentState> = {};

      for await (const update of stream) {
        for (const [nodeName, nodeOutput] of Object.entries(update)) {
          if (toolNodeNames.includes(nodeName)) {
            sendEvent({ type: "tool_start", tool: nodeName });
          }

          if (
            nodeName === "respond" ||
            nodeName === "error_handler" ||
            nodeName === "gather_birth_details"
          ) {
            const output = nodeOutput as Partial<AgentState>;
            const msgs = output.messages ?? [];
            const lastAI = msgs[msgs.length - 1];
            if (lastAI) {
              const text =
                typeof lastAI.content === "string"
                  ? lastAI.content
                  : (lastAI.content as any[]).map((c: any) => c.text ?? "").join("");

              // Stream word by word for streaming effect
              const words = text.split(" ");
              for (const word of words) {
                sendEvent({ type: "token", content: word + " " });
                await new Promise((r) => setTimeout(r, 10));
              }
            }
          }

          if (toolNodeNames.includes(nodeName)) {
            sendEvent({ type: "tool_end", tool: nodeName });
          }

          finalState = { ...finalState, ...(nodeOutput as Partial<AgentState>) };
        }
      }

      // Persist updated state
      sessions.set(sessionId, {
        ...inputState,
        ...finalState,
        messages: finalState.messages ?? inputState.messages ?? [],
      });

      sendEvent({ type: "done", session_id: sessionId });
    } catch (err: any) {
      sendEvent({ type: "error", message: err.message ?? "Unknown error" });
    } finally {
      res.end();
    }
  });

  return router;
}
