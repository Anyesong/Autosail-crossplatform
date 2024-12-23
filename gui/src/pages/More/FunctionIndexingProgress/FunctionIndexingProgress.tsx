import { IndexingProgressUpdate } from "core";
import { useContext, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { IdeMessengerContext } from "../../../context/IdeMessenger";
import { isJetBrains } from "../../../util";
import { useWebviewListener } from "../../../hooks/useWebviewListener";
import IndexingProgressBar from "./IndexingProgressBar";
import IndexingProgressIndicator from "./IndexingProgressIndicator";
import IndexingProgressTitleText from "./IndexingProgressTitleText";
import IndexingProgressSubtext from "./IndexingProgressSubtext";
import { usePostHog } from "posthog-js/react";
import ConfirmationDialog from "../../../components/dialogs/ConfirmationDialog";
import {
  setShowDialog,
  setDialogMessage,
} from "../../../redux/slices/uiStateSlice";
import IndexingProgressErrorText from "./IndexingProgressErrorText";

export function getProgressPercentage(
  progress: IndexingProgressUpdate["progress"],
) {
  return Math.min(100, Math.max(0, progress * 100));
}

function FunctionIndexingProgress() {
  const ideMessenger = useContext(IdeMessengerContext);
  const posthog = usePostHog();
  const dispatch = useDispatch();
  const [paused, setPaused] = useState<boolean | undefined>(undefined);
  const [update, setUpdate] = useState<IndexingProgressUpdate>({
    desc: "Loading indexing config",
    progress: 0.0,
    status: "loading",
  });

  // If sidebar is opened after extension initializes, retrieve saved states.
  let initialized = false;

  useWebviewListener("indexProgress", async (data) => {
    setUpdate(data);
  });

  useEffect(() => {
    if (!initialized) {
      // Triggers retrieval for possible non-default states set prior to IndexingProgressBar initialization
      ideMessenger.post("index/indexingProgressBarInitialized", undefined);
      initialized = true;
    }
  }, []);

  useEffect(() => {
    if (paused === undefined) return;
    ideMessenger.post("index/setPaused", paused);
  }, [paused]);

  function onClickRetry() {
    // For now, we don't show in JetBrains since the re-index command
    // is not yet implemented
    if (update.shouldClearIndexes && !isJetBrains()) {
      dispatch(setShowDialog(true));
      dispatch(
        setDialogMessage(
          <ConfirmationDialog
            title="Rebuild codebase index"
            confirmText="Rebuild"
            text={
              "Your index appears corrupted. We recommend clearing and rebuilding it, " +
              "which may take time for large codebases.\n\n" +
              "For a faster rebuild without clearing data, press 'Shift + Command + P' to open " +
              "the Command Palette, and type out 'Continue: Force Codebase Re-Indexing'"
            }
            onConfirm={() => {
              posthog.capture("rebuild_index_clicked");
              ideMessenger.post("index/forceReIndex", {
                shouldClearIndexes: true,
              });
            }}
          />,
        ),
      );
    } else {
      ideMessenger.post("index/forceReIndex", undefined);
    }
  }

  function onClick() {
    switch (update.status) {
      case "failed":
        onClickRetry();
        break;
      case "indexing":
      case "loading":
      case "paused":
        if (update.progress < 1 && update.progress >= 0) {
          setPaused((prev) => !prev);
        } else {
          ideMessenger.post("index/forceReIndex", undefined);
        }
        break;
      case "disabled":
        ideMessenger.post("config/openProfile", {
          profileId: undefined,
        });
        break;
      case "done":
        ideMessenger.post("index/forceReIndex", undefined);
      default:
        break;
    }
  }

  // 点击事件处理函数
  function handleClearClick() {
    ideMessenger.post("index/clearFunction", undefined);
  }

  function handleBuildClick() {
    ideMessenger.post("index/buildFunction", undefined);
  }

//   return (
//     <div className="flex items-center justify-center h-screen">
//       <button
//         onClick={handleClearClick}
//         className="px-4 py-2 bg-red-500 text-white font-semibold rounded hover:bg-red-600"
//       >
//         Clear
//       </button>
//     </div>
//   );
// }




return (
  <div className="mt-6 flex flex-col">
    <div className="mb-0 flex justify-between text-sm">
        <IndexingProgressTitleText update={update} />
        {update.status !== "loading" && (
          <IndexingProgressIndicator update={update} />
        )}
      </div>
    <IndexingProgressBar update={update} />
  
    <IndexingProgressSubtext
      update={update}
      onClick={handleBuildClick}
      title="click to build"
    />
    <div style={{ height: "2rem" }}></div>
    <IndexingProgressSubtext
      update={update}
      onClick={handleClearClick}
      title="click to clear"
    />
  </div>
);
}
//   return (
//     <div className="mt-6 flex flex-col">
//       <div className="mb-0 flex justify-between text-sm">
//         <IndexingProgressTitleText update={update} />
//         {update.status !== "loading" && (
//           <IndexingProgressIndicator update={update} />
//         )}
//       </div>

//       <IndexingProgressBar update={update} />

//       <IndexingProgressSubtext update={update} onClick={onClick} />

//       {update.status === "failed" && (
//         <div className="mt-4">
//           <IndexingProgressErrorText update={update} />
//         </div>
//       )}
//     </div>
//   );
// }

export default FunctionIndexingProgress;
