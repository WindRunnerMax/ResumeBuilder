import type { Op, Snapshot } from "@re/json";

import type { Editor } from "../editor";
import { EditorModule } from "../module";
import { APPLY_SOURCE } from "../utils/constant";

/**
 * 画布模块
 * - 负责位置、尺寸、增删、属性等 ot-json op 类操作的撤销
 * - 一次命令产生的全部 op（含多选）只占一条记录
 * - 主栈在弹出失效条目后，文档可能已被其他条目的撤销改变，
 *   因此每次执行前都用当前快照现算反向 op，保证 op 与文档一致
 */
export class CanvasModule extends EditorModule {
  /** 模块标识 */
  public readonly key = "canvas";
  /** 作用于整份画布 */
  public readonly id = "canvas";
  /** undo 栈，保存正向 op */
  private undoStack: Op[][] = [];
  /** redo 栈，保存正向 op */
  private redoStack: Op[][] = [];

  public constructor(private editor: Editor) {
    super();
  }

  /**
   * 记录一次画布变更
   * - 必须在 op 提交之前调用
   * @param ops 本次变更的正向 op
   */
  public record(ops: Op[]): void {
    if (!ops.length) return;
    this.undoStack.push(ops);
    this.redoStack = [];
  }

  /** 是否可撤销 */
  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** 是否可重做 */
  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** 撤销 */
  public undo(): void {
    const ops = this.undoStack.pop();
    if (!ops) return;
    const inverse = this.invert(ops);
    this.submit(inverse);
    this.redoStack.push(inverse);
  }

  /** 重做 */
  public redo(): void {
    const ops = this.redoStack.pop();
    if (!ops) return;
    const inverse = this.invert(ops);
    this.submit(inverse);
    this.undoStack.push(inverse);
  }

  /** 清空栈 */
  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /** 销毁 */
  public destroy(): void {
    this.clear();
  }

  /** 基于当前快照反转 op */
  private invert(ops: Op[]): Op[] {
    return this.editor.document.invert(ops, this.editor.document.get() as Snapshot);
  }

  /** 以历史来源提交 op */
  private submit(ops: Op[]): void {
    this.editor.submit(ops, APPLY_SOURCE.HISTORY, false);
  }
}
