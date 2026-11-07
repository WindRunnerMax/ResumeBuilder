import { Editor, LOG_LEVEL } from "@re/core";
import type { ResumeDoc } from "@re/json";
import { createDefaultDoc, JSONDocument } from "@re/json";
import { act, render } from "@testing-library/react";
import React from "react";

import { registerBaseViews } from "../src/plugin/element/views";
import { getTextEditor } from "../src/plugin/text/editor";
import { CanvasView } from "../src/preset/canvas";
import { EditorProvider } from "../src/preset/editor";

registerBaseViews();

/** 构造只含一个文本节点的文档 */
const createTextDoc = (id: string, content: string): ResumeDoc => {
  const doc = createDefaultDoc();
  doc.nodes[id] = {
    id,
    type: "text",
    parent: doc.root,
    children: [],
    x: 0,
    y: 0,
    width: 300,
    height: 100,
    delta: [{ insert: content }],
    style: { family: "sans-serif", size: 14, lineHeight: 1.5, color: "#000" },
  } as never;
  doc.nodes[doc.root].children = [id];
  return doc;
};

/** 渲染画布并返回渲染结果 */
const setup = (doc: ResumeDoc) => {
  const document = new JSONDocument(doc);
  const editor = new Editor({ doc: document, logLevel: LOG_LEVEL.ERROR });
  const tree = (
    <EditorProvider editor={editor}>
      <CanvasView />
    </EditorProvider>
  );
  const result = render(tree);
  return { editor, rerender: () => result.rerender(tree), container: result.container };
};

/** 读取元素当前 DOM 文本 */
const readText = (container: HTMLElement, id: string): string => {
  return container.querySelector(`[data-element-id="${id}"]`)?.textContent || "";
};

describe("load document", () => {
  it("should replace text content when importing with the same id", async () => {
    const { editor, rerender, container } = setup(createTextDoc("text", "OLD"));
    await act(async () => {});
    expect(readText(container, "text")).toBe("OLD");

    await act(async () => {
      editor.loadDocument(createTextDoc("text", "NEW"));
    });
    rerender();
    await act(async () => {});

    // 同一 id 的文本块必须重建并渲染新内容，而不是沿用旧的非受控编辑器
    expect(readText(container, "text")).toBe("NEW");
    const block = getTextEditor("text") as unknown as { state: { block: { toDelta: () => unknown } } };
    expect(JSON.stringify(block.state.block.toDelta())).toContain("NEW");
  });
});
