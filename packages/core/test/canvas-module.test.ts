import type { ResumeNode } from "@re/json";
import { createDefaultDoc, JSONDocument } from "@re/json";

import { Editor } from "../src/editor";

/** 合并时间窗，与 CanvasModule 内部一致 */
const MERGE_GAP = 1000;

/**
 * 让最近一条画布记录脱离合并时间窗
 * - 直接改系统时间容易影响其它用例，这里只把 fake timer 往前拨
 */
const nextWindow = () => {
  jest.advanceTimersByTime(MERGE_GAP + 1);
};

describe("CanvasModule", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

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
    // 每条命令之间跨出时间窗，保证三次操作各占一格
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 10, dy: 0 } });
    nextWindow();
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 20, dy: 0 } });
    nextWindow();
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
    editor.canvas.record([{ p: ["nodes", "a", "x"], na: 1 }], "MOVE");
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
      nextWindow();
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

describe("CanvasModule merge", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createEditor = () => {
    const doc = new JSONDocument(createDefaultDoc());
    const editor = new Editor({ doc });
    const textId = Object.values(doc.get().nodes).find(node => node.type === "text")!.id;
    const rectId = Object.values(doc.get().nodes).find(node => node.type === "rect")!.id;
    /** 主栈剩余条目数 */
    const count = (): number => {
      let total = 0;
      while (editor.history.canUndo()) {
        editor.history.undo();
        total += 1;
      }
      return total;
    };
    return { editor, doc, textId, rectId, count };
  };

  /** 读取节点位置 */
  const pos = (doc: JSONDocument, id: string) => {
    const node = doc.getNode(id) as { x: number; y: number };
    return { x: node.x, y: node.y };
  };

  /** 位置断言：ot-json 的 `na` 由文档原值累加，可能存在浮点尾差 */
  const expectPos = (doc: JSONDocument, id: string, target: { x: number; y: number }) => {
    const current = pos(doc, id);
    expect(current.x).toBeCloseTo(target.x, 6);
    expect(current.y).toBeCloseTo(target.y, 6);
  };

  it("should merge consecutive MOVE within the time window", () => {
    const { editor, doc, textId } = createEditor();
    const start = pos(doc, textId);
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 10, dy: 0 } });
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 20, dy: 5 } });
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 30, dy: 0 } });
    expectPos(doc, textId, { x: start.x + 60, y: start.y + 5 });
    // 三次移动合成一格
    expect(editor.canvas.canUndo()).toBe(true);
    editor.undo();
    expectPos(doc, textId, start);
    expect(editor.canvas.canUndo()).toBe(false);
    expect(editor.history.canUndo()).toBe(false);
  });

  it("should merge drag tail with the preceding drag command", () => {
    const { editor, doc, textId } = createEditor();
    const start = pos(doc, textId);
    // 拖拽松手：中间帧直接写 DOM，结束时只提交一次位移
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 40, dy: 30 } });
    // 紧接着松手后的收尾提交，应并入同一次拖拽
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 2, dy: 2 } });
    expectPos(doc, textId, { x: start.x + 42, y: start.y + 32 });
    editor.undo();
    expectPos(doc, textId, start);
  });

  it("should not merge MOVE beyond the time window", () => {
    const { editor, doc, textId } = createEditor();
    const start = pos(doc, textId);
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 10, dy: 0 } });
    nextWindow();
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 20, dy: 0 } });
    expectPos(doc, textId, { x: start.x + 30, y: start.y });

    editor.undo();
    expectPos(doc, textId, { x: start.x + 10, y: start.y });
    editor.undo();
    expectPos(doc, textId, start);
  });

  it("should keep merging while commands stay inside the window", () => {
    const { editor, doc, textId, count } = createEditor();
    const start = pos(doc, textId);
    for (let i = 0; i < 10; i++) {
      editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 1, dy: 0 } });
      // 每次只间隔半个时间窗，链路不断开
      jest.advanceTimersByTime(MERGE_GAP / 2);
    }
    expectPos(doc, textId, { x: start.x + 10, y: start.y });
    expect(count()).toBe(1);
  });

  it("should not merge different commands", () => {
    const { editor, doc, textId } = createEditor();
    const start = pos(doc, textId);
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 10, dy: 0 } });
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 10, dy: 0 } });
    // 移位与改尺寸属于不同操作，不能并成一格
    editor.command.execute({
      type: "RESIZE",
      payload: { id: textId, x: 0, y: 0, width: 50, height: 50 },
    });
    expect(editor.canvas.canUndo()).toBe(true);
    editor.undo();
    // 撤销尺寸只回退尺寸，位置仍是两次移动后的结果
    expectPos(doc, textId, { x: start.x + 20, y: start.y });
    editor.undo();
    expectPos(doc, textId, start);
  });

  it("should not merge different targets", () => {
    const { editor, textId, rectId, count } = createEditor();
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 10, dy: 0 } });
    editor.command.execute({ type: "MOVE", payload: { ids: [rectId], dx: 10, dy: 0 } });
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 10, dy: 0 } });
    // 中间插入别的对象，作用对象指纹不同，必须断开
    expect(count()).toBe(3);
  });

  it("should not merge when the selection changes", () => {
    const { editor, textId, rectId, count } = createEditor();
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 10, dy: 0 } });
    // 单选扩成多选，同样不能并入上一格
    editor.command.execute({ type: "MOVE", payload: { ids: [textId, rectId], dx: 10, dy: 0 } });
    expect(count()).toBe(2);
  });

  it("should merge MOVE back to origin and drop the entry", () => {
    const { editor, doc, textId } = createEditor();
    const start = pos(doc, textId);
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 20, dy: 0 } });
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: -20, dy: 0 } });
    expectPos(doc, textId, start);
    // 前后抵消，模块与主栈都不应留下空白格
    expect(editor.canvas.canUndo()).toBe(false);
    expect(editor.history.canUndo()).toBe(false);
    expect(editor.history.canRedo()).toBe(false);
  });

  it("should merge REVISE on the same field", () => {
    const { editor, doc, textId } = createEditor();
    const before = (doc.getNode(textId) as ResumeNode).x;
    // 滑块连续调值：多帧只占一格
    editor.command.execute({ type: "REVISE", payload: { id: textId, attrs: { x: 100 } } });
    editor.command.execute({ type: "REVISE", payload: { id: textId, attrs: { x: 120 } } });
    editor.command.execute({ type: "REVISE", payload: { id: textId, attrs: { x: 140 } } });
    expect((doc.getNode(textId) as ResumeNode).x).toBe(140);
    editor.undo();
    expect((doc.getNode(textId) as ResumeNode).x).toBe(before);
    expect(editor.history.canUndo()).toBe(false);
  });

  it("should keep redo working after merged entries", () => {
    const { editor, doc, textId } = createEditor();
    const start = pos(doc, textId);
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 10, dy: 0 } });
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 10, dy: 0 } });
    editor.undo();
    expectPos(doc, textId, start);
    editor.redo();
    expectPos(doc, textId, { x: start.x + 20, y: start.y });
    editor.redo();
    // redo 栈已空，重复重做不应把合并的那一步再拆开
    expectPos(doc, textId, { x: start.x + 20, y: start.y });
    expect(editor.history.canRedo()).toBe(false);
  });

  it("should not merge across content written after undo", () => {
    const { editor, doc, textId } = createEditor();
    const start = pos(doc, textId);
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 10, dy: 0 } });
    editor.undo();
    expect(editor.history.canRedo()).toBe(true);
    // 撤销后继续操作必须新开一格，并清空 redo
    editor.command.execute({ type: "MOVE", payload: { ids: [textId], dx: 5, dy: 0 } });
    expect(editor.history.canRedo()).toBe(false);
    editor.undo();
    expectPos(doc, textId, start);
  });
});
