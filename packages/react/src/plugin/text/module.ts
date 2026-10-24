import type { Op as DeltaOp } from "@block-kit/delta";
import type { Editor as BlockEditor } from "@block-kit/core";
import { EditorModule } from "@re/core";
import type { Editor } from "@re/core";

import { destroyTextEditor, getTextEditor } from "./editor";

/** 文本编辑器获取方式，便于测试注入 */
export type TextEditorGetter = (id: string) => BlockEditor | null;

/** 文本编辑器最小能力，便于测试替身 */
export type TextEditorLike = Pick<BlockEditor, "history" | "state">;

/**
 * 文本模块
 * - 把 BlockKit 的 history 包装成独立撤销栈
 * - 主栈只记录一次占位，文本块内逐字撤销不会污染主栈
 * - 文本块是非受控编辑器：撤销 / 重做后要把内容写回文档
 */
export class TextModule extends EditorModule {
  /** 模块标识 */
  public readonly key = "text";
  /** 绑定的文本节点 id */
  public readonly id: string;
  /** 本轮连续输入是否已向主栈记录过占位，撤销后复位 */
  private recorded = false;

  /**
   * @param id 文本节点 id
   * @param canvas 画布编辑器，用于登记占位与广播历史状态
   * @param getEditor 文本编辑器获取方式，默认取全局缓存
   */
  public constructor(
    id: string,
    private canvas: Editor,
    private getEditor: (id: string) => TextEditorLike | null = getTextEditor
  ) {
    super();
    this.id = id;
  }

  /** 内部文本编辑器 */
  private get editor(): TextEditorLike | null {
    return this.getEditor(this.id);
  }

  /**
   * 记录一次内容变更
   * - 首次产生可撤销内容时向主栈登记一条占位，之后由文本栈自己承担粒度
   * - 撤销 / 重做会把主栈里这条占位移走，必须复位标志，否则后续输入不再登记
   */
  public record(): void {
    if (this.recorded) return;
    if (!this.canUndo()) return;
    this.recorded = true;
    this.canvas.history.record(this.key, this.id);
    this.canvas.notifyHistory();
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
    const editor = this.editor;
    if (!editor) return;
    editor.history.undo();
    // 占位已被主栈取走，下一次输入需要重新登记
    this.recorded = false;
    this.syncBack(editor);
    this.canvas.notifyHistory();
  }

  /** 重做 */
  public redo(): void {
    const editor = this.editor;
    if (!editor) return;
    editor.history.redo();
    // 占位已回到主栈，新一轮输入需要重新登记
    this.recorded = false;
    this.syncBack(editor);
    this.canvas.notifyHistory();
  }

  /**
   * 把编辑器当前内容写回画布文档
   * - BlockKit 内容变更会以 `undoable: false` 写回数据，不触发主栈记录
   * - 撤销 / 重做后必须同步一次，否则文本块与文档会不一致
   * @param editor 文本编辑器
   */
  private syncBack(editor: TextEditorLike): void {
    const ops = editor.state.block.toDelta().ops as DeltaOp[];
    this.canvas.submitDelta(this.id, ops, false);
  }

  /** 清空文本栈 */
  public clear(): void {
    this.editor?.history.clear();
    this.recorded = false;
  }

  /** 销毁 */
  public destroy(): void {
    destroyTextEditor(this.id);
    this.recorded = false;
  }
}
