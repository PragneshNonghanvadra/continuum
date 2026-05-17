import type { Database } from "bun:sqlite";
import {
  createAiProviderFromEnv,
  type AiGenerationProvider,
  type AiProviderDescription,
  type AiProviderEnvironment
} from "../ai/provider";
import { searchMemory, type SearchResult } from "./search";

export type AskMemoryAnswer = {
  answer: string;
  mode: "ai" | "retrieval";
  provider?: AiProviderDescription;
  sources: SearchResult[];
};

export function askMemory(db: Database, question: string): AskMemoryAnswer {
  const sources = searchMemory(db, { q: question }).slice(0, 5);

  if (sources.length === 0) {
    return {
      answer: "I could not find local memories that support an answer to that question.",
      mode: "retrieval",
      sources: []
    };
  }

  return {
    answer: buildRetrievalAnswer(sources),
    mode: "retrieval",
    sources
  };
}

export type AskMemoryWithAiOptions = {
  env?: AiProviderEnvironment;
  maxSources?: number;
  provider?: AiGenerationProvider;
  requireProvider?: boolean;
};

export async function askMemoryWithAi(db: Database, question: string, options: AskMemoryWithAiOptions = {}): Promise<AskMemoryAnswer> {
  const sources = searchMemory(db, { q: question }).slice(0, options.maxSources ?? 5);
  if (sources.length === 0) {
    return {
      answer: "I could not find local memories that support an answer to that question.",
      mode: "retrieval",
      sources: []
    };
  }

  const provider = options.provider ?? createAiProviderFromEnv(options.env);
  if (!provider.isConfigured()) {
    if (options.requireProvider) {
      throw new Error("AI provider is required but is not configured.");
    }
    return {
      answer: buildRetrievalAnswer(sources),
      mode: "retrieval",
      provider: provider.describe(),
      sources
    };
  }

  try {
    const output = await provider.generateJson<AskMemoryDraft>({
      input: {
        question,
        sources: sources.map((source) => ({
          recordId: source.recordId,
          recordType: source.recordType,
          snippet: source.snippet,
          sourceType: source.sourceType,
          status: source.status,
          summary: source.summary,
          title: source.title
        }))
      },
      prompt: buildAskPrompt(question, sources),
      schemaName: "AskMemoryAnswerDraft",
      task: "ask_memory"
    });

    if (!isAskMemoryDraft(output)) {
      if (options.requireProvider) {
        throw new Error("AI provider returned an invalid AskMemoryAnswerDraft.");
      }
      return {
        answer: buildRetrievalAnswer(sources),
        mode: "retrieval",
        provider: provider.describe(),
        sources
      };
    }

    return {
      answer: output.answer,
      mode: "ai",
      provider: provider.describe(),
      sources
    };
  } catch (error) {
    if (options.requireProvider) {
      throw error instanceof Error ? error : new Error("AI Ask Memory provider failed.");
    }
    return {
      answer: buildRetrievalAnswer(sources),
      mode: "retrieval",
      provider: provider.describe(),
      sources
    };
  }
}

type AskMemoryDraft = {
  answer: string;
};

function buildRetrievalAnswer(sources: SearchResult[]) {
  const sourceSummaries = sources.map((source) => source.summary || source.snippet).filter(Boolean);
  return `Based on ${sources.length} local source${sources.length === 1 ? "" : "s"}: ${sourceSummaries.join(" ")}`;
}

function buildAskPrompt(question: string, sources: SearchResult[]) {
  return [
    "You are Continuum's Ask Memory synthesis engine.",
    "Answer only from the provided local sources.",
    "If the sources do not support an answer, say that directly.",
    "Do not invent facts, sessions, dates, links, or decisions.",
    "Return strict JSON matching AskMemoryAnswerDraft: { \"answer\": string }.",
    "",
    `Question: ${question}`,
    "",
    "Sources:",
    ...sources.map(
      (source, index) =>
        `${index + 1}. [${source.recordType}:${source.recordId}] ${source.title}\nSummary: ${
          source.summary || source.snippet || "No summary available."
        }`
    )
  ].join("\n");
}

function isAskMemoryDraft(value: unknown): value is AskMemoryDraft {
  if (!value || typeof value !== "object") return false;
  return typeof (value as Partial<AskMemoryDraft>).answer === "string";
}
