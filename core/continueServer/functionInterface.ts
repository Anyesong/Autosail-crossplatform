import { Chunk, FunctionChunk } from "../index.js";

export interface EmbeddingsCacheChunk {
  vector: number[];
  startLine: number;
  endLine: number;
  contents: string;
}

interface FunctionArtifactReturnTypes {
  chunks: FunctionChunk[];
  embeddings: EmbeddingsCacheChunk[];
}

export type FunctionArtifactType = keyof FunctionArtifactReturnTypes;

export interface EmbeddingsCacheResponse<T extends FunctionArtifactType> {
  files: { [cacheKey: string]: FunctionArtifactReturnTypes[T] };
}

export interface IContinueServerClient {
  connected: boolean;
  url: URL | undefined;
  getUserToken(): string | undefined;
  getConfig(): Promise<{ configJson: string; configJs: string }>;
  getFromIndexCache<T extends FunctionArtifactType>(
    keys: string[],
    artifactId: T,
    repoName: string | undefined,
  ): Promise<EmbeddingsCacheResponse<T>>;
}

export interface FunctionIContinueServerClient {
    connected: boolean;
    url: URL | undefined;
    getUserToken(): string | undefined;
    getConfig(): Promise<{ configJson: string; configJs: string }>;
    getFromIndexCache<T extends FunctionArtifactType>(
      keys: string[],
      artifactId: T,
      repoName: string | undefined,
    ): Promise<EmbeddingsCacheResponse<T>>;
  }
  
