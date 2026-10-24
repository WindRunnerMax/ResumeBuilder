import type { Editor } from "../editor";

/**
 * 键盘快捷键模块
 * - 绑 `document` 的 keydown，全局处理撤销 / 重做并阻止浏览器原生撤销
 * - 由 `Editor` 在构造时创建，随 `Editor.destroy` 销毁
 */
export class Key {
  public constructor(private editor: Editor) {}

  /** 绑定事件 */
  public bind(): void {
    document.addEventListener("keydown", this.onKeyDown);
  }

  /** 解绑事件 */
  public unbind(): void {
    document.removeEventListener("keydown", this.onKeyDown);
  }

  /** 键盘事件 */
  private onKeyDown = (e: KeyboardEvent) => {
    if (this.isUndo(e)) {
      // 无论是否响应都要阻止浏览器原生撤销，避免与编辑器历史产生两套记录
      e.preventDefault();
      this.handler();
      return;
    }
    if (this.isRedo(e)) {
      e.preventDefault();
      this.handler(true);
    }
  };

  /**
   * 执行撤销 / 重做
   * - 主栈是唯一时间线：文本块每次栈结构变化都已同步成条目，
   *   因此这里无需按焦点判断，直接交给 `editor.undo/redo` 按 `type + id` 派发
   */
  private handler(isRedo = false): void {
    const editor = this.editor;
    if (editor.isReadonly()) return;
    isRedo ? editor.redo() : editor.undo();
  }

  /** Ctrl/Cmd + Z */
  private isUndo(e: KeyboardEvent): boolean {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return false;
    return e.key.toLowerCase() === "z" && !e.shiftKey;
  }

  /** Ctrl/Cmd + Shift + Z 或 Ctrl/Cmd + Y */
  private isRedo(e: KeyboardEvent): boolean {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return false;
    const key = e.key.toLowerCase();
    return (key === "z" && e.shiftKey) || key === "y";
  }

  /** 销毁 */
  public destroy(): void {
    this.unbind();
  }
}
