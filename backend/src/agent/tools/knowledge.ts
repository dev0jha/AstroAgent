import fs from "fs";
import path from "path";

// Pure CJS BM25 implementation — lightweight, no ESM issues
// Manual TF-IDF BM25 implementation (k1=1.5, b=0.75)

interface Doc {
  id: string;
  text: string;
  terms: Record<string, number>;
  length: number;
}

let docs: Doc[] = [];
let chunks: string[] = [];
let indexed = false;
let avgDocLength = 0;

const K1 = 1.5;
const B = 0.75;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function buildIndex() {
  const notesPath = path.join(__dirname, "../../knowledge/astrology_notes.md");
  const text = fs.readFileSync(notesPath, "utf-8");

  // Split into ~200-word chunks with 50-word overlap
  const words = text.split(/\s+/);
  const CHUNK_SIZE = 200;
  const OVERLAP = 50;
  chunks = [];

  for (let i = 0; i < words.length; i += CHUNK_SIZE - OVERLAP) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(" ");
    if (chunk.trim().length > 0) chunks.push(chunk);
  }

  docs = chunks.map((chunk, idx) => {
    const terms = tokenize(chunk).reduce((acc, t) => {
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { id: `chunk_${idx}`, text: chunk, terms, length: Object.values(terms).reduce((a, b) => a + b, 0) };
  });

  avgDocLength = docs.reduce((s, d) => s + d.length, 0) / (docs.length || 1);
  indexed = true;
}

function bm25Score(doc: Doc, queryTerms: string[]): number {
  let score = 0;
  const N = docs.length;

  for (const term of queryTerms) {
    const tf = doc.terms[term] ?? 0;
    if (tf === 0) continue;

    const df = docs.filter((d) => (d.terms[term] ?? 0) > 0).length;
    const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
    const tfNorm = (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (doc.length / avgDocLength)));
    score += idf * tfNorm;
  }

  return score;
}

export function knowledgeLookup(query: string): string {
  if (!indexed) buildIndex();

  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) {
    return "No specific reference found. Drawing from general astrological principles.";
  }

  const scored = docs
    .map((doc) => ({ doc, score: bm25Score(doc, queryTerms) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return "No specific reference found. Drawing from general astrological principles.";
  }

  const topChunks = scored.slice(0, 3).map((r) => r.doc.text);
  return topChunks.join("\n\n---\n\n");
}
