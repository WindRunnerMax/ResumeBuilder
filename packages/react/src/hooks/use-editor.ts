import type { Editor } from "@cv/core";
import React, { createContext } from "react";

/** 编辑器上下文 */
export const EditorContext = createContext<Editor | null>(null);
EditorContext.displayName = "CVEditor";

/** 获取编辑器实例 */
export const useEditor = (): Editor => {
  const editor = React.useContext(EditorContext);
  if (!editor) {
    throw new Error("useEditor must be used within <EditorContext.Provider>");
  }
  return editor;
};
