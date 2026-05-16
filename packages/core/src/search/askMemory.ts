import type { Database } from "bun:sqlite";
import { searchMemory, type SearchResult } from "./search";

export type AskMemoryAnswer = {
  answer: string;
  sources: SearchResult[];
};

export function askMemory(db: Database, question: string): AskMemoryAnswer {
  const sources = searchMemory(db, { q: question }).slice(0, 5);

  if (sources.length === 0) {
    return {
      answer: "I could not find local memories that support an answer to that question.",
      sources: []
    };
  }

  const sourceSummaries = sources.map((source) => source.summary || source.snippet).filter(Boolean);
  return {
    answer: `Based on ${sources.length} local source${sources.length === 1 ? "" : "s"}: ${sourceSummaries.join(" ")}`,
    sources
  };
}
