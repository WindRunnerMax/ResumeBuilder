import { createDefaultDoc, JSONDocument } from "@re/json";
import type { ResumeNode, TextNode } from "@re/json";

import { Editor } from "../src/editor";

describe("CanvasModule", () => {
  const createEditor = () => {
    const doc = new JSONDocument(createDefaultDoc());
    const editor = new Editor({ doc });
    const textId = Object.values(doc.get().nodes).find(node => node.type === "text")!.id;
    const rectId = Object.values(doc.get().nodes).find(node => node.type === "rect")!.id;
    const get = (id: string) => doc.getNode(id) as ResumeNode & { x: number; y: number };
    return { editor, doc, textId, rectId, get };
  };

  it("should undo and redo MOVE", () => {
    const { editor, textId, get } = createEditor();
    const { x, y } = get(textId);
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 30, dy: 20 } });
    expect(get(textId).x).toBe(x + 30);
    expect(get(textId).y).toBe(y + 20);

    editor.undo();
    expect(get(textId).x).toBe(x);
    expect(get(textId).y).toBe(y);

    editor.redo();
    expect(get(textId).x).toBe(x + 30);
    expect(get(textId).y).toBe(y + 20);
  });

  it("should undo RESIZE", () => {
    const { editor, rectId, get } = createEditor();
    const before = get(rectId);
    const origin = { x: before.x, y: before.y, width: before.width, height: before.height };
    editor.command.execute({
      type: "RESIZE",
      payload: { id: rectId, x: 11, y: 22, width: 33, height: 44 },
    });
    expect(get(rectId).x).toBe(11);
    editor.undo();
    expect(get(rectId).x).toBe(origin.x);
    expect(get(rectId).y).toBe(origin.y);
    expect(get(rectId).width).toBe(origin.width);
    expect(get(rectId).height).toBe(origin.height);
  });

  it("should undo DELETE and restore children", () => {
    const { editor, doc, textId, get } = createEditor();
    const pageId = doc.get().root;
    editor.command.execute({ type: "DELETE", payload: { ids: [textId] } });
    expect(doc.getNode(textId)).toBeNull();
    expect((doc.getNode(pageId) as ResumeNode).children).not.toContain(textId);

    editor.undo();
    expect(doc.getNode(textId)).not.toBeNull();
    expect((doc.getNode(pageId) as ResumeNode).children).toContain(textId);
    expect(get(textId).type).toBe("text");
  });

  it("should undo REVISE attrs", () => {
    const { editor, textId } = createEditor();
    const before = (editor.document.getNode(textId) as ResumeNode).x;
    editor.command.execute({ type: "REVISE", payload: { id: textId, attrs: { x: 120 } } });
    expect((editor.document.getNode(textId) as ResumeNode).x).toBe(120);
    editor.undo();
    expect((editor.document.getNode(textId) as ResumeNode).x).toBe(before);
  });

  it("should undo multi move in one step", () => {
    const { editor, textId, rectId, get } = createEditor();
    const a = { x: get(textId).x, y: get(textId).y };
    const b = { x: get(rectId).x, y: get(rectId).y };
    editor.command.execute({ type: "MOVE", payload: { ids: [textId, rectId], dx: 10, dy: 10 } });
    expect(get(textId).x).toBe(a.x + 10);
    expect(get(rectId).x).toBe(b.x + 10);

    editor.undo();
    expect(get(textId).x).toBe(a.x);
    expect(get(textId).y).toBe(a.y);
    expect(get(rectId).x).toBe(b.x);
    expect(get(rectId).y).toBe(b.y);
  });

  it("should undo consecutive operations in order", () => {
    const { editor, textId, get } = createEditor();
    const start = Math.round(get(textId).x);
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 10, dy: 0 } });
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 20, dy: 0 } });
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 30, dy: 0 } });
    expect(get(textId).x).toBeCloseTo(start + 60);

    editor.undo();
    expect(get(textId).x).toBeCloseTo(start + 30);
    editor.undo();
    expect(get(textId).x).toBeCloseTo(start + 10);
    editor.undo();
    expect(get(textId).x).toBeCloseTo(start);
    expect(editor.canvas.canUndo()).toBe(false);
  });

  it("should clear module stack without touching main stack", () => {
    const { editor } = createEditor();
    editor.canvas.record([{ p: ["nodes", "a", "x"], na: 1 }]);
    expect(editor.canvas.canUndo()).toBe(true);
    expect(editor.history.canUndo()).toBe(false);
    editor.canvas.clear();
    expect(editor.canvas.canUndo()).toBe(false);
    expect(editor.canvas.canRedo()).toBe(false);
  });

  it("should keep redo chain consistent", () => {
    const { editor, textId, get } = createEditor();
    const start = Math.round(get(textId).x);
    for (let i = 0; i < 3; i++) {
      editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 10, dy: 0 } });
    }
    editor.undo();
    editor.undo();
    editor.undo();
    expect(get(textId).x).toBeCloseTo(start);
    editor.redo();
    editor.redo();
    editor.redo();
    expect(get(textId).x).toBeCloseTo(start + 30);
  });
});
