import type { CommandPayload } from "@re/core";
import { useCallback } from "react";

import { useEditor } from "./use-editor";

/**
 * 获取命令执行方法
 */
export const useCommand = () => {
  const editor = useEditor();
  const execute = useCallback((command: CommandPayload) => editor.command.execute(command), [editor]);
  const undo = useCallback(() => editor.undo(), [editor]);
  const redo = useCallback(() => editor.redo(), [editor]);
  return { execute, undo, redo };
};
