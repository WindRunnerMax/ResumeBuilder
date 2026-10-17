import type { RectNode, ResumeNode, TextNode } from "@cv/json";
import { useEditor } from "@cv/react";
import type { FC } from "react";
import React from "react";

import { PANEL_WIDTH } from "../../styles/constant";

/** 可插入的元素类型 */
const ITEMS: Array<{ type: "text" | "rect"; label: string; desc: string }> = [
  { type: "text", label: "文本", desc: "标题、段落、列表" },
  { type: "rect", label: "分割线", desc: "分隔区块" },
];

/**
 * 左侧面板
 * - 列出可插入的元素，点击后在页面内插入
 */
export const LeftPanel: FC = () => {
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
            height: 60,
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
    <div
      style={{
        width: PANEL_WIDTH,
        flexShrink: 0,
        background: "#FFFFFF",
        borderRight: "1px solid #E4E6EB",
        padding: 12,
        overflow: "auto",
      }}
    >
      <div style={{ fontSize: 12, color: "#8A8F99", margin: "4px 4px 12px" }}>添加元素</div>
      {ITEMS.map(item => (
        <div
          key={item.type}
          onClick={() => insert(item.type)}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "10px 12px",
            marginBottom: 8,
            border: "1px solid #E4E6EB",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>
          <span style={{ fontSize: 12, color: "#8A8F99" }}>{item.desc}</span>
        </div>
      ))}
    </div>
  );
};
