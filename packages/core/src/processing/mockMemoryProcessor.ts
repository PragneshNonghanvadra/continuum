import type { MemoryCard, MemoryCategory, MemoryType } from "../domain";
import type {
  LinkDraft,
  MemoryDraft,
  MemoryProcessor,
  ProcessInput,
  ProcessSessionResult,
  ReaderPageDraft,
  RevisionItemDraft
} from "./types";

const stopWords = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "because",
  "been",
  "but",
  "can",
  "for",
  "from",
  "has",
  "have",
  "into",
  "not",
  "that",
  "the",
  "this",
  "through",
  "use",
  "user",
  "with",
  "without",
  "should"
]);

export class MockMemoryProcessor implements MemoryProcessor {
  constructor(private readonly loadInput?: (sessionId: string) => Promise<ProcessInput> | ProcessInput) {}

  async processSession(sessionId: string): Promise<ProcessSessionResult> {
    if (!this.loadInput) {
      throw new Error("MockMemoryProcessor requires a session loader to process by id.");
    }
    return this.process(await this.loadInput(sessionId));
  }

  async process(input: ProcessInput): Promise<ProcessSessionResult> {
    const memories = await this.extractMemories(input);
    const readerPage = await this.generateReaderPage(input);
    const revisionItems = generateRevisionItems(input, memories);
    const links = await Promise.all(
      memories.map(async (memory) => ({
        links: await this.suggestLinks(memory, input.existingMemories),
        sourceDraftTitle: memory.title
      }))
    );

    return {
      entities: extractEntities(combineArtifactText(input)),
      links,
      memories,
      readerPage,
      revisionItems,
      summary: summarize(combineArtifactText(input)),
      tags: extractTags(combineArtifactText(input))
    };
  }

  async extractMemories(input: ProcessInput): Promise<MemoryDraft[]> {
    const text = combineArtifactText(input);
    const candidates = extractCandidateStatements(text).slice(0, 8);
    const category = inferCategory(`${input.session.title}\n${text}`, input.session.mode);

    return candidates.map((statement, index) => ({
      category,
      confidence: Math.max(0.55, 0.82 - index * 0.03),
      evidence: {
        artifactIds: input.artifacts.map((artifact) => artifact.id),
        sessionId: input.session.id,
        sourceTitle: input.session.sourceTitle ?? input.session.title,
        sourceUrl: input.session.sourceUrl
      },
      fullText: statement,
      importance: inferImportance(statement),
      memoryType: inferMemoryType(statement),
      summary: summarize(statement),
      title: toTitle(statement)
    }));
  }

  async generateReaderPage(input: ProcessInput): Promise<ReaderPageDraft> {
    const text = combineArtifactText(input);
    const memories = await this.extractMemories(input);
    const summary = summarize(text);
    const sourceLines = input.artifacts.map((artifact) => `- ${artifact.artifactType} captured at ${artifact.createdAt}`).join("\n");
    const memoryLines = memories.map((memory) => `- **${memory.title}**: ${memory.summary}`).join("\n");

    return {
      contentMarkdown: [
        `# ${input.session.title}`,
        "",
        "## Summary",
        "",
        summary,
        "",
        "## Key Takeaways",
        "",
        memoryLines || "- No strong takeaways found yet.",
        "",
        "## Source Evidence",
        "",
        sourceLines || "- No artifacts captured.",
        "",
        "## Related Memories",
        "",
        "Related memories are suggested after drafts are compared with approved memory cards."
      ].join("\n"),
      pageType: "session",
      slug: slugify(input.session.title),
      sourceSessionId: input.session.id,
      summary,
      title: input.session.title
    };
  }

  async generateRevisionPack(input: ProcessInput): Promise<ReaderPageDraft> {
    const memories = await this.extractMemories(input);
    const questions = generateRevisionItems(input, memories);

    return {
      contentMarkdown: [`# ${input.session.title} Revision`, "", ...questions.map((item) => `- Q: ${item.question}\n  A: ${item.answer ?? ""}`)].join("\n"),
      pageType: "revision_pack",
      slug: `${slugify(input.session.title)}-revision`,
      sourceSessionId: input.session.id,
      summary: `Revision material generated from ${input.session.title}.`,
      title: `${input.session.title} Revision`
    };
  }

