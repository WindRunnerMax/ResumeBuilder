import type { RectNode, ResumeNode, TextNode } from "@cv/json";
import { useEditor } from "@cv/react";
import type { FC } from "react";
import React from "react";

/** 可插入的元素 */
const ITEMS: Array<{ type: "text" | "rect"; label: string; desc: string }> = [
  { type: "text", label: "文本", desc: "标题、段落、列表" },
  { type: "rect", label: "分割线", desc: "分隔区块" },
];

/**
 * 元素工具
 * - 点击后在页面内插入元素并选中
 */
export const Tools: FC = () => {
  const editor = useEditor();

  const insert = (type: "text" | "rect") => {
    const page = editor.model.getPage().data;
    if (page.type !== "page") return;
    const [top, right, , left] = page.padding;
    const width = page.width - left - right;
    const id = `${type}_${Date.now().toString(36)}`;
    const base = { id, parent: page.id, children: [] as string[], x: left, y: top + 240, width };

    const node: ResumeNode =
      type === "text"
        ? ({
            ...base,
            type: "text",
            height: 30,
            delta: [{ insert: "新文本" }],
            style: { family: "PingFang SC", size: 14, lineHeight: 1.6, color: "#1F2328" },
            autoHeight: true,
          } satisfies TextNode)
        : ({
            ...base,
            type: "rect",
            height: 1,
            fill: null,
            border: { width: 1, color: "#E4E6EB", l: false, r: false, t: false, b: true },
            radius: 0,
          } satisfies RectNode);

    const newId = editor.insertNode(node);
    newId && editor.selection.set([newId]);
  };

  return (
    <div className="cv-tools">
      {ITEMS.map(item => (
        <div key={item.type} className="cv-tool-item" onClick={() => insert(item.type)}>
          <span className="cv-tool-item__label">{item.label}</span>
          <span className="cv-tool-item__desc">{item.desc}</span>
        </div>
      ))}
    </div>
  );
};
