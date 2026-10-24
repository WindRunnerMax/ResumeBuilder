import { History } from "@block-kit/core";
import { EDITOR_EVENT } from "@block-kit/core";
import { Bind } from "@block-kit/utils";
import type { ContentChangeEvent, Editor as BlockEditor, HistoryEffect } from "@block-kit/core";

/** 文本栈结构变化的回调 */
export type TextHistoryListener = (effect: HistoryEffect) => void;

/**
 * 文本块专用的历史模块
 * - 撤销 / 重做统一由画布层 `Key` 调度，这里主动退订内置的快捷键处理
 * - 只摘掉 `KEY_DOWN`，内容变更 / 变更前快照仍由父类负责，文本块自己的栈照常记录
 * - 与空实现不同：不遮蔽父类方法，BlockKit 后续在 `onKeyDown` 内的其它逻辑也不会被误伤
 * - 覆写 `onContentChange` 并把父类返回值 `HistoryEffect` 抛给外部，
 *   供画布主栈同步同一条时间线
 */
export class TextHistory extends History {
  /** 栈结构发生变化时的监听，由文本块注册 */
  private listeners: TextHistoryListener[] = [];

  public constructor(editor: BlockEditor) {
    super(editor);
    // 父类构造时已按 `@Bind` 后的引用订阅，这里用同一个引用精确退订
    this.editor.event.off(EDITOR_EVENT.KEY_DOWN, this.onKeyDown);
  }

  /**
   * 订阅栈结构变化
   * @param listener 回调
   * @returns 取消订阅
   */
  public subscribe(listener: TextHistoryListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(item => item !== listener);
    };
  }

  /**
   * 处理内容变更事件
   * - 必须带 `@Bind`：父类构造函数会读取 `this.onContentChange` 注册到事件总线，
   *   若改成箭头函数字段，字段初始化在 `super()` 之后，父类注册的会是父类实现
   * - `super` 访问走父类原型 getter，只会把父类实现绑定到实例，
   *   不影响事件总线上已注册的子类引用
   * @param event 内容变更事件
   * @returns 本次变更对撤销栈造成的效果
   */
  @Bind
  protected override onContentChange(event: ContentChangeEvent): HistoryEffect {
    const effect = super.onContentChange(event);
    this.listeners.forEach(listener => listener(effect));
    return effect;
  }
}
