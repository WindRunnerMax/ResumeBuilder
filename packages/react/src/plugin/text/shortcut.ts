import type { ShortcutFunc, ShortcutFuncMap } from "@block-kit/plugin";
import { KEY_CODE } from "@block-kit/utils";

/**
 * Enter 换行
 * - BlockKit 默认不处理 Enter，需要自己注册
 * - Shift + Enter 与 Enter 一致，都插入换行
 */
const LINE_BREAK: ShortcutFunc = (event, payload) => {
  if (event.keyCode !== KEY_CODE.ENTER && event.key !== "Enter") return;
  const { editor, sel } = payload;
  if (!sel) return;
  editor.perform.insertBreak(sel);
  event.preventDefault();
  return true;
};

/**
 * 文本编辑器快捷键
 * - 只保留常用项，避免与画布快捷键冲突
 * - 对象的 key 仅用于去重，与按键本身无关
 */
export const PRESET_SHORTCUT: ShortcutFuncMap = {
  LINE_BREAK,
};