import { FunctionIndexingProgressUpdate } from "core";
import { AnimatedEllipsis } from "../../../components";

export interface IndexingProgressTitleTextProps {
  update: FunctionIndexingProgressUpdate;
}

const STATUS_TO_TEXT: Record<FunctionIndexingProgressUpdate["status"], string> = {
  done: "Indexing complete",
  loading: "Initializing",
  indexing: "Indexing in-progress",
  paused: "Indexing paused",
  failed: "Indexing failed",
  disabled: "Indexing disabled",
};

function IndexingProgressTitleText({ update }: IndexingProgressTitleTextProps) {
  const showEllipsis = update.status === "loading";

  return (
    <span>
      {STATUS_TO_TEXT[update.status]}
      {showEllipsis && <AnimatedEllipsis />}
    </span>
  );
}

export default IndexingProgressTitleText;
