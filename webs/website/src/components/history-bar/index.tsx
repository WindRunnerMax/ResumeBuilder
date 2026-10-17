import { useCommand, useHistory } from "@cv/react";
import type { FC } from "react";
import React from "react";

/**
 * 历史操作条
 * - 展示撤销/重做状态
 */
export const HistoryBar: FC = () => {
  const { canUndo, canRedo } = useHistory();
  const { undo, redo } = useCommand();

  return (
    <div style={{ display: "flex", gap: 8, padding: "6px 16px", background: "#FFFFFF", borderBottom: "1px solid #E4E6EB" }}>
      <button style={{ ...styles.button, opacity: canUndo ? 1 : 0.4 }} disabled={!canUndo} onClick={undo}>
        撤销
      </button>
      <button style={{ ...styles.button, opacity: canRedo ? 1 : 0.4 }} disabled={!canRedo} onClick={redo}>
        重做
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  button: {
    padding: "4px 12px",
    border: "1px solid #E4E6EB",
    borderRadius: 4,
    background: "#FFFFFF",
    cursor: "pointer",
    fontSize: 13,
  },
};
