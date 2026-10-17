import { useEditor, useSelection } from "@cv/react";
import type { FC } from "react";
import React from "react";

import { PANEL_WIDTH } from "../../styles/constant";

/**
 * 右侧面板
 * - 展示当前选中元素的属性
 */
export const RightPanel: FC = () => {
  const editor = useEditor();
  const { ids } = useSelection();
  const state = ids.length === 1 ? editor.model.get(ids[0]) : null;

  return (
    <div
      style={{
        width: PANEL_WIDTH,
        flexShrink: 0,
        background: "#FFFFFF",
        borderLeft: "1px solid #E4E6EB",
        padding: 12,
        overflow: "auto",
      }}
    >
      <div style={{ fontSize: 12, color: "#8A8F99", margin: "4px 4px 12px" }}>属性</div>
      {!state && <div style={{ fontSize: 12, color: "#B0B4BC", padding: "0 4px" }}>未选中元素</div>}
      {state && (
        <div style={{ fontSize: 12, color: "#5F6672", display: "grid", gap: 8 }}>
          <Row label="类型" value={state.type} />
          <Row label="X" value={Math.round(state.data.x)} />
          <Row label="Y" value={Math.round(state.data.y)} />
          <Row label="宽" value={Math.round(state.data.width)} />
          <Row label="高" value={Math.round(state.data.height)} />
        </div>
      )}
    </div>
  );
};

/** 属性行 */
const Row: FC<{ label: string; value: string | number }> = props => (
  <div style={{ display: "flex", justifyContent: "space-between" }}>
    <span style={{ color: "#8A8F99" }}>{props.label}</span>
    <span>{props.value}</span>
  </div>
);
