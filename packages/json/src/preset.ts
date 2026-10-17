import { getUniqueId, mmToPx, PAPER_SIZE } from "@cv/utils";

import type { PageNode, RectNode, ResumeDoc, TextNode } from "./types";

/** 当前数据版本 */
export const DOC_VERSION = 1;

/** 默认页面边距（px），约 25.4mm */
export const DEFAULT_PADDING = mmToPx(25.4);

/** A4 纸张像素尺寸 */
export const A4_SIZE = {
  width: mmToPx(PAPER_SIZE.A4.width),
  height: mmToPx(PAPER_SIZE.A4.height),
};

/**
 * 创建页面节点
 * @param id
 */
export const createPage = (id: string = getUniqueId()): PageNode => ({
  id,
  type: "page",
  parent: null,
  children: [],
  x: 0,
  y: 0,
  width: A4_SIZE.width,
  height: A4_SIZE.height,
  size: "A4",
  padding: [DEFAULT_PADDING, DEFAULT_PADDING, DEFAULT_PADDING, DEFAULT_PADDING],
  background: "#FFFFFF",
});

/**
 * 创建文本节点
 * @param options
 */
export const createText = (options: Partial<TextNode> = {}): TextNode => {
  const id = options.id || getUniqueId();
  return {
    id,
    type: "text",
    parent: null,
    children: [],
    x: 0,
    y: 0,
    width: 200,
    height: 30,
    delta: [{ insert: "请输入内容" }],
    style: { family: "PingFang SC", size: 14, lineHeight: 1.5, color: "#1F2328" },
    autoHeight: true,
    ...options,
  };
};

/**
 * 创建矩形节点
 * @param options
 */
export const createRect = (options: Partial<RectNode> = {}): RectNode => {
  const id = options.id || getUniqueId();
  return {
    id,
    type: "rect",
    parent: null,
    children: [],
    x: 0,
    y: 0,
    width: 100,
    height: 1,
    fill: null,
    border: { width: 1, color: "#E4E6EB", l: false, r: false, t: false, b: true },
    radius: 0,
    ...options,
  };
};

/**
 * 创建一份带示例内容的默认文档
 */
export const createDefaultDoc = (): ResumeDoc => {
  const page = createPage("page");
  const title = createText({
    id: getUniqueId(),
    parent: page.id,
    x: DEFAULT_PADDING,
    y: DEFAULT_PADDING,
    width: page.width - DEFAULT_PADDING * 2,
    height: 40,
    delta: [{ insert: "张三", attributes: { "font-size": "24", bold: "true" } }],
    style: { family: "PingFang SC", size: 24, weight: "bold", lineHeight: 1.4, color: "#1F2328" },
  });
  const divider = createRect({
    id: getUniqueId(),
    parent: page.id,
    x: DEFAULT_PADDING,
    y: DEFAULT_PADDING + 52,
    width: page.width - DEFAULT_PADDING * 2,
    height: 1,
  });
  const body = createText({
    id: getUniqueId(),
    parent: page.id,
    x: DEFAULT_PADDING,
    y: DEFAULT_PADDING + 68,
    width: page.width - DEFAULT_PADDING * 2,
    height: 60,
    delta: [{ insert: "点击工具栏的编辑按钮或双击文本进入编辑。" }],
  });
  page.children = [title.id, divider.id, body.id];
  return {
    version: DOC_VERSION,
    root: page.id,
    nodes: {
      [page.id]: page,
      [title.id]: title,
      [divider.id]: divider,
      [body.id]: body,
    },
  };
};
