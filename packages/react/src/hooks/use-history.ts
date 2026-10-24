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
 * - 主栈是唯一时间线，文本块的栈结构变化已同步成条目，直接读主栈即可
 */
export const useHistory = (): HistoryInfo => {
  const editor = useEditor();
  return useEventValue(
    "HISTORY_CHANGE",
    () => ({
      canUndo: editor.history.canUndo(),
      canRedo: editor.history.canRedo(),
    }),
    [editor]
  );
};
