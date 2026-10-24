import { Delta } from "@block-kit/delta";
import { Editor, EDITOR_EVENT, HISTORY_EFFECT } from "@block-kit/core";

import { TextHistory } from "../src/plugin/text/history";

describe("TextHistory", () => {
  const createEditor = () =>
    new Editor({
      delta: new Delta([{ insert: "内容" }]),
      modules: { History: TextHistory },
    });

  it("should use TextHistory as history module", () => {
    const editor = createEditor();
    expect(editor.history).toBeInstanceOf(TextHistory);
  });

  it("should unsubscribe history KEY_DOWN but keep content listeners", () => {
    const editor = createEditor();
    const history = editor.history as unknown as { onKeyDown: (e: KeyboardEvent) => void };
    const get = (key: string) =>
      (editor.event as unknown as { bus: { listeners: Record<string, Array<{ listener: Function }>> } }).bus
        .listeners[key] || [];
    // History 的快捷键处理已退订，Selection 的方向键处理保留
    expect(get(EDITOR_EVENT.KEY_DOWN).map(item => item.listener)).not.toContain(history.onKeyDown);
    expect(get(EDITOR_EVENT.KEY_DOWN).length).toBeGreaterThan(0);
    // 内容变更监听仍在，文本栈才能记录
    expect(get(EDITOR_EVENT.CONTENT_CHANGE).map(item => item.listener)).toContain(
      (editor.history as unknown as { onContentChange: Function }).onContentChange
    );
    expect(get(EDITOR_EVENT.CONTENT_WILL_CHANGE).length).toBeGreaterThan(0);
  });

  it("should keep text stack working without KEY_DOWN", () => {
    const editor = createEditor();
    // 直接驱动内容变更，模拟输入
    editor.state.apply(new Delta().retain(2).insert("!"), { undoable: true });
    expect(editor.history.isUndoAble()).toBe(true);
  });

  it("should notify effect listeners when stack changes", () => {
    const editor = createEditor();
    const history = editor.history as TextHistory;
    const effects: number[] = [];
    history.subscribe(effect => effects.push(effect));
    editor.state.apply(new Delta().retain(2).insert("!"), { undoable: true });
    // 新开一格，必须有回调
    expect(effects).toEqual([HISTORY_EFFECT.APPEND]);
  });

  it("should stop notifying after unsubscribe", () => {
    const editor = createEditor();
    const history = editor.history as TextHistory;
    const effects: number[] = [];
    const dispose = history.subscribe(effect => effects.push(effect));
    dispose();
    editor.state.apply(new Delta().retain(2).insert("!"), { undoable: true });
    expect(effects).toEqual([]);
  });

  it("should destroy without dangling listeners", () => {
    const editor = createEditor();
    const off = jest.spyOn(editor.event, "off");
    editor.destroy();
    // 父类 destroy 仍能按引用解绑（重复解绑是幂等的）
    expect(off).toHaveBeenCalledWith(EDITOR_EVENT.KEY_DOWN, expect.any(Function));
    off.mockRestore();
  });
});
