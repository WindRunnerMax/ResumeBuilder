import type { Op as DeltaOp } from "@block-kit/delta";
import { Delta } from "@block-kit/delta";
import type { ContentChangeEvent, Editor as BlockEditor } from "@block-kit/core";
import { EDITOR_EVENT } from "@block-kit/core";
import { FloatToolbar, ToolBarMixin } from "@block-kit/plugin";
import { BlockKit, Editable, useEditorStatic } from "@block-kit/react";
import type { TextNode } from "@cv/json";
import type { ElementViewProps } from "../../../index";
import { registerElementView, useEditor, useMode } from "../../../index";
import type { FC } from "react";
import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";

import { TEXT_CLASS } from "../../text/const";
import { createTextEditor, destroyTextEditor } from "../../text/editor";
import { TextModule } from "../../text/module";

/**
 * 文本块视图
 * - 每块持有一个 BlockKit 编辑器，内容即 TextNode.delta
 * - 图形模式下只读，只有 TEXT_EDIT 模式可编辑
 */
const TextBlockView: FC<ElementViewProps> = props => {
  const { node } = props;
  const text = node as TextNode;
  const canvas = useEditor();
  const { mode, editingId } = useMode();
  const editing = mode === "TEXT_EDIT" && editingId === text.id;
  const ref = useRef<HTMLDivElement>(null);

  const blockEditor = useMemo<BlockEditor>(
    () => createTextEditor(text.id, text.delta),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text.id]
  );

  // 注册独立撤销栈模块
  useLayoutEffect(() => {
    const module = new TextModule(text.id);
    module.setElement(ref.current);
    canvas.module.register(module);
    return () => {
      canvas.module.unregister("text");
      destroyTextEditor(text.id);
    };
  }, [canvas, text.id]);

  // 文本编辑结果写回数据，内容去重由 core 的 submitDelta 统一处理
  useEffect(() => {
    const listener = () => {
      const ops = blockEditor.state.block.toDelta().ops as DeltaOp[];
      canvas.submitDelta(text.id, ops, false);
    };
    blockEditor.event.on(EDITOR_EVENT.CONTENT_CHANGE, listener);
    return () => blockEditor.event.off(EDITOR_EVENT.CONTENT_CHANGE, listener);
  }, [blockEditor, canvas, text.id]);

  // 编辑器完全非受控：挂载时用节点数据初始化，之后单向写回数据
  // 外部整文档替换通过 CanvasView 的文档代数 key 触发 remount 重建

  // 进入编辑态时聚焦到末尾
  useEffect(() => {
    if (!editing) return;
    const timer = setTimeout(() => {
      const el = blockEditor.getContainer();
      el.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [blockEditor, editing]);

  const style: React.CSSProperties = {
    width: "100%",
    height: "100%",
    fontFamily: text.style.family,
    fontSize: text.style.size,
    lineHeight: text.style.lineHeight,
    color: text.style.color,
    textAlign: text.style.align || "left",
    // 裁掉超出节点高度的内容
    overflow: "hidden",
    cursor: editing ? "text" : undefined,
  };

  return (
    <div ref={ref} className={TEXT_CLASS} style={style}>
      <BlockKit editor={blockEditor} readonly={!editing}>
        <Editable placeholder="请输入内容" preventDestroy />
        {editing && <TextToolbar />}
      </BlockKit>
    </div>
  );
};

/**
 * 编辑态浮动工具栏
 * - 需渲染在 `BlockKit` 内部以获取编辑器 Context
 * - 选中文字后显示在选区上方，只保留简历场景常用的几项
 */
const TextToolbar: FC = () => {
  const { editor } = useEditorStatic();

  /** 跟随选区定位，超出右边界时回退 */
  const overridePosition = () => {
    const rect = editor.rect.getRawSelectionRect();
    if (!rect) return { top: -999999, left: -999999 };
    let left = rect.left + rect.width / 2;
    if (left + 220 > window.innerWidth) left = window.innerWidth - 220;
    return { top: rect.top - 8, left };
  };

  return (
    <FloatToolbar mountDOM={document.body} overridePosition={overridePosition}>
      <ToolBarMixin.Bold />
      <ToolBarMixin.Italic />
      <ToolBarMixin.Underline />
      <ToolBarMixin.Strike />
      <ToolBarMixin.Link />
      <ToolBarMixin.FontSize />
      <ToolBarMixin.FontColor />
      <ToolBarMixin.LineHeight />
    </FloatToolbar>
  );
};

/** 注册文本块视图 */
export const registerTextBlock = (): void => {
  registerElementView("text", TextBlockView);
};
