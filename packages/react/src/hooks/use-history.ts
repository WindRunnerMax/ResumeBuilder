import { ELEMENT_KEY, TEXT_KEY } from "@re/core";
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
 * 读取当前聚焦文本块的内部栈状态
 * - 文本块逐字撤销发生在 BlockKit 自己的栈里，主栈看不到
 * - 焦点不在文本块时返回 null，状态以主栈为准
 */
const readTextState = (editor: ReturnType<typeof useEditor>): HistoryInfo | null => {
  const active = document.activeElement;
  const block = active?.closest<HTMLElement>(`.${TEXT_KEY}`);
  if (!block) return null;
  const id = block.closest<HTMLElement>(`[${ELEMENT_KEY}]`)?.getAttribute(ELEMENT_KEY);
  const module = editor.module.getList("text").find(item => item.id === id);
  if (!module) return null;
  return { canUndo: module.canUndo(), canRedo: module.canRedo() };
};

/**
 * 订阅历史栈状态
 * - 主栈与文本块内部栈任一可撤销即可撤销，保证按钮与实际可用操作一致
 */
export const useHistory = (): HistoryInfo => {
  const editor = useEditor();
  return useEventValue(
    "HISTORY_CHANGE",
    () => {
      const text = readTextState(editor);
      return {
        canUndo: text ? text.canUndo : editor.history.canUndo(),
        canRedo: text ? text.canRedo : editor.history.canRedo(),
      };
    },
    [editor]
  );
};
