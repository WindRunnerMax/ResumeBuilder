import type { CommandPayload } from "@cv/core";
import { useCommand, useEditor, useSelection } from "@cv/react";
import type { FC } from "react";
import React, { useEffect, useState } from "react";

/**
 * 图形工具栏
 * - 单击元素后展示，按元素类型渲染不同按钮
 * - 文本元素额外提供「编辑」按钮
 */
export const Toolbar: FC = () => {
  const editor = useEditor();
  const { ids } = useSelection();
  const { execute } = useCommand();
  const [, setTick] = useState(0);
  const primary = ids.length === 1 ? editor.model.get(ids[0]) : null;

  // 元素位置变化后刷新数值
  useEffect(() => {
    const update = () => setTick(v => v + 1);
    editor.event.on("CONTENT_CHANGE", update);
    return () => editor.event.off("CONTENT_CHANGE", update);
  }, [editor]);

  if (!primary) return null;

  const node = primary.data;
  const run = (command: CommandPayload) => execute(command);
  const onChange = (key: "x" | "y" | "width" | "height", value: string) => {
    const num = Number(value);
    if (Number.isNaN(num)) return;
    run({ type: "REVISE", payload: { id: node.id, attrs: { [key]: num } } });
  };

  return (
    <div style={styles.bar}>
      <span style={styles.type}>{node.type}</span>
      {(["x", "y", "width", "height"] as const).map(key => (
        <label key={key} style={styles.field}>
          {key}
          <input
            style={styles.input}
            value={Math.round(node[key])}
            onChange={e => onChange(key, e.target.value)}
          />
        </label>
      ))}
      {node.type === "text" && (
        <button style={styles.primary} onClick={() => editor.mode.enterTextEdit(node.id)}>
          编辑
        </button>
      )}
      <button
        style={styles.danger}
        onClick={() => {
          run({ type: "DELETE", payload: { ids } });
          editor.selection.clear();
        }}
      >
        删除
      </button>
      <span style={{ flex: 1 }} />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "8px 16px",
    background: "#FFFFFF",
    borderBottom: "1px solid #E4E6EB",
    fontSize: 13,
  },
  type: { fontWeight: 600, textTransform: "uppercase", fontSize: 12, color: "#1664FF" },
  field: { display: "flex", alignItems: "center", gap: 4, color: "#5F6672" },
  input: { width: 64, padding: "2px 6px", border: "1px solid #E4E6EB", borderRadius: 4 },
  primary: {
    padding: "4px 12px",
    border: "none",
    borderRadius: 4,
    background: "#1664FF",
    color: "#FFFFFF",
    cursor: "pointer",
  },
  danger: {
    padding: "4px 12px",
    border: "1px solid #E4E6EB",
    borderRadius: 4,
    background: "#FFFFFF",
    cursor: "pointer",
  },
};
