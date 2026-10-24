import type { Editor } from "../editor";
import { ELEMENT_KEY, TEXT_KEY } from "../utils/constant";

/** 文本模块 key，与 react 侧 `TextModule.key` 保持一致 */
const TEXT_MODULE_KEY = "text";

/** 文本块选择器 */
const TEXT_SELECTOR = `.${TEXT_KEY}`;

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
   * - 焦点在文本块内：只动**当前**文本块自己的栈，必须按 id 精确匹配
   * - 其余情况：走编辑器主栈
   */
  private handler(isRedo = false): void {
    const editor = this.editor;
    if (editor.isReadonly()) return;
    const id = this.getActiveTextId();
    const textModule = id ? editor.module.getList(TEXT_MODULE_KEY).find(m => m.id === id) : null;
    if (textModule) {
      isRedo ? textModule.redo() : textModule.undo();
      return;
    }
    isRedo ? editor.redo() : editor.undo();
  }

  /**
   * 取当前焦点所在的文本节点 id
   * - 焦点在 BlockKit 编辑容器内时，向上找最近的文本块，再读 `data-element-id`
   */
  private getActiveTextId(): string | null {
    const active = document.activeElement;
    const block = active?.closest<HTMLElement>(TEXT_SELECTOR);
    if (!block) return null;
    return block.closest<HTMLElement>(`[${ELEMENT_KEY}]`)?.getAttribute(ELEMENT_KEY) || null;
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
