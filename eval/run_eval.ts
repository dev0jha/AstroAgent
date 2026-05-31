import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import * as dotenv from "dotenv";
import { judgeResponse } from "./judges";

// Load environment variables from local, backend, or root .env
dotenv.config();
dotenv.config({ path: path.join(__dirname, "../backend/.env") });
dotenv.config({ path: path.join(__dirname, "../.env") });

interface TestCase {
  id: string;
  category: "chart_request_valid" | "daily_horoscope" | "free_question"
           | "invalid_birth_data" | "off_topic" | "adversarial";
  input: {
    message: string;
    birth_details?: {
      date: string;
      time: string | null;
      place: string;
    };
  };
  expected: {
    intent?: string;
    tool_must_be_called?: string;
    sun_sign?: string;
    response_must_contain?: string[];
    response_must_not_contain?: string[];
    max_tool_calls?: number;
    graceful_failure?: boolean;
    is_off_topic?: boolean;
  };
  judge_dimensions?: ("warmth" | "accuracy" | "relevance")[];
}

const API_BASE = process.env.EVAL_API_BASE ?? "http://localhost:3001";
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY!;

const JUDGE_MODEL = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: GOOGLE_AI_API_KEY,
});

// Load golden set
function loadGoldenSet(): TestCase[] {
  const goldenPath = path.join(__dirname, "golden_set.jsonl");
  if (!fs.existsSync(goldenPath)) {
    throw new Error(`Golden set file not found at ${goldenPath}`);
  }
  const lines = fs.readFileSync(goldenPath, "utf-8")
    .split("\n").filter(Boolean);
  return lines.map((l) => JSON.parse(l));
}

// Call the agent API via POST /api/chat with SSE response parsing
async function runAgentForTestCase(tc: TestCase): Promise<{
  responseText: string;
  toolsCalled: string[];
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  const toolsCalled: string[] = [];
  let responseText = "";
  let errorMsg: string | undefined;

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: `eval_${tc.id}_${Date.now()}`,
        message: tc.input.message,
        birth_details: tc.input.birth_details ?? null,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    if (!res.body) {
      throw new Error("No response body received from server.");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";

      for (const chunk of lines) {
        const dataLine = chunk.split("\n").find((l) => l.startsWith("data: "));
        if (!dataLine) continue;
        const jsonStr = dataLine.replace("data: ", "").trim();
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr);
          if (event.type === "token")      responseText += event.content;
          if (event.type === "tool_start") toolsCalled.push(event.tool);
          if (event.type === "error")      errorMsg = event.message;
        } catch {
          // Skip malformed SSE chunks
        }
      }
    }
  } catch (e: any) {
    errorMsg = e.message;
  }

  return { responseText, toolsCalled, latencyMs: Date.now() - start, error: errorMsg };
}

// Deterministic assertions based on golden set expected criteria
function runDeterministicChecks(
  tc: TestCase,
  result: { responseText: string; toolsCalled: string[]; latencyMs: number; error?: string }
) {
  const checks: Record<string, boolean> = {};
  const exp = tc.expected;
  const text = result.responseText.toLowerCase();

  if (exp.tool_must_be_called) {
    checks.tool_called = result.toolsCalled.includes(exp.tool_must_be_called);
  }
  if (exp.response_must_contain) {
    checks.contains_keywords = exp.response_must_contain.every((kw) => text.includes(kw.toLowerCase()));
  }
  if (exp.response_must_not_contain) {
    checks.no_banned_phrases = !exp.response_must_not_contain.some((kw) => text.includes(kw.toLowerCase()));
  }
  if (exp.max_tool_calls !== undefined) {
    checks.within_step_budget = result.toolsCalled.length <= exp.max_tool_calls;
  }
  if (exp.graceful_failure) {
    checks.graceful_failure = !result.error && result.responseText.length > 20;
  }

  return checks;
}

