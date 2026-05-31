import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export const RUBRICS = {
  warmth: `1=Cold/robotic. 2=Neutral. 3=Friendly. 4=Warm and spiritual. 5=Exceptionally warm, user feels seen.`,
  accuracy: `1=Factually wrong. 2=Mostly wrong. 3=Approx correct. 4=Correct and grounded. 5=Precise, no hallucinations.`,
  relevance: `1=Off-topic. 2=Tangential. 3=Addresses question with padding. 4=Direct answer. 5=Direct + anticipates follow-up.`,
};

export async function judgeResponse(
  judgeModel: ChatGoogleGenerativeAI,
  question: string,
  response: string,
  dimension: "warmth" | "accuracy" | "relevance"
): Promise<{ score: number; reason: string }> {
  const prompt = `You are evaluating an AI astrology assistant.
User question: ${question}
Agent response: ${response}
Score on "${dimension}": ${RUBRICS[dimension]}
Respond ONLY with JSON: {"score": <1-5>, "reason": "<one sentence>"}`;

  try {
    const reply = await judgeModel.invoke(prompt);
    const text = typeof reply.content === "string" ? reply.content : "";
    return JSON.parse(text.trim().replace(/```json|```/g, ""));
  } catch (err) {
    return { score: 3, reason: "Parse error during LLM judgment evaluation." };
  }
}
