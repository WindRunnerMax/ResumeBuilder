import type { ImageNode, RectNode, TextNode } from "@cv/json";
import type { ElementViewProps } from "@cv/react";
import { registerElementView } from "@cv/react";
import type { FC } from "react";
import React from "react";

/** 页面视图，页面由画布自己渲染 */
const PageView: FC<ElementViewProps> = () => null;

/** 矩形视图，填充与描边由 RectPlugin 注入 */
const RectView: FC<ElementViewProps> = () => <div style={{ width: "100%", height: "100%" }} />;

/** 图片视图 */
const ImageView: FC<ElementViewProps> = props => {
  const node = props.node as ImageNode;
  return (
    <img
      src={node.src}
      alt=""
      draggable={false}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        objectFit: node.mode,
        borderRadius: node.radius || 0,
        boxSizing: "border-box",
      }}
    />
  );
};

/** 文本视图占位，M3 将替换为 BlockKit 内联编辑器 */
const TextView: FC<ElementViewProps> = props => {
  const node = props.node as TextNode;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        fontFamily: node.style.family,
        fontSize: node.style.size,
        fontWeight: node.style.weight,
        lineHeight: node.style.lineHeight,
        color: node.style.color,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {node.delta
        .map(op => (typeof op.insert === "string" ? op.insert : ""))
        .join("")}
    </div>
  );
};

/** 注册内置元素视图，需在编辑器渲染前调用 */
export const registerBaseViews = (): void => {
  registerElementView("page", PageView);
  registerElementView("rect", RectView);
  registerElementView("image", ImageView);
  registerElementView("text", TextView);
};
