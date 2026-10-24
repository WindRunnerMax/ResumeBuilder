import type { Op, Snapshot } from "@re/json";

import type { Editor } from "../editor";
import { EditorModule } from "../module";
import { APPLY_SOURCE } from "../utils/constant";

/** 记录结果 */
export const RECORD_RESULT = {
  /** 新开一格 */
  APPEND: "APPEND",
  /** 并入了栈顶那一格 */
  MERGE: "MERGE",
  /** 前后抵消，栈顶那一格被丢弃 */
  MERGE_DROP: "MERGE_DROP",
} as const;

/** 记录结果取值 */
export type RecordResult = typeof RECORD_RESULT[keyof typeof RECORD_RESULT];

/** 一次画布变更的栈记录 */
type CanvasRecord = {
  /** 正向 op */
  ops: Op[];
  /** 受影响节点 id 集合的指纹，合并时要求完全一致 */
  target: string;
  /** 合并键，如命令类型；不同键之间即使时间相邻也不合并 */
  key: string;
  /** 入栈时间（ms） */
  time: number;
};

/** 相邻变更的合并时间窗（ms），与文本块栈的 DELAY 对齐 */
const MERGE_GAP = 1000;

/**
 * 画布模块
 * - 负责位置、尺寸、增删、属性等 ot-json op 类操作的撤销
 * - 一次命令产生的全部 op（含多选）只占一条记录
 * - 时间窗内的同类变更会先与栈顶 compose 再合并，等价于文本块栈的 MERGE：
 *   拖拽结束、方向键连按、滑块连续调值都只占一格
 * - 主栈在弹出失效条目后，文档可能已被其他条目的撤销改变，
 *   因此每次执行前都用当前快照现算反向 op，保证 op 与文档一致
 */
export class CanvasModule extends EditorModule {
  /** 模块标识 */
  public readonly key = "canvas";
  /** 作用于整份画布 */
  public readonly id = "canvas";
  /** undo 栈，保存正向 op */
  private undoStack: CanvasRecord[] = [];
  /** redo 栈，保存正向 op */
  private redoStack: CanvasRecord[] = [];

  public constructor(private editor: Editor) {
    super();
  }

  /**
   * 记录一次画布变更
   * - 必须在 op 提交之前调用
   * - 与栈顶在时间窗内、合并键与作用对象都一致时并入栈顶，否则新开一格
   * @param ops 本次变更的正向 op
   * @param key 合并键，通常取命令类型
   * @returns 本次变更对撤销栈的影响，主栈据此同步自己的格子
   */
  public record(ops: Op[], key: string): RecordResult {
    if (!ops.length) return RECORD_RESULT.MERGE;
    const target = this.getTarget(ops);
    const time = Date.now();
    const top = this.undoStack[this.undoStack.length - 1];
    if (top && top.key === key && top.target === target && time - top.time <= MERGE_GAP) {
      const composed = this.editor.document.compose(top.ops, ops);
      // `na` 原地累加会带出浮点误差，合并后按小数位收敛一次；
      // 增量为 0 表示这一步没有产生任何变化，一并剔除
      const merged = composed
        .map(op => (op.na === undefined ? op : { ...op, na: Number(op.na.toFixed(6)) }))
        .filter(op => op.na !== 0);
      if (merged.length === 0 && composed.length > 0) {
        // 纯增量操作全部抵消（移动后又移回原位），整格消失，主栈需要同步丢弃
        this.undoStack.pop();
        this.redoStack = [];
        return RECORD_RESULT.MERGE_DROP;
      }
      top.ops = merged;
      top.time = time;
      this.redoStack = [];
      return RECORD_RESULT.MERGE;
    }
    this.undoStack.push({ ops, target, key, time });
    this.redoStack = [];
    return RECORD_RESULT.APPEND;
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
    const record = this.undoStack.pop();
    if (!record) return;
    const inverse = this.invert(record.ops);
    this.submit(inverse);
    this.redoStack.push({ ...record, ops: inverse, time: Date.now() });
  }

  /** 重做 */
  public redo(): void {
    const record = this.redoStack.pop();
    if (!record) return;
    const inverse = this.invert(record.ops);
    this.submit(inverse);
    this.undoStack.push({ ...record, ops: inverse, time: Date.now() });
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

  /**
   * 生成作用对象指纹
   * - 合并只发生在完全相同的对象集合上，避免多选变化时误并
   * @param ops 本次变更的 op
   */
  private getTarget(ops: Op[]): string {
    return this.editor.collectIds(ops).sort().join(",");
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
