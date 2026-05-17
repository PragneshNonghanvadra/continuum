import type { Database } from "bun:sqlite";

export type EmbeddingRecordType = "artifact" | "memory" | "reader_page" | "session";

export type StoredEmbedding = {
  id: string;
  recordType: EmbeddingRecordType;
  recordId: string;
  provider: string;
  model: string;
  dimensions: number;
  vector: number[];
  textHash: string;
  createdAt: string;
};

export type StoreEmbeddingInput = Omit<StoredEmbedding, "createdAt" | "id">;

export type EmbeddingSearchResult = StoredEmbedding & {
  score: number;
};

export interface EmbeddingProvider {
  readonly id: string;
  readonly model: string;
  embed(text: string): Promise<number[]>;
}

export class DisabledEmbeddingProvider implements EmbeddingProvider {
  readonly id = "disabled";
  readonly model = "none";

  async embed(_text: string): Promise<number[]> {
    throw new Error("Embedding provider is not configured.");
  }
}

export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly id = "mock-embedding";
  readonly model = "local-fixture";

  async embed(text: string): Promise<number[]> {
    const buckets = [0, 0, 0, 0, 0, 0];
    for (const char of text.toLowerCase()) {
      const code = char.charCodeAt(0);
      if (code >= 97 && code <= 122) {
        const bucket = code % buckets.length;
        buckets[bucket] = (buckets[bucket] ?? 0) + 1;
      }
    }
    return normalizeVector(buckets);
  }
}

export function storeEmbedding(db: Database, input: StoreEmbeddingInput): StoredEmbedding {
  const embedding: StoredEmbedding = {
    ...input,
    createdAt: new Date().toISOString(),
    id: `emb_${crypto.randomUUID()}`
  };
  db.query(
    `
      insert or replace into memory_embeddings (
        id, record_type, record_id, provider, model, dimensions, vector_json, text_hash, created_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    embedding.id,
    embedding.recordType,
    embedding.recordId,
    embedding.provider,
    embedding.model,
    embedding.dimensions,
    JSON.stringify(embedding.vector),
    embedding.textHash,
    embedding.createdAt
  );
  return embedding;
}

export function listStoredEmbeddings(db: Database): StoredEmbedding[] {
  return db
    .query<EmbeddingRow, []>(
      `
        select id, record_type, record_id, provider, model, dimensions, vector_json, text_hash, created_at
        from memory_embeddings
        order by created_at desc
      `
    )
    .all()
    .map(mapEmbeddingRow);
}

export function searchStoredEmbeddings(
  db: Database,
  queryVector: number[],
  options: { limit?: number; recordType?: EmbeddingRecordType } = {}
): EmbeddingSearchResult[] {
  return listStoredEmbeddings(db)
    .filter((embedding) => !options.recordType || embedding.recordType === options.recordType)
    .map((embedding) => ({
      ...embedding,
      score: cosineSimilarity(queryVector, embedding.vector)
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, options.limit ?? 10);
}

type EmbeddingRow = {
  id: string;
  record_type: EmbeddingRecordType;
  record_id: string;
  provider: string;
  model: string;
  dimensions: number;
  vector_json: string;
  text_hash: string;
  created_at: string;
};

function mapEmbeddingRow(row: EmbeddingRow): StoredEmbedding {
  return {
    createdAt: row.created_at,
    dimensions: row.dimensions,
    id: row.id,
    model: row.model,
    provider: row.provider,
    recordId: row.record_id,
    recordType: row.record_type,
    textHash: row.text_hash,
    vector: JSON.parse(row.vector_json) as number[]
  };
}

function cosineSimilarity(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < length; index += 1) {
    dot += left[index]! * right[index]!;
    leftMagnitude += left[index]! ** 2;
    rightMagnitude += right[index]! ** 2;
  }
  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function normalizeVector(vector: number[]) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value ** 2, 0));
  return magnitude === 0 ? vector : vector.map((value) => value / magnitude);
}
