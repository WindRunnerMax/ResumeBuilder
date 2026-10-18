import { useCommand, useHistory } from "@re/react";
import type { FC } from "react";
import React from "react";

/**
 * 历史操作
 * - 撤销 / 重做
 */
export const HistoryBar: FC = () => {
  const { canUndo, canRedo } = useHistory();
  const { undo, redo } = useCommand();

  return (
    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
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
    padding: "3px 12px",
    fontSize: 12,
    border: "1px solid #E4E6EB",
    borderRadius: 4,
    background: "#FFFFFF",
    cursor: "pointer",
  },
};
