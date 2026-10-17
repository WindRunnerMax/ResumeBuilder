import type { Op as DeltaOp } from "@block-kit/delta";
import { Delta } from "@block-kit/delta";
import { Editor, EDITOR_EVENT, LOG_LEVEL } from "@block-kit/core";
import {
  AlignPlugin,
  BackgroundPlugin,
  BoldPlugin,
  BulletListPlugin,
  DividerPlugin,
  FontColorPlugin,
  FontSizePlugin,
  IndentPlugin,
  ItalicPlugin,
  LineHeightPlugin,
  OrderListPlugin,
  Shortcut,
  StrikePlugin,
  UnderlinePlugin,
} from "@block-kit/plugin";

import { PRESET_SHORTCUT } from "./shortcut";

/** 文本块编辑器缓存，按节点 id 索引 */
const EDITORS = new Map<string, Editor>();

/**
 * 创建文本块内部使用的 BlockKit 编辑器
 * @param id 文本节点 id
 * @param ops 初始内容
 */
export const createTextEditor = (id: string, ops: DeltaOp[]): Editor => {
  const exist = EDITORS.get(id);
  if (exist) return exist;
  const editor = new Editor({
    delta: new Delta(ops),
    logLevel: LOG_LEVEL.ERROR,
  });
  editor.plugin.register([
    new BoldPlugin(),
    new ItalicPlugin(),
    new UnderlinePlugin(editor),
    new StrikePlugin(editor),
    new DividerPlugin(editor),
    new LineHeightPlugin(editor),
    new FontSizePlugin(editor),
    new FontColorPlugin(editor),
    new BackgroundPlugin(editor),
    new AlignPlugin(editor),
    new IndentPlugin(editor),
    new OrderListPlugin(editor),
    new BulletListPlugin(editor),
    new Shortcut(editor, PRESET_SHORTCUT),
  ]);
  EDITORS.set(id, editor);
  return editor;
};

/**
 * 销毁文本块编辑器
 * @param id 文本节点 id
 */
export const destroyTextEditor = (id: string): void => {
  const editor = EDITORS.get(id);
  if (!editor) return;
  editor.destroy();
  EDITORS.delete(id);
};

/** 获取已存在的文本编辑器 */
export const getTextEditor = (id: string): Editor | null => {
  return EDITORS.get(id) || null;
};

export { EDITOR_EVENT };
