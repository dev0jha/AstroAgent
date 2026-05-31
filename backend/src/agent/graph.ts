import { StateGraph, END, START } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AgentStateAnnotation, AgentState } from "./state";
import {
  routerNode, gatherBirthDetailsNode, geocodeNode,
  chartNode, transitNode, knowledgeNode, respondNode, errorHandlerNode
} from "./nodes";

export function buildGraph(model: ChatGoogleGenerativeAI) {
  const graph = new StateGraph(AgentStateAnnotation) as any;

  // Bind model into nodes that need it
  graph
    .addNode("router",              (s: AgentState) => routerNode(s, model))
    .addNode("gather_birth_details",(s: AgentState) => gatherBirthDetailsNode(s, model))
    .addNode("geocode",             geocodeNode)
    .addNode("chart",               chartNode)
    .addNode("transit",             transitNode)
    .addNode("knowledge",           knowledgeNode)
    .addNode("respond",             (s: AgentState) => respondNode(s, model))
    .addNode("error_handler",       (s: AgentState) => errorHandlerNode(s, model));

  // Entry
  graph.addEdge(START, "router");

  // Conditional routing from router
  graph.addConditionalEdges("router", (state: AgentState) => {
    // Runaway tool loop guard
    if (state.toolCallsThisTurn >= 6) return "error_handler";

    switch (state.intent) {
      case "chart_request":
        if (!state.birthDetails) return "gather_birth_details";
        if (!state.birthDetails.latitude) return "geocode";
        if (!state.natalChart) return "chart";
        return "respond"; // chart already cached

      case "daily_horoscope":
        if (!state.birthDetails) return "gather_birth_details";
        if (!state.birthDetails.latitude) return "geocode";
        if (!state.natalChart) return "chart";
        return "transit";

      case "free_question":
        return "knowledge";

      case "off_topic":
      default:
        return "respond";
    }
  });

  // After geocode: check for error or continue to chart
  graph.addConditionalEdges("geocode", (state: AgentState) =>
    state.error ? "error_handler" : "chart"
  );

  // After chart: check for error; horoscope path continues to transit, chart path to respond
  graph.addConditionalEdges("chart", (state: AgentState) => {
    if (state.error) return "error_handler";
    if (state.intent === "daily_horoscope") return "transit";
    return "respond";
  });

  // After transit: check for error or go to knowledge
  graph.addConditionalEdges("transit", (state: AgentState) =>
    state.error ? "error_handler" : "knowledge"
  );

  // Linear edges
  graph.addEdge("gather_birth_details", END);
  graph.addEdge("knowledge",            "respond");
  graph.addEdge("respond",              END);
  graph.addEdge("error_handler",        END);

  return graph.compile();
}
