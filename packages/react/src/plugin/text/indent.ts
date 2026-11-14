import type { Editor } from "@block-kit/core";
import { INDENT_LEVEL_KEY, IndentPlugin } from "@block-kit/plugin";
import type { ReactLineContext } from "@block-kit/react";

/** 每一级缩进对应的左侧留白（默认插件为 25px） */
export const INDENT_PADDING = 17;

/**
 * 自定义缩进插件
 * - 继承内置的 `IndentPlugin`，仅收窄每一级缩进对应的 `paddingLeft`
 * - 其余行为（Tab / Shift+Tab 增减缩进、缩进层级上限等）保持与内置插件一致
 */
export class TextIndentPlugin extends IndentPlugin {
  /** @param editor 编辑器实例 */
  public constructor(editor: Editor) {
    super(editor);
  }

  /**
   * 渲染行缩进
   * @param context 行渲染上下文
   */
  public override renderLine(context: ReactLineContext) {
    const attrs = context.attributes;
    const level = Number(attrs[INDENT_LEVEL_KEY]);
    if (!isNaN(level)) {
      context.style.paddingLeft = `${level * INDENT_PADDING}px`;
    }
    return context.children;
  }
}
