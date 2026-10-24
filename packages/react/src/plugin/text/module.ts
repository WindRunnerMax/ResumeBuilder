import type { Op as DeltaOp } from "@block-kit/delta";
import type { Editor as BlockEditor, HistoryEffect } from "@block-kit/core";
import { HISTORY_EFFECT } from "@block-kit/core";
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
 * - 主栈与文本栈严格一格对一格：文本栈每多一格，主栈就多一条条目
 * - 文本块是非受控编辑器：撤销 / 重做后要把内容写回文档
 */
export class TextModule extends EditorModule {
  /** 模块标识 */
  public readonly key = "text";
  /** 绑定的文本节点 id */
  public readonly id: string;

  /**
   * @param id 文本节点 id
   * @param canvas 画布编辑器，用于同步主栈与广播历史状态
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
   * 同步文本栈的结构变化到主栈
   * - `APPEND` / `APPEND_DROP` 说明文本栈新开了一格，主栈补一条
   * - `MERGE` 说明这次变更并入了上一条，主栈不动作
   * - `MERGE_DROP` 说明合并后完全抵消，文本栈少了一格，主栈同步丢弃
   * @param effect 文本栈的效果
   */
  public record(effect: HistoryEffect): void {
    if (effect === HISTORY_EFFECT.APPEND || effect === HISTORY_EFFECT.APPEND_DROP) {
      this.canvas.history.record(this.key, this.id);
      this.canvas.notifyHistory();
      return;
    }
    if (effect === HISTORY_EFFECT.MERGE_DROP) {
      this.canvas.history.drop(this.key, this.id);
      this.canvas.notifyHistory();
    }
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
    this.syncBack(editor);
    this.canvas.notifyHistory();
  }

  /** 重做 */
  public redo(): void {
    const editor = this.editor;
    if (!editor) return;
    editor.history.redo();
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
  }

  /** 销毁 */
  public destroy(): void {
    destroyTextEditor(this.id);
  }
}