// Main harness execution
async function main() {
  console.log("=".repeat(60));
  console.log("  AstroAgent Evaluation Harness");
  console.log("=".repeat(60));

  let cases: TestCase[];
  try {
    cases = loadGoldenSet();
  } catch (err: any) {
    console.error(`Failed to load golden set: ${err.message}`);
    process.exit(1);
  }

  const results: any[] = [];
  const judgeVerdicts: any[] = [];

  for (const tc of cases) {
    process.stdout.write(`  Running ${tc.id} (${tc.category})... `);
    const agentResult = await runAgentForTestCase(tc);
    const checks = runDeterministicChecks(tc, agentResult);

    const judgeScores: Record<string, number> = {};
    if (tc.judge_dimensions && GOOGLE_AI_API_KEY) {
      for (const dim of tc.judge_dimensions) {
        const verdict = await judgeResponse(JUDGE_MODEL, tc.input.message, agentResult.responseText, dim);
        judgeScores[dim] = verdict.score;
        judgeVerdicts.push({
          id: tc.id,
          dimension: dim,
          score: verdict.score,
          reason: verdict.reason,
          response: agentResult.responseText.slice(0, 200),
        });
      }
    }

    results.push({
      id: tc.id,
      category: tc.category,
      latencyMs: agentResult.latencyMs,
      toolsCalled: agentResult.toolsCalled,
      checks,
      judgeScores,
      error: agentResult.error,
    });

    const allPassed = Object.values(checks).every(Boolean);
    console.log(allPassed ? "✓" : "✗");
  }

  // Calculate Aggregated Metrics
  const total = results.length;
  const checkNames = ["tool_called", "contains_keywords", "no_banned_phrases", "within_step_budget", "graceful_failure"];
  const checkSummary: Record<string, { pass: number; total: number }> = {};
  for (const name of checkNames) {
    const relevant = results.filter((r) => name in r.checks);
    checkSummary[name] = {
      pass: relevant.filter((r) => r.checks[name]).length,
      total: relevant.length,
    };
  }

  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const p50 = (latencies[Math.floor(latencies.length * 0.5)] / 1000).toFixed(1);
  const p95 = (latencies[Math.floor(latencies.length * 0.95)] / 1000).toFixed(1);
  const avgTools = (results.reduce((s, r) => s + r.toolsCalled.length, 0) / total).toFixed(1);
  const failures = results.filter((r) => r.error).length;

  const judgeByDim: Record<string, number[]> = {};
  for (const v of judgeVerdicts) {
    if (!judgeByDim[v.dimension]) judgeByDim[v.dimension] = [];
    judgeByDim[v.dimension].push(v.score);
  }
  const judgeAvgs = Object.fromEntries(
    Object.entries(judgeByDim).map(([dim, scores]) => [
      dim,
      (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
    ])
  );

  const scorecard = `
=== AstroAgent Eval Scorecard ===
Date: ${new Date().toISOString()}

DETERMINISTIC CHECKS
${checkNames.map((n) => {
  const s = checkSummary[n];
  if (!s || s.total === 0) return `  ${n.padEnd(30)} N/A`;
  const pct = ((s.pass / s.total) * 100).toFixed(1);
  return `  ${n.padEnd(30)} ${s.pass}/${s.total}   ${pct}%`;
}).join("\n")}

LLM-AS-JUDGE (1-5 scale)
${Object.entries(judgeAvgs).length > 0
  ? Object.entries(judgeAvgs).map(([dim, avg]) => `  ${dim.padEnd(20)} ${avg} / 5.0`).join("\n")
  : "  (Judge API evaluated offline)"}

PERFORMANCE
  p50_latency         ${p50}s
  p95_latency         ${p95}s
  avg_tool_calls      ${avgTools}
  failure_rate        ${((failures / total) * 100).toFixed(1)}% (${failures}/${total})
`;

  console.log(scorecard);

  // Write scorecard.md in the current folder
  fs.writeFileSync(path.join(__dirname, "scorecard.md"), scorecard);

  // Append entry to results_log.csv
  const csvPath = path.join(__dirname, "results_log.csv");
  const headers = "run_date,p50_latency,p95_latency,avg_tool_calls,failure_rate," + Object.keys(judgeAvgs).join(",") + "\n";
  const row = `${new Date().toISOString()},${p50},${p95},${avgTools},${((failures / total) * 100).toFixed(1)},${Object.values(judgeAvgs).join(",")}\n`;
  if (!fs.existsSync(csvPath)) {
    fs.writeFileSync(csvPath, headers);
  }
  fs.appendFileSync(csvPath, row);

  // Human spot-check (Random 5 verdicts)
  if (judgeVerdicts.length > 0) {
    const sampleSize = Math.min(5, judgeVerdicts.length);
    const sample = judgeVerdicts.sort(() => Math.random() - 0.5).slice(0, sampleSize);
    console.log("\n--- Human Spot-Check (Random judge verdicts) ---");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let agreements = 0;

    for (const v of sample) {
      console.log(`\n[${v.id}] ${v.dimension} — Score: ${v.score}/5`);
      console.log(`Reason: ${v.reason}`);
      console.log(`Response excerpt: "${v.response}..."`);
      
      const answer = await new Promise<string>((resolve) => {
        rl.question("Do you agree with this score? (y/n): ", resolve);
      });
      if (answer.toLowerCase() === "y" || answer.toLowerCase() === "") {
        agreements++;
      }
    }

    rl.close();
    const agreement = ((agreements / sample.length) * 100).toFixed(0);
    console.log(`\nHuman agreement rate: ${agreements}/${sample.length} (${agreement}%)`);
    fs.appendFileSync(path.join(__dirname, "scorecard.md"), `\nHuman spot-check agreement: ${agreement}%\n`);
  }
}

main().catch(console.error);
