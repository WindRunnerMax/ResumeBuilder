import type { ResumeDoc } from "@cv/json";
import { createDefaultDoc } from "@cv/json";
import type { FC } from "react";
import React, { useEffect, useMemo } from "react";

import { ExportPanel } from "../export-panel";
import { PreviewView } from "../preview-view";
import { backToEditor } from "../../utils/constant";
import { toPaperMm } from "../../utils/paper";
import { loadDocument } from "../../utils/storage";

/** 保留一位小数 */
const round = (value: number) => Math.round(value * 10) / 10;

/** 当前是否处于自动打印模式，URL 带 `?print=1` */
const isPrintMode = (): boolean => {
  const index = location.href.indexOf("?");
  const hash = location.href.indexOf("#", index + 1);
  const query = index > -1 ? location.href.slice(index + 1, hash > -1 ? hash : undefined) : "";
  return new URLSearchParams(query).get("print") === "1";
};

/**
 * 导出 / 预览页面
 * - 左侧为简历预览，右侧为导出面板
 * - 由编辑页 window.open 打开，独立标签页
 */
export const PreviewPage: FC = () => {
  const doc = useMemo<ResumeDoc>(() => loadDocument() || createDefaultDoc(), []);
  const page = doc.nodes[doc.root];
  const paper = page && page.type === "page" ? page.size : "A4";
  const mm = toPaperMm(paper);

  // 自动打印模式：直接进入导出态，只保留纸张，供 headless Chrome 命令行打印
  useEffect(() => {
    if (!isPrintMode()) return;
    document.body.setAttribute("data-export", "pdf");
  }, []);

  // 导出裁剪范围跟随纸张尺寸，随页面一起写入 @page
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-cv-page", "true");
    style.textContent = `@page { size: ${mm.width}mm ${mm.height}mm; margin: 0; }`;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [mm.width, mm.height]);

  return (
    <div className="cv-export">
      <div className="cv-header-root">
        <div className="cv-header-left">
          <span className="cv-header-title">预览与导出</span>
          <span className="cv-header-meta">
            {typeof paper === "string" ? paper : "自定义"} · {round(mm.width)} × {round(mm.height)} mm
          </span>
        </div>
        <div className="cv-header-right">
          <button className="cv-header-btn" onClick={backToEditor}>
            关闭
          </button>
        </div>
      </div>
      <div className="cv-export-body">
        <div className="cv-export-scroll">
          <PreviewView doc={doc} />
        </div>
        <ExportPanel />
      </div>
    </div>
  );
};
