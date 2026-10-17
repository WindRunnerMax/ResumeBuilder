import type { Editor } from "@cv/core";
import type { FC, ReactNode } from "react";
import React, { useLayoutEffect, useRef } from "react";

import { EditorContext } from "../hooks/use-editor";

/** 编辑器根视图属性 */
export type EditorViewProps = {
  editor: Editor;
  /** 是否自动销毁编辑器，默认为 true */
  destroyOnUnmount?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
};

/**
 * 编辑器根视图
 * - 只负责把 viewport 的 ref 交给 core，不参与任何计算
 */
export const EditorView: FC<EditorViewProps> = props => {
  const { editor, destroyOnUnmount = true, className, style, children } = props;
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    el && editor.mount(el);
    return () => {
      editor.unmount();
      destroyOnUnmount && editor.destroy();
    };
  }, [editor, destroyOnUnmount]);

  return (
    <div
      ref={ref}
      className={className ? `cv-viewport ${className}` : "cv-viewport"}
      style={{
        position: "relative",
        overflow: "auto",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** 编辑器上下文提供者，用于在视图外层共享实例 */
export const EditorProvider: FC<{ editor: Editor; children?: ReactNode }> = props => {
  return <EditorContext.Provider value={props.editor}>{props.children}</EditorContext.Provider>;
};
