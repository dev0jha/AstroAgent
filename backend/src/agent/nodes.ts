import { AgentState } from "./state";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { classifyIntent } from "./router";
import { geocodePlace } from "./tools/geocode";
import { computeBirthChart } from "./tools/birthChart";
import { getDailyTransits } from "./tools/transits";
import { knowledgeLookup } from "./tools/knowledge";

// ── Shared system prompt for the respond node ────────────────────────────────
const ARADHANA_SYSTEM = `You are Aradhana, a warm and wise astrology companion. You speak with care, spiritual depth, and gentle guidance.

CRITICAL RULES:
1. Never present astrological readings as factual predictions or certainties.
   Use: "the stars suggest", "this energy may bring", "you might find yourself"
2. Never give medical, legal, or financial advice as astrology. If asked, gently acknowledge the question and clearly state astrology is a tool for reflection, not a substitute for professional guidance.
3. Always refer to the actual planetary data provided — never invent positions.
4. Keep responses warm, conversational, and spiritually grounded.
5. If birth time is unknown, acknowledge that house positions may be approximate.`;

// ── Node: router ─────────────────────────────────────────────────────────────
export async function routerNode(
  state: AgentState,
  model: ChatGoogleGenerativeAI
): Promise<Partial<AgentState>> {
  const lastMsg = state.messages[state.messages.length - 1];
  const text = typeof lastMsg.content === "string" ? lastMsg.content : "";
  const intent = await classifyIntent(text, model);
  return { intent, toolCallsThisTurn: 0, error: null };
}

// ── Node: gather_birth_details ───────────────────────────────────────────────
export async function gatherBirthDetailsNode(
  state: AgentState,
  model: ChatGoogleGenerativeAI
): Promise<Partial<AgentState>> {
  const reply = await model.invoke([
    new SystemMessage(ARADHANA_SYSTEM),
    ...state.messages,
    new HumanMessage(
      "The user wants chart information but hasn't provided birth details. " +
      "Ask them warmly for: date of birth (YYYY-MM-DD), time of birth (HH:MM, 24h — optional), and place of birth. " +
      "Keep it brief and inviting."
    ),
  ]);

  const text = typeof reply.content === "string"
    ? reply.content
    : (reply.content as any[]).map((c: any) => c.text ?? "").join("");

  return {
    messages: [new AIMessage(text)],
  };
}

// ── Node: geocode ────────────────────────────────────────────────────────────
export async function geocodeNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  if (!state.birthDetails?.place) {
    return { error: "Place of birth is missing." };
  }

  try {
    const geo = await geocodePlace(state.birthDetails.place);
    return {
      birthDetails: {
        ...state.birthDetails,
        latitude: geo.latitude,
        longitude: geo.longitude,
        timezone: geo.timezone,
        displayName: geo.displayName,
      },
      toolCallsThisTurn: state.toolCallsThisTurn + 1,
    };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ── Node: chart ──────────────────────────────────────────────────────────────
export async function chartNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const bd = state.birthDetails;
  if (!bd?.latitude || !bd?.longitude || !bd?.timezone) {
    return { error: "Cannot compute chart: geocoding incomplete." };
  }

  try {
    const chart = await computeBirthChart(
      bd.date, bd.time ?? null, bd.latitude, bd.longitude, bd.timezone
    );
    return {
      natalChart: chart,
      toolCallsThisTurn: state.toolCallsThisTurn + 1,
    };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ── Node: transit ─────────────────────────────────────────────────────────────
export async function transitNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  if (!state.natalChart) {
    return { error: "Cannot compute transits: natal chart not available." };
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const transits = await getDailyTransits(today, state.natalChart);
    return {
      dailyTransits: transits,
      toolCallsThisTurn: state.toolCallsThisTurn + 1,
    };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ── Node: knowledge ───────────────────────────────────────────────────────────
export async function knowledgeNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const lastMsg = state.messages[state.messages.length - 1];
  const query = typeof lastMsg.content === "string" ? lastMsg.content : "";

  try {
    const context = knowledgeLookup(query);
    return {
      knowledgeContext: context,
      toolCallsThisTurn: state.toolCallsThisTurn + 1,
    };
  } catch (e: any) {
    return { knowledgeContext: null };
  }
}

// ── Node: respond ─────────────────────────────────────────────────────────────
export async function respondNode(
  state: AgentState,
  model: ChatGoogleGenerativeAI
): Promise<Partial<AgentState>> {
  // Build context string from state
  const contextParts: string[] = [];

  if (state.natalChart) {
    const c = state.natalChart;
    contextParts.push(
      `USER'S NATAL CHART:\n` +
      `Sun: ${c.sunSign} | Moon: ${c.moonSign} | Ascendant: ${c.ascendant}\n` +
      `Planets:\n` +
      Object.entries(c.planets)
        .map(([name, p]) => `  ${name}: ${p.sign} ${p.degree.toFixed(1)}° House ${p.house}${p.retrograde ? " (Rx)" : ""}`)
        .join("\n") +
      (c.timeUnknown ? "\n[Note: Birth time unknown — house positions are approximate]" : "")
    );
  }

  if (state.dailyTransits) {
    contextParts.push(
      `TODAY'S TRANSITS (${state.dailyTransits.date}):\n` +
      state.dailyTransits.notableTransits
        .slice(0, 5)
        .map((t) => `  ${t.description}`)
        .join("\n")
    );
  }

  if (state.knowledgeContext) {
    contextParts.push(`REFERENCE KNOWLEDGE:\n${state.knowledgeContext}`);
  }

  const systemWithContext = contextParts.length > 0
    ? `${ARADHANA_SYSTEM}\n\n${contextParts.join("\n\n")}`
    : ARADHANA_SYSTEM;

  const reply = await model.invoke([
    new SystemMessage(systemWithContext),
    ...state.messages,
  ]);

  const text = typeof reply.content === "string"
    ? reply.content
    : (reply.content as any[]).map((c: any) => c.text ?? "").join("");

  return { messages: [new AIMessage(text)] };
}

// ── Node: error_handler ───────────────────────────────────────────────────────
export async function errorHandlerNode(
  state: AgentState,
  model: ChatGoogleGenerativeAI
): Promise<Partial<AgentState>> {
  const errorMsg = state.error ?? "An unexpected issue occurred.";

  const reply = await model.invoke([
    new SystemMessage(ARADHANA_SYSTEM),
    ...state.messages,
    new HumanMessage(
      `There was a technical issue: "${errorMsg}". ` +
      "Respond to the user warmly, acknowledge you couldn't complete the request, " +
      "and suggest what they might try (e.g. check the place name, provide a birth date in YYYY-MM-DD format)."
    ),
  ]);

  const text = typeof reply.content === "string"
    ? reply.content
    : (reply.content as any[]).map((c: any) => c.text ?? "").join("");

  return { messages: [new AIMessage(text)], error: null };
}
