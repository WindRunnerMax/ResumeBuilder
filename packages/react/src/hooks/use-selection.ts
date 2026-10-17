import type { Rect } from "@cv/utils";
import { useEditor } from "./use-editor";
import { useEventValue } from "./use-event-value";

/** 选中状态 */
export type SelectionInfo = {
  /** 选中的 id */
  ids: string[];
  /** 包围盒 */
  bounds: Rect | null;
};

/**
 * 订阅选中变化
 */
export const useSelection = (): SelectionInfo => {
  const editor = useEditor();
  return useEventValue(
    "SELECTION_CHANGE",
    () => ({ ids: editor.selection.list, bounds: editor.selection.getBounds() }),
    [editor]
  );
};
