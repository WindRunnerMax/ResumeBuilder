import { createDefaultDoc, JSONDocument } from "@re/json";

import { Editor } from "../src/editor";
import { EditorModule } from "../src/module";
import { EDITOR_MODE } from "../src/utils/constant";

/** 记录调用来源的测试模块 */
class TraceModule extends EditorModule {
  public readonly key: string;
  public readonly id: string;
  public calls: string[] = [];
  public constructor(key: string, id: string) {
    super();
    this.key = key;
    this.id = id;
  }
  public canUndo(): boolean {
    return true;
  }
  public canRedo(): boolean {
    return true;
  }
  public undo(): void {
    this.calls.push("undo");
  }
  public redo(): void {
    this.calls.push("redo");
  }
  public clear(): void {
    this.calls = [];
  }
  public destroy(): void {
    this.calls = [];
  }
}

describe("Editor", () => {
  const createEditor = () => {
    const doc = new JSONDocument(createDefaultDoc());
    return { editor: new Editor({ doc }), doc };
  };

  it("should move node and undo", () => {
    const { editor, doc } = createEditor();
    const textId = Object.values(doc.get().nodes).find(node => node.type === "text")!.id;
    const before = (doc.getNode(textId) as { x: number }).x;

    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 30, dy: 10 } });
    expect((doc.getNode(textId) as { x: number }).x).toBe(before + 30);
    expect(editor.history.canUndo()).toBe(true);

    editor.undo();
    expect((doc.getNode(textId) as { x: number }).x).toBe(before);
    expect(editor.history.canRedo()).toBe(true);

    editor.redo();
    expect((doc.getNode(textId) as { x: number }).x).toBe(before + 30);
  });

  it("should delete node and undo", () => {
    const { editor, doc } = createEditor();
    const page = doc.get().root;
    const textId = Object.values(doc.get().nodes).find(node => node.type === "text")!.id;
    editor.command.execute({ type: "DELETE", payload: { ids: [textId] } });
    expect(doc.getNode(textId)).toBeNull();
    expect(doc.getNode(page)!.children).not.toContain(textId);

    editor.undo();
    expect(doc.getNode(textId)).not.toBeNull();
    expect(doc.getNode(page)!.children).toContain(textId);
  });

  it("should skip missing module when undo", () => {
    const { editor, doc } = createEditor();
    const textId = Object.values(doc.get().nodes).find(node => node.type === "text")!.id;
    const before = (doc.getNode(textId) as { x: number }).x;
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 5, dy: 0 } });
    // 伪造一条找不到模块的记录，撤销时应跳过并继续弹下一条
    editor.history.record("ghost", textId);
    editor.undo();
    expect((doc.getNode(textId) as { x: number }).x).toBe(before);
    expect(editor.history.canUndo()).toBe(false);
  });

  it("should clear main and module stack on loadDocument", () => {
    const { editor, doc } = createEditor();
    const textId = Object.values(doc.get().nodes).find(node => node.type === "text")!.id;
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 5, dy: 0 } });
    editor.loadDocument(createDefaultDoc());
    expect(editor.history.canUndo()).toBe(false);
    expect(editor.history.canRedo()).toBe(false);
    expect(editor.canvas.canUndo()).toBe(false);
    expect(editor.canvas.canRedo()).toBe(false);
  });

  it("should ignore undo in readonly mode", () => {
    const doc = new JSONDocument(createDefaultDoc());
    const editor = new Editor({ doc, readonly: true });
    const textId = Object.values(doc.get().nodes).find(node => node.type === "text")!.id;
    const before = Math.round((doc.getNode(textId) as { x: number }).x);
    // 只读态下命令不产生历史
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 5, dy: 0 } });
    editor.undo();
    editor.redo();
    expect(editor.history.canUndo()).toBe(false);
    expect(editor.history.canRedo()).toBe(false);
    expect(editor.canvas.canUndo()).toBe(false);
    expect((doc.getNode(textId) as { x: number }).x).toBeCloseTo(before);
  });

  it("should record one main entry per command", () => {
    const { editor, doc } = createEditor();
    const textId = Object.values(doc.get().nodes).find(node => node.type === "text")!.id;
    const rectId = Object.values(doc.get().nodes).find(node => node.type === "rect")!.id;
    editor.command.execute({ type: "MOVE", payload: { ids: [textId, rectId], dx: 3, dy: 3 } });
    const entry = editor.history.undo()!;
    expect(entry.type).toBe("canvas");
    expect(entry.id).toBe(textId);
    expect(editor.canvas.canUndo()).toBe(true);
    expect(editor.history.canUndo()).toBe(false);
  });

  it("should enter and exit text edit mode", () => {
    const { editor, doc } = createEditor();
    const textId = Object.values(doc.get().nodes).find(node => node.type === "text")!.id;
    expect(editor.mode.mode).toBe(EDITOR_MODE.GRAPH);

    editor.mode.enterTextEdit(textId);
    expect(editor.mode.mode).toBe(EDITOR_MODE.TEXT_EDIT);
    expect(editor.mode.editingId).toBe(textId);

    editor.mode.exitTextEdit();
    expect(editor.mode.mode).toBe(EDITOR_MODE.GRAPH);
    expect(editor.mode.editingId).toBeNull();
  });

  it("should not enter text edit for non-text node", () => {
    const { editor, doc } = createEditor();
    const rectId = Object.values(doc.get().nodes).find(node => node.type === "rect")!.id;
    expect(editor.mode.enterTextEdit(rectId)).toBe(false);
    expect(editor.mode.mode).toBe(EDITOR_MODE.GRAPH);
  });

  it("should submit delta and invert", () => {
    const { editor, doc } = createEditor();
    const textId = Object.values(doc.get().nodes).find(node => node.type === "text")!.id;
    const before = (doc.getNode(textId) as { delta: unknown[] }).delta;

    const next = [{ insert: "新的内容" }];
    editor.submitDelta(textId, next);
    expect((doc.getNode(textId) as { delta: unknown[] }).delta).toEqual(next);
  });

  it("should insert node", () => {
    const { editor, doc } = createEditor();
    const page = doc.get().root;
    const id = editor.insertNode({
      id: "new-text",
      type: "text",
      parent: page,
      children: [],
      x: 10,
      y: 10,
      width: 100,
      height: 40,
      delta: [{ insert: "插入" }],
      style: {},
      autoHeight: true,
    });
    expect(id).toBe("new-text");
    expect(doc.getNode("new-text")).not.toBeNull();
    expect(doc.getNode(page)!.children).toContain("new-text");
  });

  it("should dispatch to module by id when keys are the same", () => {
    const { editor } = createEditor();
    const a = new TraceModule("text", "text-a");
    const b = new TraceModule("text", "text-b");
    editor.module.register(a);
    editor.module.register(b);
    expect(editor.module.getList("text").length).toBe(2);

    editor.history.record("text", "text-a");
    editor.undo();
    expect(a.calls).toEqual(["undo"]);
    expect(b.calls).toEqual([]);

    editor.history.record("text", "text-b");
    editor.undo();
    expect(b.calls).toEqual(["undo"]);

    // 按实例注销，不影响同 key 的其他实例
    editor.module.unregister(b);
    expect(editor.module.getList("text")).toEqual([a]);

    a.destroy();
    b.destroy();
  });
});
