import type { Op, ResumeDoc, ResumeNode } from "@re/json";
import type { Point, Rect } from "@re/utils";

import type { ApplySource, EditorMode } from "../utils/constant";

/** 内容变更事件 */
export type ContentChangeEvent = {
  /** 变更后的文档 */
  current: Readonly<ResumeDoc>;
  /** 变更后的 ops */
  ops: Op[];
  /** 变更来源 */
  source: ApplySource;
  /** 受影响的节点 id */
  ids: string[];
  /** 是否记录到 history */
  undoable: boolean;
};

/** 选中变更事件 */
export type SelectionChangeEvent = {
  /** 上一次选中的 id */
  previous: string[];
  /** 当前选中的 id */
  current: string[];
  /** 选区包围盒 */
  bounds: Rect | null;
};

/** 模式变更事件 */
export type ModeChangeEvent = {
  /** 变更前模式 */
  from: EditorMode;
  /** 变更后模式 */
  to: EditorMode;
  /** 文本编辑模式下的节点 id */
  id: string | null;
};

/** 历史栈变更事件 */
export type HistoryChangeEvent = {
  canUndo: boolean;
  canRedo: boolean;
};

/** 悬停事件 */
export type HoverEvent = {
  /** 悬停的节点 */
  node: ResumeNode | null;
  /** 鼠标相对画布的坐标 */
  point: Point;
};

/** 画布尺寸事件 */
export type ResizeEvent = {
  width: number;
  height: number;
};

/** 挂载事件 */
export type MountEvent = Record<string, never>;

/** 重绘事件 */
export type PaintEvent = Record<string, never>;

/** 只读变更事件 */
export type ReadonlyChangeEvent = {
  prev: boolean;
  next: boolean;
};

/** 编辑器事件表 */
export type EventMap = {
  CONTENT_CHANGE: ContentChangeEvent;
  SELECTION_CHANGE: SelectionChangeEvent;
  MODE_CHANGE: ModeChangeEvent;
  HISTORY_CHANGE: HistoryChangeEvent;
  HOVER_CHANGE: HoverEvent;
  RESIZE: ResizeEvent;
  MOUNT: MountEvent;
  PAINT: PaintEvent;
  READONLY_CHANGE: ReadonlyChangeEvent;
};

/** 事件键 */
export type EventKey = keyof EventMap;

/** 事件常量 */
export const EDITOR_EVENT = {
  CONTENT_CHANGE: "CONTENT_CHANGE",
  SELECTION_CHANGE: "SELECTION_CHANGE",
  MODE_CHANGE: "MODE_CHANGE",
  HISTORY_CHANGE: "HISTORY_CHANGE",
  HOVER_CHANGE: "HOVER_CHANGE",
  RESIZE: "RESIZE",
  MOUNT: "MOUNT",
  PAINT: "PAINT",
  READONLY_CHANGE: "READONLY_CHANGE",
} as const;
