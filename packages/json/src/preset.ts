import { getUniqueId, mmToPx, PAPER_SIZE } from "@re/utils";

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
 * - 上部放一个水平居中的标题与一条分割线，作为空白起点
 */
export const createDefaultDoc = (): ResumeDoc => {
  const page = createPage("page");
  const contentWidth = page.width - DEFAULT_PADDING * 2;
  const titleHeight = 40;
  const dividerGap = 12;
  // 距顶部留出一定边距，约 1/6 纸高
  const titleY = Math.round(page.height / 6);
  const title = createText({
    id: getUniqueId(),
    parent: page.id,
    x: DEFAULT_PADDING,
    y: titleY,
    width: contentWidth,
    height: titleHeight,
    delta: [{ insert: "基于 DOM 实现的简历编辑器", attributes: { "font-size": "24", bold: "true" } }],
    style: {
      family: "PingFang SC",
      size: 24,
      weight: "bold",
      lineHeight: 1.4,
      color: "#1F2328",
      align: "center",
    },
  });
  const divider = createRect({
    id: getUniqueId(),
    parent: page.id,
    x: DEFAULT_PADDING,
    y: titleY + titleHeight + dividerGap,
    width: contentWidth,
    height: 1,
  });
  page.children = [title.id, divider.id];
  return {
    version: DOC_VERSION,
    root: page.id,
    nodes: {
      [page.id]: page,
      [title.id]: title,
      [divider.id]: divider,
    },
  };
};
