import * as path from "path";

import { RunResult } from "sqlite3";

import { IContinueServerClient } from "../../continueServer/interface.js";
import { FunctionIContinueServerClient } from "../../continueServer/functionInterface.js";
import { Chunk, FunctionChunk, IndexTag, IndexingProgressUpdate } from "../../index.js";
import { getBasename } from "../../util/index.js";
import { DatabaseConnection, SqliteDb, tagToString } from "../refreshIndex.js";
import {
  IndexResultType,
  MarkCompleteCallback,
  PathAndCacheKey,
  RefreshIndexResults,
  type CodebaseIndex,
} from "../types.js";

import { chunkDocument, shouldChunk } from "./functionChunk.js";

export class FunctionChunkIndex implements CodebaseIndex {
  relativeExpectedTime: number = 1;
  static artifactId = "functionChunks";
  artifactId: string = FunctionChunkIndex.artifactId;

  constructor(
    private readonly readFile: (filepath: string) => Promise<string>,
    private readonly pathSep: string,
    private readonly continueServerClient: FunctionIContinueServerClient,
    private readonly maxChunkSize: number,
  ) {}
  
  async *update(
    tag: IndexTag,
    results: RefreshIndexResults,
    markComplete: MarkCompleteCallback,
    repoName: string | undefined,
  ): AsyncGenerator<IndexingProgressUpdate, any, unknown> {
    const db = await SqliteDb.get();
    await this.createTables(db);
    const tagString = tagToString(tag);

    // Check the remote cache
    if (this.continueServerClient.connected) {
      try {
        const keys = results.compute.map(({ cacheKey }) => cacheKey);
        const resp = await this.continueServerClient.getFromIndexCache(
          keys,
          "chunks",
          repoName,
        );

        for (const [cacheKey, chunks] of Object.entries(resp.files)) {
          await this.insertChunks(db, tagString, chunks);
        }
        results.compute = results.compute.filter(
          (item) => !resp.files[item.cacheKey],
        );
      } catch (e) {
        console.error("Failed to fetch from remote cache: ", e);
      }
    }

    let accumulatedProgress = 0;

    if (results.compute.length > 0) {
      const filepath = results.compute[0].path;
      const folderName = path.basename(path.dirname(filepath));

      yield {
        desc: `Chunking files in ${folderName}`,
        status: "indexing",
        progress: accumulatedProgress,
      };
      const chunks = await this.computeChunks(results.compute);
      await this.insertChunks(db, tagString, chunks);
      await markComplete(results.compute, IndexResultType.Compute);
    }

    // Add tag
    function sleep(ms: number | undefined) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    for (const item of results.addTag) {
      await db.run(
        `
        INSERT INTO chunk_tags (chunkId, tag)
        SELECT id, ? FROM chunks
        WHERE cacheKey = ? AND path = ?
      `,
        [tagString, item.cacheKey, item.path],
      );
      await markComplete([item], IndexResultType.AddTag);
      accumulatedProgress += 1 / results.addTag.length;

      yield {
        progress: accumulatedProgress,
        desc: `Adding ${getBasename(item.path)}`,
        status: "indexing",
      };
    }
    await sleep(500);
      // Remove tag
      for (const item of results.removeTag) {
        await db.run(
          `
          DELETE FROM chunk_tags
          WHERE tag = ?
            AND chunkId IN (
              SELECT id FROM chunks
              WHERE cacheKey = ? AND path = ?
            )
        `,
          [tagString, item.cacheKey, item.path],
        );
        await markComplete([item], IndexResultType.RemoveTag);
        accumulatedProgress += 1 / results.removeTag.length / 4;
        yield {
          progress: accumulatedProgress,
          desc: `Removing ${getBasename(item.path)}`,
          status: "indexing",
        };
      }

      // Delete
      for (const item of results.del) {
        const chunkToDelete = await db.get(
          "SELECT id FROM chunks WHERE cacheKey = ?",
          [item.cacheKey],
        );

        if (chunkToDelete) {
          await db.run("DELETE FROM chunks WHERE id = ?", [chunkToDelete.id]);

          // Delete from chunk_tags
          await db.run("DELETE FROM chunk_tags WHERE chunkId = ?", [
            chunkToDelete.id,
          ]);
        } else {
          console.debug("Chunk to delete wasn't found in the table: ", item.path);
        }

        await markComplete([item], IndexResultType.Delete);
        accumulatedProgress += 1 / results.del.length / 4;
        yield {
          progress: accumulatedProgress,
          desc: `Removing ${getBasename(item.path)}`,
          status: "indexing",
        };
      }
  }

  private async createTables(db: DatabaseConnection) {
    await db.exec(`CREATE TABLE IF NOT EXISTS functionChunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cacheKey TEXT NOT NULL,
      path TEXT NOT NULL,
      idx INTEGER NOT NULL,
      startLine INTEGER NOT NULL,
      endLine INTEGER NOT NULL,
      content TEXT NOT NULL,
      function_name TEXT NOT NULL,
      function_context TEXT NOT NULL
    )`);

    await db.exec(`CREATE TABLE IF NOT EXISTS function_chunk_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag TEXT NOT NULL,
        chunkId INTEGER NOT NULL,
        FOREIGN KEY (chunkId) REFERENCES chunks (id)
    )`);
  }

  private async packToChunks(pack: PathAndCacheKey): Promise<FunctionChunk[]> {
    const contents = await this.readFile(pack.path);
    if (!shouldChunk(this.pathSep, pack.path, contents)) {
      return [];
    }
    const chunks: FunctionChunk[] = [];
    const chunkParams = {
      filepath: pack.path,
      contents,
      maxChunkSize: this.maxChunkSize,
      digest: pack.cacheKey,
    };
    for await (const c of chunkDocument(chunkParams)) {
      chunks.push(c);
    }
    return chunks;
  }

  private async computeChunks(paths: PathAndCacheKey[]): Promise<FunctionChunk[]> {
    const chunkLists = await Promise.all(
      paths.map((p) => this.packToChunks(p)),
    );
    return chunkLists.flat();
  }

  private async insertChunks(
    db: DatabaseConnection,
    tagString: string,
    chunks: FunctionChunk[],
  ) {
    await new Promise<void>((resolve, reject) => {
      db.db.serialize(() => {
        db.db.exec("BEGIN", (err: Error | null) => {
          if (err) {
            reject(new Error("error creating transaction", { cause: err }));
          }
        });
        const chunksSQL =
          "INSERT INTO functionChunks (cacheKey, path, idx, startLine, endLine, content, function_name, function_context) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        chunks.map((c) => {
          db.db.run(
            chunksSQL,
            [c.digest, c.filepath, c.index, c.startLine, c.endLine, c.content, c.function_name, c.function_context],
            (result: RunResult, err: Error) => {
              if (err) {
                reject(
                  new Error("error inserting into chunks table", {
                    cause: err,
                  }),
                );
              }
            },
          );
          const chunkTagsSQL =
            "INSERT INTO function_chunk_tags (chunkId, tag) VALUES (last_insert_rowid(), ?)";
          db.db.run(
            chunkTagsSQL,
            [tagString],
            (result: RunResult, err: Error) => {
              if (err) {
                reject(
                  new Error("error inserting into chunk_tags table", {
                    cause: err,
                  }),
                );
              }
            },
          );
        });
        db.db.exec("COMMIT", (err: Error | null) => {
          if (err) {
            reject(
              new Error("error while committing insert chunks transaction", {
                cause: err,
              }),
            );
          } else {
            resolve();
          }
        });
      });
    });
  }
}
