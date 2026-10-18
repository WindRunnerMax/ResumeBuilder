import type { EditorMode } from "@re/core";
import { useEditor } from "./use-editor";
import { useEventValue } from "./use-event-value";

/** 模式状态 */
export type ModeInfo = {
  /** 当前模式 */
  mode: EditorMode;
  /** 文本编辑态下的节点 id */
  editingId: string | null;
};

/**
 * 订阅交互模式
 */
export const useMode = (): ModeInfo => {
  const editor = useEditor();
  return useEventValue(
    "MODE_CHANGE",
    () => ({ mode: editor.mode.mode, editingId: editor.mode.editingId }),
    [editor]
  );
};
