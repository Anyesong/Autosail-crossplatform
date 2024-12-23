import { IndexingProgressUpdate } from "core";

export interface IndexingProgressSubtextProps {
  update: IndexingProgressUpdate;
  onClick: () => void;
  title: String;
}

const STATUS_TO_SUBTITLE_TEXT: Record<
  IndexingProgressUpdate["status"],
  string | undefined
> = {
  done: "Click to re-index",
  loading: "",
  indexing: "Click to pause",
  paused: "Click to resume",
  failed: "Click to retry",
  disabled: "Click to open config.json and enable indexing (requires reload)",
};

function ClearIndexingProgressSubtext({
  update,
  onClick,
  title,
}: IndexingProgressSubtextProps) {
  // const showIndexingDesc = update.status === "indexing";

  return (
    <div className="flex justify-between">
      <span
        className={`cursor-pointer text-xs text-stone-500 underline`}
        onClick={onClick}
      >
        {title}
      </span>

     
    </div>
  );
}

export default ClearIndexingProgressSubtext;
