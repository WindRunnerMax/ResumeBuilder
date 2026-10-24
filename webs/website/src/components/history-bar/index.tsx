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

  /**
   * 阻止 mousedown 抢走编辑器焦点
   * - 按钮自身与容器都要拦截：撤销 / 重做执行后按钮会变成 disabled，
   *   disabled 元素不接收鼠标事件，双击的第二下会落到容器上
   * @param event 鼠标按下事件
   */
  const preventFocus = (event: React.MouseEvent) => event.preventDefault();

  return (
    <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onMouseDown={preventFocus}>
      <button
        style={{ ...styles.button, opacity: canUndo ? 1 : 0.4 }}
        disabled={!canUndo}
        onMouseDown={preventFocus}
        onClick={undo}
      >
        撤销
      </button>
      <button
        style={{ ...styles.button, opacity: canRedo ? 1 : 0.4 }}
        disabled={!canRedo}
        onMouseDown={preventFocus}
        onClick={redo}
      >
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
