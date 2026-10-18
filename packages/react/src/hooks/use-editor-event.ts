import type { EventKey, EventMap } from "@re/core";
import { useEffect, useRef } from "react";

import { useEditor } from "./use-editor";

/**
 * 订阅编辑器事件，回调保持最新引用
 * @param key 事件名
 * @param handler 回调
 */
export const useEditorEvent = <T extends EventKey>(
  key: T,
  handler: (payload: EventMap[T]) => void
): void => {
  const editor = useEditor();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const listener = (payload: EventMap[T]) => ref.current(payload);
    editor.event.on(key, listener);
    return () => editor.event.off(key, listener);
  }, [editor, key]);
};
