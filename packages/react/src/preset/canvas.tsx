import type { FC } from "react";
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";

import { useEditor } from "../hooks/use-editor";
import { useEditorEvent } from "../hooks/use-editor-event";
import { ElementView } from "./element";

/** 页面四周留白，与 core 中 View 的常量保持一致 */
export const STAGE_GAP = 120;

/**
 * 画布视图
 * - 渲染 stage / page / 元素 / overlay 四层结构
 * - 尺寸与居中由 core 的 View 计算，这里只提供容器
 */
export const CanvasView: FC<{ className?: string }> = props => {
  const editor = useEditor();
  const stageRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [version, setVersion] = useState(0);

  useLayoutEffect(() => {
    editor.view.setStage(stageRef.current);
    editor.view.setPage(pageRef.current);
    overlayRef.current && editor.mountOverlay(overlayRef.current);
    // 页面节点同样交给插件写入样式
    editor.renderer.patchPage();
    return () => {
      editor.view.setStage(null);
      editor.view.setPage(null);
    };
  }, [editor]);

  // 内容变更后刷新元素列表
  useEditorEvent("CONTENT_CHANGE", () => setVersion(v => v + 1));
  // 视口尺寸变化后重新布局纸张居中
  useEditorEvent("RESIZE", () => editor.view.layout());

  const pageNode = editor.model.getPage().data;

  const children = useMemo(() => {
    const rootId = editor.document.get().root;
    return editor.model
      .getFlat()
      .filter(state => state.id !== rootId)
      .map(state => <ElementView key={state.id} node={state.data} />);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, version]);

  return (
    <div ref={stageRef} className={props.className} style={{ position: "relative" }}>
      <div
        ref={pageRef}
        data-page-id={pageNode.id}
        data-page-root="true"
        style={{ position: "absolute", overflow: "hidden" }}
      >
        {children}
        <div ref={overlayRef} />
      </div>
    </div>
  );
};
