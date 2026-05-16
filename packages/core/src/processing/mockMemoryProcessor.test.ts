import { expect, test } from "bun:test";
import type { CaptureArtifact, CaptureSession, MemoryCard } from "../domain";
import { MockMemoryProcessor } from "./mockMemoryProcessor";

const session: CaptureSession = {
  createdAt: "2026-05-16T00:00:00.000Z",
  id: "session_1",
  mode: "interview_prep",
  startedAt: "2026-05-16T00:00:00.000Z",
  status: "processing",
  title: "Frontend performance revision",
  updatedAt: "2026-05-16T00:00:00.000Z"
};

const artifacts: CaptureArtifact[] = [
  {
    artifactType: "manual_note",
    content:
      "Core Web Vitals, LCP, CLS, INP, bundle splitting, lazy loading, hydration cost, React rendering, caching, and CDN strategy are important frontend interview topics.",
    createdAt: "2026-05-16T00:00:00.000Z",
    id: "artifact_1",
    sessionId: "session_1"
  }
];

test("mock processor extracts deterministic memory drafts and reader markdown", async () => {
  const processor = new MockMemoryProcessor();

  const result = await processor.process({
    artifacts,
    existingMemories: [],
    session
  });

  expect(result.memories.length).toBeGreaterThan(0);
  expect(result.memories[0]?.title).toContain("Core Web Vitals");
  expect(result.readerPage.contentMarkdown).toContain("## Key Takeaways");
  expect(result.revisionItems.some((item) => item.question.includes("LCP"))).toBe(true);
});

test("mock processor suggests explainable links using keyword overlap", async () => {
  const processor = new MockMemoryProcessor();
  const links = await processor.suggestLinks(
    {
      category: "project",
      confidence: 0.7,
      evidence: {},
      fullText: "SQLite should be the canonical memory database for local first memory.",
      importance: 4,
      memoryType: "decision",
      summary: "SQLite should be canonical.",
      title: "SQLite should be canonical"
    },
    [
      {
        category: "project",
        confidence: 0.8,
        createdAt: "2026-05-16T00:00:00.000Z",
        fullText: "Markdown export is a readable mirror while SQLite remains the memory source of truth.",
        id: "mem_existing",
        importance: 4,
        memoryType: "decision",
        status: "approved",
        summary: "Markdown is a mirror.",
        title: "Markdown mirror",
        updatedAt: "2026-05-16T00:00:00.000Z"
      } satisfies MemoryCard
    ]
  );

  expect(links).toHaveLength(1);
  expect(links[0]?.reason).toContain("shared keywords");
});
