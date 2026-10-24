import { History } from "../src/history";

describe("History", () => {
  it("should record entry with type/id/time", () => {
    const history = new History();
    history.record("canvas", "node-1");
    history.record("canvas", "node-2");
    const entry = history.undo()!;
    expect(entry.type).toBe("canvas");
    expect(entry.id).toBe("node-2");
    expect(typeof entry.time).toBe("number");
    expect(entry.time).toBeGreaterThan(0);
    expect(entry.time).toBeLessThanOrEqual(Date.now());
  });

  it("should pop undo and push redo", () => {
    const history = new History();
    history.record("canvas", "a");
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    const entry = history.undo()!;
    expect(entry.id).toBe("a");
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);
  });

  it("should restore entry on redo", () => {
    const history = new History();
    history.record("canvas", "a");
    history.undo();
    const entry = history.redo()!;
    expect(entry.id).toBe("a");
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
  });

  it("should clear redo stack on new record", () => {
    const history = new History();
    history.record("canvas", "a");
    history.undo();
    expect(history.canRedo()).toBe(true);
    history.record("canvas", "b");
    expect(history.canRedo()).toBe(false);
  });

  it("should return null on empty stack", () => {
    const history = new History();
    expect(history.undo()).toBeNull();
    expect(history.redo()).toBeNull();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });

  it("should limit stack size to 200", () => {
    const history = new History();
    for (let i = 0; i < 201; i++) {
      history.record("canvas", `node-${i}`);
    }
    let count = 0;
    let last: string | null = null;
    while (history.canUndo()) {
      last = history.undo()!.id;
      count += 1;
    }
    // 第 201 条入栈后丢弃最旧的一条
    expect(count).toBe(200);
    // 最后弹出的是最早保留的那条
    expect(last).toBe("node-1");
  });

  it("should clear both stacks", () => {
    const history = new History();
    history.record("canvas", "a");
    history.undo();
    history.clear();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });

  it("should restore entries in order when undo then redo", () => {
    const history = new History();
    history.record("canvas", "a");
    history.record("canvas", "b");
    history.undo();
    history.undo();
    // 主栈与模块栈一一对应，redo 按撤销的逆序回弹
    expect(history.redo()!.id).toBe("a");
    expect(history.redo()!.id).toBe("b");
    expect(history.canRedo()).toBe(false);
    expect(history.canUndo()).toBe(true);
  });

  it("should not merge undo across different types", () => {
    const history = new History();
    history.record("canvas", "a");
    history.record("text", "b");
    let first = history.undo()!;
    let second = history.undo()!;
    expect(first.type).toBe("text");
    expect(second.type).toBe("canvas");
    expect(history.redo()!.type).toBe("canvas");
    expect(history.redo()!.type).toBe("text");
    expect(history.canRedo()).toBe(false);
  });
});
