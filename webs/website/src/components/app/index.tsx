import { createDefaultDoc, JSONDocument } from "@cv/json";
import { Editor, LOG_LEVEL } from "@cv/core";
import { BasePlugins, registerBaseViews } from "@cv/plugin";
import { CanvasView, EditorProvider, EditorView } from "@cv/react";
import type { FC } from "react";
import React, { useMemo } from "react";

import { HistoryBar } from "../history-bar";
import { Toolbar } from "../toolbar";

// 注册内置元素视图，需在渲染前完成
registerBaseViews();

/**
 * 应用根组件
 * - 创建编辑器实例并挂载画布
 */
export const App: FC = () => {
  const editor = useMemo(() => {
    const doc = new JSONDocument(createDefaultDoc());
    return new Editor({ doc, logLevel: LOG_LEVEL.INFO, plugins: BasePlugins });
  }, []);

  return (
    <EditorProvider editor={editor}>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#F5F6F7" }}>
        <Toolbar />
        <HistoryBar />
        <EditorView editor={editor} style={{ flex: 1, background: "#F5F6F7" }}>
          <CanvasView />
        </EditorView>
      </div>
    </EditorProvider>
  );
};
