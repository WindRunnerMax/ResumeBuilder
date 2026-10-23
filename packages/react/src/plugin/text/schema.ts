import type { EditorSchema } from "@block-kit/core";

/**
 * 文本块编辑器 Schema
 * - 完全自定义，未声明的字符 Op 属性不会被识别，也不会被 mark 追踪
 * - mark: 输入时会自动追踪样式
 * - mark + inline: 不追踪末尾 Mark
 * - void: 独占一行且不可编辑的节点
 * - block + void: 如 divider，作为块级不可编辑节点
 * - align / heading / quote 属于 EOL 行属性，不走字符 Op 的 mark 判定
 */
export const SCHEMA: EditorSchema = {
  "bold": { mark: true },
  "italic": { mark: true },
  "underline": { mark: true },
  "strike": { mark: true },
  "inline-code": { mark: true, inline: true },
  "link": { mark: true, inline: true },
  "link-blank": { mark: true, inline: true },
  "color": { mark: true },
  "font-size": { mark: true },
  "background": { mark: true },
  "image": { block: true, void: true },
  "mention": { void: true, inline: true },
  "divider": { block: true, void: true },
  "emoji": { void: true, inline: true },
  "align": { block: true },
};
