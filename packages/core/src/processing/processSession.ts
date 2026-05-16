import type { Database } from "bun:sqlite";
import { listArtifactsForSession } from "../db/artifactRepository";
import { createMemoryLink } from "../db/memoryLinkRepository";
import { createMemoryCard, listMemories } from "../db/memoryRepository";
import { createReaderPage } from "../db/readerPageRepository";
import { createRevisionItem } from "../db/revisionRepository";
import { indexArtifact, indexMemory, indexReaderPage } from "../db/searchIndexRepository";
import { getSession, updateSession } from "../db/sessionRepository";
import {
  attachMemoryToEntity,
  attachMemoryToTag,
  attachMemoryToTopic,
  upsertEntity,
  upsertTag,
  upsertTopic
} from "../db/topicRepository";
import { createDefaultMemoryProcessor } from "./aiMemoryProcessor";
import type { MemoryProcessor } from "./types";

export type PersistedProcessResult = {
  memoryCount: number;
  readerPageId: string;
  revisionItemCount: number;
  linkCount: number;
};

export async function processCapturedSession(
  db: Database,
  sessionId: string,
  processor: MemoryProcessor = createDefaultMemoryProcessor()
): Promise<PersistedProcessResult> {
  const session = getSession(db, sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  const artifacts = listArtifactsForSession(db, sessionId);
  const existingMemories = listMemories(db, { status: "approved" });
  const result = await processor.process({ artifacts, existingMemories, session });

  const createdMemories = result.memories.map((draft) => createMemoryCard(db, draft, session.id));
  const readerPage = createReaderPage(db, result.readerPage);
  const revisionItems = result.revisionItems.map((draft, index) =>
    createRevisionItem(db, {
      ...draft,
      memoryId: createdMemories[index % Math.max(createdMemories.length, 1)]?.id,
      readerPageId: readerPage.id
    })
  );

  let linkCount = 0;
  for (const linkedDrafts of result.links) {
    const sourceMemory = createdMemories.find((memory) => memory.title === linkedDrafts.sourceDraftTitle);
    if (!sourceMemory) continue;
    for (const link of linkedDrafts.links) {
      createMemoryLink(db, sourceMemory.id, link);
      linkCount += 1;
    }
  }

  for (const memory of createdMemories) {
    indexMemory(db, memory, session);
    for (const tagName of result.tags.slice(0, 5)) {
      const tag = upsertTag(db, tagName);
      attachMemoryToTag(db, tag.id, memory.id);
      const topic = upsertTopic(db, tagName, memory.category);
      attachMemoryToTopic(db, topic.id, memory.id);
    }
    for (const entityName of result.entities.slice(0, 6)) {
      const entity = upsertEntity(db, entityName);
      attachMemoryToEntity(db, entity.id, memory.id);
    }
  }

  indexReaderPage(db, readerPage, session);
  for (const artifact of artifacts) {
    indexArtifact(db, artifact, session);
  }

  updateSession(db, session.id, {
    endedAt: session.endedAt ?? new Date().toISOString(),
    status: "processed"
  });

  return {
    linkCount,
    memoryCount: createdMemories.length,
    readerPageId: readerPage.id,
    revisionItemCount: revisionItems.length
  };
}
