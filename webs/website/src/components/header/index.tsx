import type { FC } from "react";
import React from "react";

import { HistoryBar } from "../history-bar";
import { Toolbar } from "../toolbar";
import { HEADER_HEIGHT } from "../../styles/constant";

/**
 * 顶栏
 * - 左侧为产品名，中间为元素工具栏，右侧为历史操作
 */
export const Header: FC = () => {
  return (
    <div
      style={{
        height: HEADER_HEIGHT,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        background: "#FFFFFF",
        borderBottom: "1px solid #E4E6EB",
        padding: "0 16px",
        gap: 16,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 0.2, flexShrink: 0 }}>
        Resume Builder
      </div>
      <Toolbar />
      <HistoryBar />
      <button
        style={{
          padding: "4px 14px",
          fontSize: 12,
          border: "none",
          borderRadius: 4,
          background: "#1664FF",
          color: "#FFFFFF",
          cursor: "pointer",
          flexShrink: 0,
        }}
        onClick={() => (location.hash = "#/preview")}
      >
        预览导出
      </button>
    </div>
  );
};
