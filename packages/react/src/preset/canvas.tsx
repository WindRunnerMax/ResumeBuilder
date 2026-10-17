import type { FC } from "react";
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";

import { useEditor } from "../hooks/use-editor";
import { useEditorEvent } from "../hooks/use-editor-event";
import { ElementView } from "./element";

/** 画板尺寸，与 core 中 View 的常量保持一致 */
export const BOARD_SIZE = 5000;

/**
 * 画布视图
 * - 渲染 board / page / 元素 / overlay 四层结构
 * - board 固定 5000×5000，page 由 core 的 View 摆放在中间
 */
export const CanvasView: FC<{ className?: string }> = props => {
  const editor = useEditor();
  const stageRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(0);

  // 画布内链接统一在新页面打开，编辑态则阻止跳转以免打断输入
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      e.preventDefault();
      e.stopPropagation();
      const href = anchor.getAttribute("href");
      if (href && !editor.mode.isTextEdit()) window.open(href, "_blank", "noopener");
    };
    stage.addEventListener("click", onClick, true);
    return () => stage.removeEventListener("click", onClick, true);
  }, [editor]);

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
  useEditorEvent("CONTENT_CHANGE", () => setDirty(v => v + 1));

  const pageNode = editor.model.getPage().data;
  // 数据变了才重新计算，滚动与选中不会触发渲染
  // key 拼上文档代数：整文档替换（载入模板 / 导入）时强制重建，文本编辑器随之重建
  const docVersion = editor.docVersion;
  const elements = useMemo(
    () =>
      editor.model
        .getFlat()
        .filter(state => state.id !== pageNode.id)
        .map(state => <ElementView key={`#${docVersion}#${state.id}`} node={state.data} />),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, dirty, docVersion]
  );

  return (
    <div ref={stageRef} className={props.className} data-cv-board="true">
      <div
        ref={pageRef}
        data-page-id={pageNode.id}
        data-page-root="true"
        style={{ position: "absolute", overflow: "hidden" }}
      >
        {elements}
      </div>
      {/* overlay 挂在画板层，避免框选框被纸张 overflow 裁剪 */}
      <div ref={overlayRef} />
    </div>
  );
};
