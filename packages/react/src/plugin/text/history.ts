import { History } from "@block-kit/core";
import { EDITOR_EVENT } from "@block-kit/core";
import type { Editor as BlockEditor } from "@block-kit/core";

/**
 * 文本块专用的历史模块
 * - 撤销 / 重做统一由画布层 `Key` 调度，这里主动退订内置的快捷键处理
 * - 只摘掉 `KEY_DOWN`，内容变更 / 变更前快照仍由父类负责，文本块自己的栈照常记录
 * - 与空实现不同：不遮蔽父类方法，BlockKit 后续在 `onKeyDown` 内的其它逻辑也不会被误伤
 */
export class TextHistory extends History {
  public constructor(editor: BlockEditor) {
    super(editor);
    // 父类构造时已按 `@Bind` 后的引用订阅，这里用同一个引用精确退订
    this.editor.event.off(EDITOR_EVENT.KEY_DOWN, this.onKeyDown);
  }
}
