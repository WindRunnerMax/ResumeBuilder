import type { Point, Rect } from "@cv/utils";

/** 元素类型 */
export const NODE_TYPE = {
  PAGE: "page",
  TEXT: "text",
  IMAGE: "image",
  RECT: "rect",
} as const;

/** 元素类型枚举值 */
export type NodeType = (typeof NODE_TYPE)[keyof typeof NODE_TYPE];

/** 几何位置，单位为 96dpi 下的 px */
export type NodeGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** 所有节点的公共字段 */
export type BaseNode = NodeGeometry & {
  /** 节点 id */
  id: string;
  /** 节点类型 */
  type: NodeType;
  /** 父节点 id，根节点为 null */
  parent: string | null;
  /** 子节点 id，顺序即 z 序 */
  children: string[];
  /** 旋转角度，预留 */
  rotate?: number;
  /** 透明度 */
  opacity?: number;
  /** 锁定，不可拖拽 */
  locked?: boolean;
};

/** 纸张尺寸，支持预设名或自定义毫米尺寸 */
export type PaperSize = "A4" | "A3" | "Letter" | { width: number; height: number };

/** 页面节点，固定为单页纸张 */
export type PageNode = BaseNode & {
  type: typeof NODE_TYPE.PAGE;
  /** 纸张尺寸 */
  size: PaperSize;
  /** 内边距，顺序为 上 右 下 左（px） */
  padding: [number, number, number, number];
  /** 背景色 */
  background: string;
};

/** 文本块级样式 */
export type TextStyle = {
  /** 字体族 */
  family?: string;
  /** 字号 px */
  size?: number;
  /** 字重 */
  weight?: string;
  /** 行高倍数 */
  lineHeight?: number;
  /** 颜色 */
  color?: string;
  /** 水平对齐 */
  align?: "left" | "center" | "right" | "justify";
};

/** 文本节点，内容是一份 BlockKit Delta */
export type TextNode = BaseNode & {
  type: typeof NODE_TYPE.TEXT;
  /** 富文本内容 */
  delta: import("@block-kit/delta").Op[];
  /** 块级默认样式 */
  style: TextStyle;
  /** 高度随内容自适应 */
  autoHeight: boolean;
};

/** 图片填充模式 */
export type ImageMode = "contain" | "cover" | "fill";

/** 图片节点 */
export type ImageNode = BaseNode & {
  type: typeof NODE_TYPE.IMAGE;
  /** 图片地址 */
  src: string;
  /** 填充模式 */
  mode: ImageMode;
  /** 描边 */
  border?: { width: number; color: string } | null;
  /** 圆角 */
  radius?: number;
};

/** 矩形描边，四边可独立开关 */
export type RectBorder = {
  width: number;
  color: string;
  l: boolean;
  r: boolean;
  t: boolean;
  b: boolean;
};

/** 矩形/分割线节点 */
export type RectNode = BaseNode & {
  type: typeof NODE_TYPE.RECT;
  /** 填充色 */
  fill?: string | null;
  /** 描边 */
  border?: RectBorder | null;
  /** 圆角 */
  radius?: number;
};

/** 简历节点联合类型 */
export type ResumeNode = PageNode | TextNode | ImageNode | RectNode;

/** 简历文档，扁平 id → 节点 */
export type ResumeDoc = {
  /** 数据版本，用于迁移 */
  version: number;
  /** 根节点 id，即页面节点 */
  root: string;
  /** 节点索引 */
  nodes: Record<string, ResumeNode>;
};

/** 元素运行时矩形换算 */
export type NodeRect = Rect;

/** 点坐标 */
export type NodePoint = Point;
