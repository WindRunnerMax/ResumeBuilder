import { createDefaultDoc, JSONDocument } from "@re/json";

import { Editor } from "../src/editor";
import { EditorModule } from "../src/module";

/** 记录调用次数的测试模块 */
class FakeModule extends EditorModule {
  public key = "canvas";
  public id = "canvas";
  public calls: string[] = [];
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

/** 派发一次键盘事件 */
const press = (init: KeyboardEventInit): KeyboardEvent => {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  document.dispatchEvent(event);
  return event;
};

describe("Key", () => {
  const createEditor = () => {
    const doc = new JSONDocument(createDefaultDoc());
    const editor = new Editor({ doc });
    const module = new FakeModule();
    editor.module.register(module);
    return { editor, module };
  };

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("should undo without focus in editor", () => {
    const { editor, module } = createEditor();
    editor.history.record("canvas", "node");
    const event = press({ key: "z", ctrlKey: true });
    expect(event.defaultPrevented).toBe(true);
    expect(module.calls).toEqual(["undo"]);
  });

  it("should support meta key", () => {
    const { editor, module } = createEditor();
    editor.history.record("canvas", "node");
    press({ key: "z", metaKey: true });
    expect(module.calls).toEqual(["undo"]);
  });

  it("should redo with shift+z and ctrl+y", () => {
    const { editor, module } = createEditor();
    editor.history.record("canvas", "a");
    editor.history.record("canvas", "b");
    editor.undo();
    editor.undo();
    press({ key: "z", ctrlKey: true, shiftKey: true });
    press({ key: "y", ctrlKey: true });
    expect(module.calls).toEqual(["undo", "undo", "redo", "redo"]);
  });

  it("should always drive the main history regardless of focus", () => {
    const { editor, module } = createEditor();
    // 文本块的栈结构变化已同步成主栈条目，Key 不再按焦点做路由
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-element-id", "text-1");
    const block = document.createElement("div");
    block.className = "cv-text-block";
    const inner = document.createElement("div");
    inner.tabIndex = -1;
    block.appendChild(inner);
    wrapper.appendChild(block);
    document.body.appendChild(wrapper);
    inner.focus();

    editor.history.record("canvas", "node");
    press({ key: "z", ctrlKey: true });
    press({ key: "z", ctrlKey: true, shiftKey: true });
    expect(module.calls).toEqual(["undo", "redo"]);
  });

  it("should prevent native undo outside editor but not act", () => {
    const { module } = createEditor();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    const event = press({ key: "z", ctrlKey: true });
    expect(module.calls).toEqual([]);
    expect(event.defaultPrevented).toBe(true);
  });

  it("should ignore when readonly", () => {
    const { editor, module } = createEditor();
    editor.set("READONLY", true);
    press({ key: "z", ctrlKey: true });
    expect(module.calls).toEqual([]);
  });

  it("should not act after unmount", () => {
    const { editor, module } = createEditor();
    editor.unmount();
    press({ key: "z", ctrlKey: true });
    expect(module.calls).toEqual([]);
  });
});
