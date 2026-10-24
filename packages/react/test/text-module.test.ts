import type { Op as DeltaOp } from "@block-kit/delta";
import { createDefaultDoc, JSONDocument } from "@re/json";
import { Editor } from "@re/core";

import { TextModule } from "../src/plugin/text/module";
import type { TextEditorLike } from "../src/plugin/text/module";

/**
 * BlockKit 编辑器替身
 * - 只模拟 history 与 state 两部分，足以覆盖 TextModule 的行为
 * - 内容用字符串表示，撤销栈按快照回退
 */
class FakeTextEditor {
  /** 当前内容 */
  public text: string;
  /** 撤销栈 */
  private undoStack: string[] = [];
  /** 重做栈 */
  private redoStack: string[] = [];

  public constructor(text: string) {
    this.text = text;
  }

  /** 模拟一次用户输入，入栈旧内容 */
  public type(next: string): void {
    this.undoStack.push(this.text);
    this.redoStack = [];
    this.text = next;
  }

  public history = {
    isUndoAble: () => this.undoStack.length > 0,
    isRedoAble: () => this.redoStack.length > 0,
    undo: () => {
      const prev = this.undoStack.pop();
      if (prev === undefined) return undefined;
      this.redoStack.push(this.text);
      this.text = prev;
      return undefined;
    },
    redo: () => {
      const next = this.redoStack.pop();
      if (next === undefined) return undefined;
      this.undoStack.push(this.text);
      this.text = next;
      return undefined;
    },
    clear: () => {
      this.undoStack = [];
      this.redoStack = [];
    },
  };

  public state = {
    block: {
      toDelta: () => ({ ops: [{ insert: this.text }] as DeltaOp[] }),
    },
  };
}

/** 构造带一个文本节点的画布编辑器 */
const createCanvas = () => {
  const doc = new JSONDocument(createDefaultDoc());
  const editor = new Editor({ doc });
  const textId = Object.values(doc.get().nodes).find(node => node.type === "text")!.id;
  return { editor, doc, textId };
};

/** 读取文档里的文本内容 */
const readDoc = (doc: JSONDocument, id: string): string => {
  const node = doc.getNode(id);
  if (!node || node.type !== "text") return "";
  return node.delta.map(op => (typeof op.insert === "string" ? op.insert : "")).join("");
};

describe("TextModule", () => {
  const setup = (initial = "A") => {
    const { editor, doc, textId } = createCanvas();
    const block = new FakeTextEditor(initial);
    const module = new TextModule(textId, editor, () => block as unknown as TextEditorLike);
    editor.module.register(module);
    return { editor, doc, textId, block, module };
  };

  it("should register one main entry for a typing session", () => {
    const { editor, block, module } = setup();
    for (const value of ["A1", "A12", "A123"]) {
      block.type(value);
      module.record();
    }
    // 同一次连续输入只登记一条
    expect(editor.history.canUndo()).toBe(true);
    expect(editor.history.undo()!.type).toBe("text");
    expect(editor.history.canUndo()).toBe(false);
  });

  it("should undo text and write content back to document", () => {
    const { editor, doc, textId, block, module } = setup();
    block.type("A123");
    module.record();
    expect(editor.history.canUndo()).toBe(true);

    editor.undo();
    expect(block.text).toBe("A");
    expect(readDoc(doc, textId)).toBe("A");
    expect(editor.history.canRedo()).toBe(true);
  });

  it("should record again after undo then typing", () => {
    const { editor, textId, block, module } = setup();
    block.type("A123");
    module.record();
    editor.undo();
    // 撤销后主栈清空，redo 可用
    expect(editor.history.canUndo()).toBe(false);
    expect(editor.history.canRedo()).toBe(true);

    // 再输入新内容，必须重新入栈
    block.type("A456");
    module.record();
    expect(editor.history.canUndo()).toBe(true);
    expect(editor.history.canRedo()).toBe(false);
    expect(readDoc(editor.document, textId)).toBe("A");
  });

  it("should record again after redo then typing", () => {
    const { editor, block, module } = setup();
    block.type("A123");
    module.record();
    editor.undo();
    editor.redo();
    expect(editor.history.canUndo()).toBe(true);

    block.type("A1234");
    module.record();
    // 已复位，重做链被新操作清空
    expect(editor.history.canRedo()).toBe(false);
    expect(editor.history.canUndo()).toBe(true);
  });

  it("should not record when text stack is empty", () => {
    const { editor, module } = setup();
    module.record();
    expect(editor.history.canUndo()).toBe(false);
  });

  it("should register two text modules with the same key", () => {
    const { editor, doc, textId } = createCanvas();
    const rectId = Object.values(doc.get().nodes).find(node => node.type === "rect")!.id;
    const first = new FakeTextEditor("A");
    const second = new FakeTextEditor("B");
    const a = new TextModule(textId, editor, () => first as unknown as TextEditorLike);
    const b = new TextModule(rectId, editor, () => second as unknown as TextEditorLike);
    // 两个文本块共用 "text" key，注册时不能互相覆盖
    editor.module.register(a);
    editor.module.register(b);
    expect(editor.module.getList("text")).toEqual([a, b]);

    // 按实例注销，只影响自己
    editor.module.unregister(a);
    expect(editor.module.getList("text")).toEqual([b]);
  });

  it("should update history state after undo", () => {
    const { editor, block, module } = setup();
    block.type("A1");
    module.record();
    const states: boolean[] = [];
    editor.event.on("HISTORY_CHANGE", e => states.push(e.canUndo));
    editor.undo();
    // 撤销后主栈为空，UI 需要收到一次状态刷新
    expect(states[states.length - 1]).toBe(false);
    expect(editor.history.canRedo()).toBe(true);
  });
});
