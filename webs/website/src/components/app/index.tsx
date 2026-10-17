import { Editor, LOG_LEVEL } from "@cv/core";
import { createExampleDoc, JSONDocument } from "@cv/json";
import { BasePlugins, registerBaseViews } from "@cv/plugin";
import { CanvasView, EditorProvider, EditorView } from "@cv/react";
import type { FC } from "react";
import React, { useEffect, useMemo } from "react";

import { Header } from "../header";
import { LeftPanel } from "../left-panel";
import { RightPanel } from "../right-panel";
import { loadDocument, saveDocument } from "../../utils/storage";

// 注册内置元素视图，需在渲染前完成
registerBaseViews();

/**
 * 应用根组件
 * - 顶栏 + 左面板 + 画布 + 右面板
 * - 高度固定为视口高度，外层不产生滚动条
 */
export const App: FC = () => {
  const editor = useMemo(() => {
    const doc = new JSONDocument(loadDocument() || createExampleDoc());
    return new Editor({ doc, logLevel: LOG_LEVEL.INFO, plugins: BasePlugins });
  }, []);

  // 内容变更后持久化，供预览 / 导出页读取
  useEffect(() => {
    saveDocument(editor.document.toJSON());
    const onContentChange = () => saveDocument(editor.document.toJSON());
    editor.event.on("CONTENT_CHANGE", onContentChange);
    return () => editor.event.off("CONTENT_CHANGE", onContentChange);
  }, [editor]);

  return (
    <EditorProvider editor={editor}>
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "#F5F6F7",
        }}
      >
        <Header />
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <LeftPanel />
          <EditorView editor={editor} style={{ flex: 1, minWidth: 0, background: "#F5F6F7" }}>
            <CanvasView />
          </EditorView>
          <RightPanel />
        </div>
      </div>
    </EditorProvider>
  );
};
