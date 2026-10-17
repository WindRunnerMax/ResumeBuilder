import type { Op, Snapshot } from "@cv/json";

import type { Editor } from "../editor";
import { APPLY_SOURCE } from "../utils/constant";

/** 主栈条目 */
export type HistoryEntry =
  | {
      /** 普通 op 组 */
      kind: "ops";
      /** 反转后的 ops */
      ops: Op[];
    }
  | {
      /** 委托给独立模块的占位 */
      kind: "module";
      /** 模块 key */
      moduleKey: string;
      /** 模块作用路径 */
      path: Array<string | number>;
    };

/** 栈最大深度 */
const STACK_SIZE = 200;

/**
 * 主撤销栈
 * - 记录完整内容变更，保证整体可回滚
 * - 独立模块（如文本块）以占位条目形式参与
 */
export class History {
  /** undo 栈 */
  private undoStack: HistoryEntry[] = [];
  /** redo 栈 */
  private redoStack: HistoryEntry[] = [];
  /** 批量操作计数 */
  private batchDepth = 0;
  /** 批量期间暂存的 ops */
  private batch: Op[] = [];

  public constructor(private editor: Editor) {}

  /** 记录一次变更，入参为正向 ops */
  public record(ops: Op[]): void {
    if (!ops.length) return;
    const snapshot = this.editor.document.get();
    const inverted = this.editor.document.invert(ops, snapshot as Snapshot);
    if (!inverted.length) return;
    if (this.batchDepth > 0) {
      this.batch = this.editor.document.compose(this.batch, inverted);
      return;
    }
    this.push({ kind: "ops", ops: this.normalize(inverted) });
  }

  /** 记录模块占位 */
  public recordModule(moduleKey: string, path: Array<string | number>): void {
    this.push({ kind: "module", moduleKey, path });
  }

  /** 入栈 */
  private push(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    this.redoStack = [];
    if (this.undoStack.length > STACK_SIZE) {
      this.undoStack.shift();
    }
    this.emit();
  }

  /**
   * 合并同一路径相同字段的连续 op，避免每个字符一条记录
   * - ot-json 的 compose 需要正确的先后顺序，这里按原顺序合并
   */
  private normalize(ops: Op[]): Op[] {
    return ops;
  }

  /** 开始批量 */
  public beginBatch(): void {
    this.batchDepth++;
  }

  /** 结束批量，把批量 ops 作为一条记录入栈 */
  public closeBatch(): void {
    this.batchDepth = Math.max(0, this.batchDepth - 1);
    if (this.batchDepth === 0 && this.batch.length) {
      const ops = this.batch;
      this.batch = [];
      this.push({ kind: "ops", ops });
    }
  }

  /** 撤销 */
  public undo(): void {
    const entry = this.undoStack.pop();
    if (!entry) return;
    this.applyEntry(entry);
    this.redoStack.push(this.invertEntry(entry));
    this.emit();
  }

  /** 重做 */
  public redo(): void {
    const entry = this.redoStack.pop();
    if (!entry) return;
    this.applyEntry(entry);
    this.undoStack.push(this.invertEntry(entry));
    this.emit();
  }

  /** 执行栈条目 */
  private applyEntry(entry: HistoryEntry): void {
    if (entry.kind === "ops") {
      this.editor.submit(entry.ops, APPLY_SOURCE.HISTORY, false);
      return;
    }
    const module = this.editor.module.get(entry.moduleKey, entry.path);
    module && module.undo();
  }

  /** 反转栈条目 */
  private invertEntry(entry: HistoryEntry): HistoryEntry {
    if (entry.kind === "module") return entry;
    const snapshot = this.editor.document.get();
    return { kind: "ops", ops: this.editor.document.invert(entry.ops, snapshot as Snapshot) };
  }

  /** 是否可撤销 */
  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** 是否可重做 */
  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** 清空 */
  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.batch = [];
    this.batchDepth = 0;
    this.emit();
  }

  /** 广播栈状态 */
  private emit(): void {
    this.editor.event.trigger("HISTORY_CHANGE", {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
  }

  /** 销毁 */
  public destroy(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.batch = [];
  }
}
