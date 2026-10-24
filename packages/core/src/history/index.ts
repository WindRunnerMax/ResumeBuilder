/**
 * 主栈条目
 * - 只保存索引信息，不保存任何操作内容
 * - 撤销 / 重做时按 `type` 找到对应模块，由模块自己执行
 */
export type HistoryEntry = {
  /** 模块类型，如 "canvas" | "text" */
  type: string;
  /** 作用对象 id */
  id: string;
  /** 记录时间（ms） */
  time: number;
};

/** 栈最大深度 */
const STACK_SIZE = 200;

/**
 * 主撤销栈
 * - 只记录「什么类型的操作、作用于哪个 id、何时」
 * - 不 invert、不 compose、不碰任何操作内容
 * - 撤销粒度、合并、批量全部下沉到各模块
 * - 栈的一格代表模块栈的一格（模块内部可再按集合语义合并多条 op）
 */
export class History {
  /** undo 栈 */
  private undoStack: HistoryEntry[] = [];
  /** redo 栈 */
  private redoStack: HistoryEntry[] = [];

  /**
   * 记录一次变更
   * - 新操作会清空 redo 栈
   * - 超过栈上限时丢弃最旧条目
   * - 合并由模块判定，主栈只按 `type + id` 跟随模块的格子结构
   * @param type 模块类型
   * @param id 作用对象 id
   * @param merge 为 true 时说明模块把本次变更并入了自己栈顶那一格，主栈不新增条目
   */
  public record(type: string, id: string, merge = false): void {
    if (merge) {
      // 合并不会让栈长度变化，栈顶条目必须与模块栈顶是同一格
      const top = this.undoStack[this.undoStack.length - 1];
      if (top && top.type === type && top.id === id) {
        top.time = Date.now();
        this.redoStack = [];
        return;
      }
    }
    this.undoStack.push({ type, id, time: Date.now() });
    this.redoStack = [];
    if (this.undoStack.length > STACK_SIZE) {
      this.undoStack.shift();
    }
  }

  /**
   * 丢弃指定模块的一条条目
   * - 模块侧合并后完全抵消时会少一格，主栈必须同步
   * @param type 模块类型
   * @param id 作用对象 id
   * @returns 是否真的丢弃了一条
   */
  public drop(type: string, id: string): boolean {
    for (let i = this.undoStack.length - 1; i >= 0; i--) {
      const entry = this.undoStack[i];
      if (entry.type === type && entry.id === id) {
        this.undoStack.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * 弹出 undo 栈顶并压入 redo 栈
   * @returns 弹出的条目；空栈返回 null
   */
  public undo(): HistoryEntry | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    this.redoStack.push(entry);
    return entry;
  }

  /**
   * 弹出 redo 栈顶并压回 undo 栈
   * @returns 弹出的条目；空栈返回 null
   */
  public redo(): HistoryEntry | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    this.undoStack.push(entry);
    return entry;
  }

  /**
   * 是否可撤销
   * - 只判断主栈；模块内部栈（文本块逐字撤销）由模块自行上报
   */
  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * 是否可重做
   * - 只判断主栈；模块内部栈由模块自行上报
   */
  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** 清空双栈 */
  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /** 销毁 */
  public destroy(): void {
    this.clear();
  }
}
