import type { Point } from "@re/utils";

import type { Editor } from "../editor";
import { EDITOR_MODE } from "../utils/constant";
import type { EditorMode } from "../utils/constant";

/** 模式变更监听 */
export type ModeListener = (mode: EditorMode, id: string | null) => void;

/**
 * 交互模式管理
 * - GRAPH：选中、拖拽、缩放
 * - TEXT_EDIT：文本内容编辑，只能由工具栏编辑按钮或双击进入
 */
export class ModeManager {
  /** 当前模式 */
  private current: EditorMode = EDITOR_MODE.GRAPH;
  /** 文本编辑态下的节点 id */
  private editId: string | null = null;
  /** 进入编辑态时的鼠标位置（视口坐标），用于把光标放到点击处 */
  private editPoint: Point | null = null;
  /** 监听器 */
  private listeners: Set<ModeListener> = new Set();

  public constructor(private editor: Editor) {}

  /** 当前模式 */
  public get mode(): EditorMode {
    return this.current;
  }

  /** 当前编辑的节点 id */
  public get editingId(): string | null {
    return this.editId;
  }

  /**
   * 进入编辑态时的鼠标位置（视口坐标）
   * - 双击进入时为点击位置，其余入口为空，表示聚焦到末尾
   * - 消费一次后清空，避免下次进入误用
   */
  public consumeEditPoint(): Point | null {
    const point = this.editPoint;
    this.editPoint = null;
    return point;
  }

  /** 是否为文本编辑模式 */
  public isTextEdit(): boolean {
    return this.current === EDITOR_MODE.TEXT_EDIT;
  }

  /** 是否正在编辑指定节点 */
  public isTextEditing(id: string): boolean {
    return this.current === EDITOR_MODE.TEXT_EDIT && this.editId === id;
  }

  /**
   * 进入文本编辑模式
   * @param id 文本节点 id
   * @param point 触发位置（视口坐标），双击时传点击位置以把光标落到点击处
   */
  public enterTextEdit(id: string, point?: Point | null): boolean {
    const state = this.editor.model.get(id);
    if (!state || state.type !== "text") return false;
    if (this.current === EDITOR_MODE.TEXT_EDIT && this.editId === id) return true;
    const from = this.current;
    this.current = EDITOR_MODE.TEXT_EDIT;
    this.editId = id;
    this.editPoint = point || null;
    this.editor.selection.set([id]);
    this.emit(from, id);
    return true;
  }

  /** 退出文本编辑模式 */
  public exitTextEdit(): void {
    if (this.current !== EDITOR_MODE.TEXT_EDIT) return;
    const from = this.current;
    this.current = EDITOR_MODE.GRAPH;
    this.editId = null;
    this.editPoint = null;
    this.emit(from, null);
  }

  /** 订阅变化 */
  public onChange(listener: ModeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** 广播变化 */
  private emit(from: EditorMode, id: string | null): void {
    this.editor.event.trigger("MODE_CHANGE", { from, to: this.current, id });
    this.listeners.forEach(listener => listener(this.current, id));
    // 模式切换会影响选中框的绘制
    this.editor.overlay.patch();
  }

  /** 销毁 */
  public destroy(): void {
    this.listeners.clear();
  }
}
