import { createDefaultDoc, JSONDocument } from "@re/json";

import { Editor } from "../src/editor";
import { EDITOR_MODE } from "../src/utils/constant";

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

    editor.history.undo();
    expect((doc.getNode(textId) as { x: number }).x).toBe(before);
    expect(editor.history.canRedo()).toBe(true);

    editor.history.redo();
    expect((doc.getNode(textId) as { x: number }).x).toBe(before + 30);
  });

  it("should delete node and undo", () => {
    const { editor, doc } = createEditor();
    const page = doc.get().root;
    const textId = Object.values(doc.get().nodes).find(node => node.type === "text")!.id;
    editor.command.execute({ type: "DELETE", payload: { ids: [textId] } });
    expect(doc.getNode(textId)).toBeNull();
    expect(doc.getNode(page)!.children).not.toContain(textId);

    editor.history.undo();
    expect(doc.getNode(textId)).not.toBeNull();
    expect(doc.getNode(page)!.children).toContain(textId);
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
});
