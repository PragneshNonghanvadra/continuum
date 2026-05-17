import { expect, test } from "bun:test";
import { createMemoryDatabase } from "../db/connection";
import { storeEmbedding, searchStoredEmbeddings } from "./embeddings";

test("stores embedding vectors for semantic-search-ready records", () => {
  const db = createMemoryDatabase();

  const embedding = storeEmbedding(db, {
    dimensions: 4,
    model: "local-fixture",
    provider: "mock-embedding",
    recordId: "memory_1",
    recordType: "memory",
    textHash: "hash_1",
    vector: [1, 0, 0, 0]
  });

  expect(embedding.recordId).toBe("memory_1");
  expect(embedding.vector).toEqual([1, 0, 0, 0]);
});

test("semantic boundary ranks stored embeddings with cosine similarity", () => {
  const db = createMemoryDatabase();
  storeEmbedding(db, {
    dimensions: 3,
    model: "local-fixture",
    provider: "mock-embedding",
    recordId: "memory_frontend",
    recordType: "memory",
    textHash: "hash_frontend",
    vector: [1, 0, 0]
  });
  storeEmbedding(db, {
    dimensions: 3,
    model: "local-fixture",
    provider: "mock-embedding",
    recordId: "memory_finance",
    recordType: "memory",
    textHash: "hash_finance",
    vector: [0, 1, 0]
  });

  const results = searchStoredEmbeddings(db, [0.9, 0.1, 0], { limit: 1 });

  expect(results).toHaveLength(1);
  expect(results[0]?.recordId).toBe("memory_frontend");
  expect(results[0]?.score).toBeGreaterThan(0.98);
});
