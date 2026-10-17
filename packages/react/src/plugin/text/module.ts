import type { Editor as BlockEditor } from "@block-kit/core";
import { EditorModule } from "@cv/core";
import type { ModuleSnapshot } from "@cv/core";

import { destroyTextEditor, getTextEditor } from "./editor";

/**
 * 文本模块
 * - 把 BlockKit 的 history 包装成独立撤销栈
 * - 主栈只记录占位，文本块内逐字撤销不会污染主栈
 */
export class TextModule extends EditorModule {
  /** 模块标识 */
  public readonly key = "text";
  /** 绑定的文本节点 id */
  public readonly id: string;
  /** 挂载的画布元素 */
  private el: HTMLElement | null;

  public constructor(id: string) {
    super();
    this.id = id;
    this.el = null;
  }

  /** 作用路径 */
  public get prefix() {
    return ["nodes", this.id];
  }

  /** 绑定 DOM，用于判断焦点 */
  public setElement(el: HTMLElement | null): void {
    this.el = el;
  }

  /** 内部编辑器 */
  private get editor(): BlockEditor | null {
    return getTextEditor(this.id);
  }

  /** 焦点是否在该文本块内 */
  public isActive(): boolean {
    const el = this.el;
    if (!el) return false;
    return el.contains(document.activeElement);
  }

  /** 是否可撤销 */
  public canUndo(): boolean {
    return this.editor?.history.isUndoAble() || false;
  }

  /** 是否可重做 */
  public canRedo(): boolean {
    return this.editor?.history.isRedoAble() || false;
  }

  /** 撤销 */
  public undo(): void {
    this.editor?.history.undo();
  }

  /** 重做 */
  public redo(): void {
    this.editor?.history.redo();
  }

  /** 获取快照 */
  public getSnapshot(): ModuleSnapshot {
    return this.editor?.state.block.toDelta().ops || [];
  }

  /** 销毁 */
  public destroy(): void {
    destroyTextEditor(this.id);
    this.el = null;
  }
}
