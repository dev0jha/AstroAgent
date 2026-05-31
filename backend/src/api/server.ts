import express from "express";
import cors from "cors";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { buildGraph } from "../agent/graph";
import { createChatRouter } from "./routes/chat";
import { createSessionRouter } from "./routes/session";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173").split(","),
  credentials: true,
}));
app.use(express.json());

// ── LLM model ────────────────────────────────────────────────────────────────
const model = new ChatGoogleGenerativeAI({
  model: process.env.LLM_MODEL ?? "gemini-2.5-flash",
  apiKey: process.env.GOOGLE_AI_API_KEY!,
  maxOutputTokens: 1024,
  temperature: 0.7,
});

const agentGraph = buildGraph(model);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/chat", createChatRouter(agentGraph));
app.use("/api/session", createSessionRouter());

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Global error handler
app.use(errorHandler);

export default app;
