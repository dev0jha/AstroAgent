import { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

export interface BirthDetails {
  date: string;           // "YYYY-MM-DD"
  time: string | null;    // "HH:MM" or null if unknown
  place: string;          // Raw user input
  latitude?: number;
  longitude?: number;
  timezone?: string;      // IANA e.g. "Asia/Kolkata"
  displayName?: string;   // Resolved place name from geocoding
}

export interface PlanetData {
  sign: string;
  degree: number;
  absoluteDegree: number;
  house: number;
  retrograde: boolean;
}

export interface NatalChart {
  sunSign: string;
  moonSign: string;
  ascendant: string;
  ascendantDegree: number;
  planets: Record<string, PlanetData>;
  houses: Record<string, { sign: string; cuspDegree: number }>;
  timeUnknown: boolean;
  computedAt: string;
}

export interface TransitData {
  date: string;
  transitingPlanets: Record<string, { sign: string; degree: number; absoluteDegree: number }>;
  notableTransits: Array<{
    transitingPlanet: string;
    natalPlanet: string;
    aspect: string;
    orb: number;
    description: string;
  }>;
}

export type Intent =
  | "chart_request"
  | "daily_horoscope"
  | "free_question"
  | "off_topic";

// LangGraph Annotation-based state (required for LangGraph.js v0.2+)
export const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  birthDetails: Annotation<BirthDetails | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  natalChart: Annotation<NatalChart | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  dailyTransits: Annotation<TransitData | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  intent: Annotation<Intent | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  toolCallsThisTurn: Annotation<number>({
    reducer: (prev, next) => next,
    default: () => 0,
  }),
  sessionId: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  error: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  knowledgeContext: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
});

export type AgentState = typeof AgentStateAnnotation.State;
