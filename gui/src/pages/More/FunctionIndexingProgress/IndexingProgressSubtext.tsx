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

function IndexingProgressSubtext({
  update,
  onClick,
  title,
}: IndexingProgressSubtextProps) {
  const showIndexingDesc = update.status === "indexing";

  return (
    <div className="flex justify-between">
      <span
        className={`cursor-pointer text-xs text-stone-500 underline ${
          showIndexingDesc ? "w-1/3" : "w-full"
        }`}
        onClick={onClick}
      >
        {title}
      </span>

      {showIndexingDesc && (
        <span className="w-2/3 truncate text-right text-xs text-stone-500">
          {update.desc}
        </span>
      )}
    </div>
  );
}

export default IndexingProgressSubtext;
