import { codeChunkerForFunctionSearch } from "../../indexing/chunk/functionCode.js";
import { Telemetry } from "../../util/posthog.js";
import { extractMinimalStackTraceInfo } from "../../util/extractMinimalStackTraceInfo.js";
import { supportedLanguages } from "../../util/treeSitter.js";
import { FunctionChunk, RangeInFile } from "../../index.js";
import { DatabaseConnection, SqliteDb, tagToString } from "../../indexing/refreshIndex";
import type { ContextItemId, IDE, IndexingProgressUpdate } from "../../";
export async function functionSearch(contents: string, selectedCode: RangeInFile[]): Promise<string> {

    
    let filepath = selectedCode.at(-1)?.filepath;
    const chunkList: FunctionChunk[] = [];
    try {
        if (filepath) {
            filepath = filepath.split("(")[0].trim();
            // extract function name from given code
            const segs = filepath.split(".");
            const ext = segs[segs.length - 1];
            if (ext in supportedLanguages) {
                try {
                    for await (const chunk of codeChunkerForFunctionSearch(filepath, contents, 256)) {
                        chunkList.push(chunk);
                    }
                } catch (e: any) {
                    Telemetry.capture("query_code_chunker_error", {
                    fileExtension: ext,
                    stack: extractMinimalStackTraceInfo(e.stack),
                    });
                    // falls back to basicChunker
                }
            } else {
                return contents;
            }

            // search function name in database
            const codeList: String[] = [];
            const db = await SqliteDb.get();
            for (const chunk of chunkList) {
                try {
                    const rows = await db.all(
                        "SELECT function_context FROM functionChunks WHERE function_name = ?",
                        [chunk.function_name]
                    );

                    // 将查询结果中的每一行的 function_context 推入 codeList
                    for (const row of rows) {
                        if (row.function_context) {
                            codeList.push(row.function_context);
                        }
                    }
                } catch (e: any) {
                    Telemetry.capture("query_database_error", {
                        chunk: chunk.function_name,
                        stack: extractMinimalStackTraceInfo(e.stack),
                    });
                }
            }


            const result = [
                {
                    user: "main_code",
                    content: contents,
                },
                ...codeList.map((content, index) => ({
                    user: "relevant_code",
                    content: content,
                })),
                {
                    user: "language",
                    content: ext
                }
            ];

            // 将数据结构转换为字符串
            return JSON.stringify(result, null, 2);
        }      
    } catch(error) {
        console.error("Error in functionSearch inner process:", error);
        return contents;
    } 
    return contents;
  } 