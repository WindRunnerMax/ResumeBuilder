import type { Rect } from "@re/utils";
import { composeAll } from "@re/utils";

import type { Editor } from "../editor";

/** 缩放手柄位置 */
export const HANDLE = {
  LT: "lt",
  RT: "rt",
  LB: "lb",
  RB: "rb",
  L: "l",
  R: "r",
  T: "t",
  B: "b",
} as const;

/** 手柄类型 */
export type HandleType = (typeof HANDLE)[keyof typeof HANDLE];

/** 拖拽类型 */
export const GRAB_TYPE = {
  MOVE: "MOVE",
  RESIZE: "RESIZE",
  BOX: "BOX",
} as const;

/**
 * 选中模块
 * - 只维护选中集合与包围盒
 * - 具体拖拽逻辑在 Interaction 中
 */
export class Selection {
  /** 选中的 id 集合，保持顺序 */
  private ids: string[] = [];

  public constructor(private editor: Editor) {}

  /** 当前选中的 id */
  public get list(): string[] {
    return [...this.ids];
  }

  /** 是否选中 */
  public has(id: string): boolean {
    return this.ids.includes(id);
  }

  /** 是否为空 */
  public isEmpty(): boolean {
    return this.ids.length === 0;
  }

  /** 设置选中 */
  public set(ids: string[]): void {
    const previous = this.list;
    this.ids = [...new Set(ids)].filter(id => !!this.editor.model.get(id));
    if (this.isSame(previous, this.ids)) return;
    this.editor.event.trigger("SELECTION_CHANGE", {
      previous,
      current: this.list,
      bounds: this.getBounds(),
    });
    this.editor.overlay.patch();
  }

  /** 追加选中 */
  public add(ids: string[]): void {
    this.set([...this.ids, ...ids]);
  }

  /** 移除选中 */
  public remove(id: string): void {
    this.set(this.ids.filter(item => item !== id));
  }

  /** 清空选中 */
  public clear(): void {
    this.set([]);
  }

  /** 获取选中包围盒（相对页面） */
  public getBounds(): Rect | null {
    const list = this.ids
      .map(id => this.editor.model.get(id))
      .filter(Boolean)
      .map(state => state!.rect);
    return composeAll(list);
  }

  /** 判断数组是否相同 */
  private isSame(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((item, index) => item === b[index]);
  }

  /** 销毁 */
  public destroy(): void {
    this.ids = [];
  }
}
