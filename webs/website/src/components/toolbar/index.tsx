import type { CommandPayload } from "@re/core";
import { useCommand, useEditor, useSelection } from "@re/react";
import type { FC } from "react";
import React, { useEffect, useState } from "react";

/**
 * 图形工具栏
 * - 位于顶栏中部，单击元素后展示
 * - 按元素类型渲染按钮组，文本元素额外提供「编辑」
 */
export const Toolbar: FC = () => {
  const editor = useEditor();
  const { ids } = useSelection();
  const { execute } = useCommand();
  const [, setTick] = useState(0);
  const primary = ids.length === 1 ? editor.model.get(ids[0]) : null;

  // 元素变化后刷新数值
  useEffect(() => {
    const update = () => setTick(v => v + 1);
    editor.event.on("CONTENT_CHANGE", update);
    return () => editor.event.off("CONTENT_CHANGE", update);
  }, [editor]);

  if (!primary) {
    return <div style={{ flex: 1 }} />;
  }

  const node = primary.data;
  const run = (command: CommandPayload) => execute(command);
  const onChange = (key: "x" | "y" | "width" | "height", value: string) => {
    const num = Number(value);
    if (Number.isNaN(num)) return;
    run({ type: "REVISE", payload: { id: node.id, attrs: { [key]: num } } });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
      <span style={styles.type}>{node.type}</span>
      {(["x", "y", "width", "height"] as const).map(key => (
        <label key={key} style={styles.field}>
          <span style={styles.label}>{LABELS[key]}</span>
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
        style={styles.button}
        onClick={() => {
          run({ type: "DELETE", payload: { ids } });
          editor.selection.clear();
        }}
      >
        删除
      </button>
    </div>
  );
};

/** 属性标签 */
const LABELS = { x: "X", y: "Y", width: "W", height: "H" } as const;

const styles: Record<string, React.CSSProperties> = {
  type: { fontSize: 11, fontWeight: 600, color: "#1664FF", textTransform: "uppercase" },
  field: { display: "flex", alignItems: "center", gap: 4 },
  label: { fontSize: 11, color: "#8A8F99" },
  input: {
    width: 60,
    padding: "2px 6px",
    fontSize: 12,
    border: "1px solid #E4E6EB",
    borderRadius: 4,
    outline: "none",
  },
  primary: {
    padding: "3px 12px",
    fontSize: 12,
    border: "none",
    borderRadius: 4,
    background: "#1664FF",
    color: "#FFFFFF",
    cursor: "pointer",
  },
  button: {
    padding: "3px 12px",
    fontSize: 12,
    border: "1px solid #E4E6EB",
    borderRadius: 4,
    background: "#FFFFFF",
    cursor: "pointer",
  },
};
