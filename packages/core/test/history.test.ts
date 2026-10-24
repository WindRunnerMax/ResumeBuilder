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
    const first = history.undo()!;
    const second = history.undo()!;
    expect(first.type).toBe("text");
    expect(second.type).toBe("canvas");
    expect(history.redo()!.type).toBe("canvas");
    expect(history.redo()!.type).toBe("text");
    expect(history.canRedo()).toBe(false);
  });

  it("should follow module merge without adding an entry", () => {
    const history = new History();
    history.record("canvas", "a");
    // 模块把第二次变更并入了栈顶那一格
    history.record("canvas", "a", true);
    history.record("canvas", "a", true);
    expect(history.undo()!.id).toBe("a");
    expect(history.canUndo()).toBe(false);
  });

  it("should refresh top time when merging", () => {
    const history = new History();
    history.record("canvas", "a");
    const before = (history as unknown as { undoStack: { time: number }[] }).undoStack[0].time;
    jest.useFakeTimers();
    jest.setSystemTime(before + 500);
    history.record("canvas", "a", true);
    const after = (history as unknown as { undoStack: { time: number }[] }).undoStack[0].time;
    jest.useRealTimers();
    // 合并不会新增条目，但栈顶时间要刷新，避免下次判断使用过期时间
    expect(after).toBe(before + 500);
    expect(history.undo()!.id).toBe("a");
    expect(history.canUndo()).toBe(false);
  });

  it("should append when merge target mismatches", () => {
    const history = new History();
    history.record("canvas", "a");
    // 栈顶是别的对象，模块不可能合并到它上面，主栈必须照常入栈
    history.record("canvas", "b", true);
    expect(history.undo()!.id).toBe("b");
    expect(history.undo()!.id).toBe("a");
  });

  it("should append when merging an empty stack", () => {
    const history = new History();
    history.record("canvas", "a", true);
    expect(history.canUndo()).toBe(true);
    expect(history.undo()!.id).toBe("a");
  });

  it("should clear redo stack when merging", () => {
    const history = new History();
    history.record("canvas", "a");
    history.undo();
    expect(history.canRedo()).toBe(true);
    // 合并也是新的变更，redo 链必须断开；栈顶为空时退化为入栈
    history.record("canvas", "a", true);
    expect(history.canRedo()).toBe(false);
  });
});
