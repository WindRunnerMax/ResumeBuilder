import type { EventKey } from "@cv/core";
import { useEffect, useState } from "react";

import { useEditor } from "./use-editor";

/**
 * 订阅编辑器事件并返回派生值
 * @param key 事件名
 * @param getValue 派生函数
 * @param deps 依赖
 */
export const useEventValue = <T>(key: EventKey, getValue: () => T, deps: unknown[] = []): T => {
  const editor = useEditor();
  const [value, setValue] = useState<T>(getValue);
  useEffect(() => {
    const update = () => setValue(getValue());
    update();
    editor.event.on(key, update);
    return () => editor.event.off(key, update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, key, ...deps]);
  return value;
};
