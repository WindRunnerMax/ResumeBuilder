import { Editor, LOG_LEVEL } from "@cv/core";
import type { ResumeDoc } from "@cv/json";
import { JSONDocument } from "@cv/json";
import { BasePlugins, registerBaseViews } from "@cv/plugin";
import { CanvasView, EditorProvider } from "@cv/react";
import type { FC } from "react";
import React, { useLayoutEffect, useMemo, useRef } from "react";

registerBaseViews();

/**
 * 只读预览视图
 * - 用于导出页，不响应任何交互
 * - 页面尺寸即 A4，不做缩放与滚动
 */
export const PreviewView: FC<{ doc: ResumeDoc }> = props => {
  const ref = useRef<HTMLDivElement>(null);
  const editor = useMemo(
    () =>
      new Editor({
        doc: new JSONDocument(props.doc),
        readonly: true,
        logLevel: LOG_LEVEL.ERROR,
        plugins: BasePlugins,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.doc]
  );

  useLayoutEffect(() => {
    const el = ref.current;
    el && editor.mount(el);
    return () => {
      editor.unmount();
      editor.destroy();
    };
  }, [editor]);

  return (
    <EditorProvider editor={editor}>
      <div className="cv-preview">
        <div ref={ref} className="cv-preview-stage">
          <CanvasView />
        </div>
      </div>
    </EditorProvider>
  );
};
