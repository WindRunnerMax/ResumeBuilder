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

  it("should route to text module when focus in text block", () => {
    const { editor, module } = createEditor();
    const textModule = new FakeModule();
    Object.assign(textModule, { key: "text", id: "text-1" });
    editor.module.register(textModule);

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

    press({ key: "z", ctrlKey: true });
    expect(textModule.calls).toEqual(["undo"]);
    expect(module.calls).toEqual([]);
  });

  it("should route to the focused text block among many", () => {
    const { editor, module } = createEditor();
    // 模拟文档内多个文本块，每个都有自己的栈
    const first = new FakeModule();
    const second = new FakeModule();
    Object.assign(first, { key: "text", id: "text-1" });
    Object.assign(second, { key: "text", id: "text-2" });
    editor.module.register(first);
    editor.module.register(second);

    const wrapper = (id: string) => {
      const el = document.createElement("div");
      el.setAttribute("data-element-id", id);
      const block = document.createElement("div");
      block.className = "cv-text-block";
      const inner = document.createElement("div");
      inner.tabIndex = -1;
      block.appendChild(inner);
      el.appendChild(block);
      document.body.appendChild(el);
      return inner;
    };
    const firstInner = wrapper("text-1");
    const secondInner = wrapper("text-2");

    secondInner.focus();
    press({ key: "z", ctrlKey: true });
    expect(second.calls).toEqual(["undo"]);
    // 不能被最新注册的实例截胡
    expect(first.calls).toEqual([]);

    firstInner.focus();
    press({ key: "z", ctrlKey: true, shiftKey: true });
    expect(first.calls).toEqual(["redo"]);
    expect(second.calls).toEqual(["undo"]);
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
