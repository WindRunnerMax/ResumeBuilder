import { useEditor } from "./use-editor";
import { useEventValue } from "./use-event-value";

/** 历史状态 */
export type HistoryInfo = {
  /** 是否可撤销 */
  canUndo: boolean;
  /** 是否可重做 */
  canRedo: boolean;
};

/**
 * 订阅历史栈状态
 */
export const useHistory = (): HistoryInfo => {
  const editor = useEditor();
  return useEventValue(
    "HISTORY_CHANGE",
    () => ({ canUndo: editor.history.canUndo(), canRedo: editor.history.canRedo() }),
    [editor]
  );
};
