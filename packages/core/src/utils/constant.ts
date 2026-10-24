/** 编辑器内置状态 */
export const EDITOR_STATE = {
  /** 已挂载 */
  MOUNTED: "MOUNTED",
  /** 只读 */
  READONLY: "READONLY",
  /** 鼠标按下 */
  MOUSE_DOWN: "MOUSE_DOWN",
  /** 焦点在编辑器内 */
  FOCUS: "FOCUS",
} as const;

/** 编辑器状态键 */
export type EditorStateKey = (typeof EDITOR_STATE)[keyof typeof EDITOR_STATE];

/** 变更来源 */
export const APPLY_SOURCE = {
  /** 用户操作 */
  USER: "USER",
  /** 历史回放 */
  HISTORY: "HISTORY",
  /** 系统内部（如高度自适应回写） */
  SYSTEM: "SYSTEM",
} as const;

/** 变更来源类型 */
export type ApplySource = (typeof APPLY_SOURCE)[keyof typeof APPLY_SOURCE];

/** 交互模式 */
export const EDITOR_MODE = {
  /** 图形模式：选中、拖拽、缩放 */
  GRAPH: "GRAPH",
  /** 文本编辑模式 */
  TEXT_EDIT: "TEXT_EDIT",
} as const;

/** 交互模式类型 */
export type EditorMode = (typeof EDITOR_MODE)[keyof typeof EDITOR_MODE];

/** 元素 DOM 节点上的 id 属性 */
export const ELEMENT_KEY = "data-element-id";

/** 缩放手柄 DOM 节点上的属性 */
export const HANDLE_KEY = "data-handle";

/** 编辑器容器属性，用于查找根节点 */
export const EDITOR_KEY = "data-cv-editor";

/** 文本块容器类名，与 react 侧 `TEXT_CLASS` 保持一致 */
export const TEXT_KEY = "cv-text-block";
