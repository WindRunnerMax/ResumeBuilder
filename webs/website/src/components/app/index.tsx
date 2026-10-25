import { Editor, LOG_LEVEL } from "@re/core";
import { createDefaultDoc, JSONDocument } from "@re/json";
import { BASE_PLUGINS, CanvasView, EditorProvider, EditorView, registerBaseViews } from "@re/react";
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
 * - 顶栏 + 左侧面板 + 画布（右侧属性面板浮动在画布上）
 */
export const App: FC = () => {
  const editor = useMemo(() => {
    const doc = new JSONDocument(loadDocument() || createDefaultDoc());
    return new Editor({ doc, logLevel: LOG_LEVEL.INFO, plugins: BASE_PLUGINS });
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
      <div className="cv-editor">
        <Header />
        <div className="cv-editor__body">
          <LeftPanel />
          <div className="cv-canvas">
            <EditorView editor={editor} style={{ width: "100%", height: "100%" }}>
              <CanvasView />
            </EditorView>
            <RightPanel />
          </div>
        </div>
      </div>
    </EditorProvider>
  );
};
