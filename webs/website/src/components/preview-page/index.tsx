import type { ResumeDoc } from "@cv/json";
import { createDefaultDoc } from "@cv/json";
import type { FC } from "react";
import React, { useMemo } from "react";

import { ExportPanel } from "../export-panel";
import { PreviewView } from "../preview-view";
import { loadDocument } from "../../utils/storage";
import { HEADER_HEIGHT } from "../../styles/constant";

/**
 * 导出 / 预览页面
 * - 左侧为简历预览，右侧为导出面板
 * - 通过 hash 路由进入：#/preview
 */
export const PreviewPage: FC = () => {
  const doc = useMemo<ResumeDoc>(() => loadDocument() || createDefaultDoc(), []);

  return (
    <div
      className="cv-export"
      style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      <div
        className="cv-header"
        style={{
          height: HEADER_HEIGHT,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          background: "#FFFFFF",
          borderBottom: "1px solid #E4E6EB",
        }}
      >
        <button style={styles.back} onClick={() => (location.hash = "#/")}>
          ← 返回编辑
        </button>
        <span style={{ fontSize: 13, color: "#8A8F99" }}>预览与导出</span>
      </div>
      <div className="cv-export-body" style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div
          className="cv-export-scroll"
          style={{ flex: 1, overflow: "auto", padding: 32, background: "#F5F6F7" }}
        >
          <PreviewView doc={doc} />
        </div>
        <ExportPanel />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  back: {
    padding: "4px 10px",
    fontSize: 13,
    border: "1px solid #E4E6EB",
    borderRadius: 6,
    background: "#FFFFFF",
    cursor: "pointer",
  },
};