  async suggestLinks(memory: MemoryDraft, candidates: MemoryCard[]): Promise<LinkDraft[]> {
    const sourceKeywords = keywords(memory.fullText);

    return candidates
      .map((candidate) => {
        const overlap = intersection(sourceKeywords, keywords(`${candidate.title} ${candidate.summary} ${candidate.fullText}`));
        const score = overlap.length / Math.max(sourceKeywords.length, 1);
        return {
          candidate,
          overlap,
          score
        };
      })
      .filter((match) => match.score >= 0.18 || (match.candidate.category === memory.category && match.overlap.length >= 2))
      .slice(0, 5)
      .map((match) => ({
        reason: `Linked because both memories have shared keywords: ${match.overlap.slice(0, 5).join(", ")}.`,
        relationType: match.candidate.category === memory.category ? "similar_topic" : "expands",
        score: Number(match.score.toFixed(2)),
        targetMemoryId: match.candidate.id
      }));
  }
}

function combineArtifactText(input: ProcessInput) {
  return input.artifacts
    .map((artifact) => [artifact.content, artifact.metadata ? JSON.stringify(artifact.metadata) : ""].filter(Boolean).join("\n"))
    .join("\n\n")
    .trim();
}

function summarize(text: string) {
  const sentences = splitSentences(text).slice(0, 2);
  return sentences.join(" ").slice(0, 500) || "No summary could be generated from the captured artifacts.";
}

function extractCandidateStatements(text: string) {
  const bulletLines = text
    .split("\n")
    .map((line) => line.trim().replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, ""))
    .filter((line) => line.length >= 24);
  const sentences = splitSentences(text).filter((sentence) => sentence.length >= 24);
  const unique = Array.from(new Set([...bulletLines, ...sentences]));
  return unique.length > 0 ? unique : [text].filter(Boolean);
}

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function toTitle(statement: string) {
  return statement
    .replace(/[.!?]+$/, "")
    .split(/\s+/)
    .slice(0, 9)
    .join(" ");
}

function inferCategory(text: string, mode: string): MemoryCategory {
  const lower = text.toLowerCase();
  if (lower.includes("finance") || lower.includes("money")) return "finance";
  if (mode === "interview_prep" || lower.includes("career") || lower.includes("interview")) return "career";
  if (lower.includes("project") || lower.includes("app") || lower.includes("sqlite")) return "project";
  if (mode === "article" || mode === "video" || lower.includes("learn")) return "learning";
  return "other";
}

function inferMemoryType(statement: string): MemoryType {
  const lower = statement.toLowerCase();
  if (statement.endsWith("?")) return "question";
  if (lower.includes("should") || lower.includes("prefer") || lower.includes("decision")) return "decision";
  if (lower.includes("todo") || lower.includes("need to")) return "todo";
  if (lower.includes("important") || lower.includes("learn")) return "learning";
  return "insight";
}

function inferImportance(statement: string): 1 | 2 | 3 | 4 | 5 {
  const lower = statement.toLowerCase();
  if (lower.includes("must") || lower.includes("important") || lower.includes("decision")) return 4;
  if (lower.includes("should") || lower.includes("prefer")) return 3;
  return 2;
}

function generateRevisionItems(input: ProcessInput, memories: MemoryDraft[]): RevisionItemDraft[] {
  const isLearningMode = ["article", "video", "audio", "interview_prep"].includes(input.session.mode);
  if (!isLearningMode) {
    return [];
  }

  const text = combineArtifactText(input);
  const questions: RevisionItemDraft[] = [];

  if (/\bLCP\b/i.test(text)) {
    questions.push({
      answer: "LCP measures when the largest above-the-fold content is rendered; improve it with faster server response, optimized images, preload hints, caching, and less render-blocking work.",
      difficulty: "medium",
      question: "What is LCP and how do you improve it?"
    });
  }

  if (/bundle splitting/i.test(text)) {
    questions.push({
      answer: "Bundle splitting reduces initial JavaScript by loading only the code needed for the current route or interaction.",
      difficulty: "medium",
      question: "How does bundle splitting improve frontend performance?"
    });
  }

  for (const memory of memories.slice(0, 3)) {
    questions.push({
      answer: memory.summary,
      difficulty: "easy",
      question: `What should you remember about ${memory.title}?`
    });
  }

  return questions;
}

function keywords(text: string) {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 3 && !stopWords.has(word))
    )
  );
}

function intersection(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.filter((word) => rightSet.has(word));
}

function extractTags(text: string) {
  return keywords(text).slice(0, 8);
}

function extractEntities(text: string) {
  const matches = text.match(/\b[A-Z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*){0,3}\b/g) ?? [];
  return Array.from(new Set(matches)).slice(0, 12);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
