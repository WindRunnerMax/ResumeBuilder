import { EDITOR_MODE } from "@cv/core";
import type { FC } from "react";
import React, { useLayoutEffect, useRef } from "react";

import { useEditor } from "../hooks/use-editor";
import { useMode } from "../hooks/use-mode";
import type { ElementViewProps } from "./registry";
import { getElementView } from "./registry";

/**
 * 单个元素视图
 * - 负责把 DOM 注册给 core，位置与尺寸由 core 写入
 */
export const ElementView: FC<ElementViewProps> = props => {
  const { node, children } = props;
  const editor = useEditor();
  const { mode, editingId } = useMode();
  const ref = useRef<HTMLDivElement>(null);
  const editing = mode === EDITOR_MODE.TEXT_EDIT && editingId === node.id;
  const View = getElementView(node.type);

  useLayoutEffect(() => {
    const state = editor.model.get(node.id);
    state && editor.renderer.register(state, ref.current);
    return () => {
      const current = editor.model.get(node.id);
      current && editor.renderer.register(current, null);
    };
  }, [editor, node.id]);

  return (
    <div
      ref={ref}
      data-element-id={node.id}
      data-type={node.type}
      data-editing={editing ? "true" : undefined}
      style={{ position: "absolute", left: 0, top: 0, boxSizing: "border-box" }}
    >
      {View ? <View node={node}>{children}</View> : children}
    </div>
  );
};
