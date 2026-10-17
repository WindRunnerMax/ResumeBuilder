import type { FC } from "react";
import React, { useEffect, useMemo, useState } from "react";

import { createCdpPrompt, detectExtension, exportPdf, hasExtension, waitForAssets } from "../../utils/pdf";
import { toPaperMm } from "../../utils/paper";
import { loadDocument } from "../../utils/storage";

/** 导出状态 */
type Status = "idle" | "exporting" | "done" | "error";

/** 导出面板 */
export const ExportPanel: FC = () => {
  const [filename, setFilename] = useState("resume.pdf");
  const [installed, setInstalled] = useState(hasExtension());
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [copyResult, setCopyResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    detectExtension().then(setInstalled);
  }, []);

  // 纸张尺寸即导出的裁剪范围
  const paper = useMemo(() => {
    const doc = loadDocument();
    const page = doc && doc.nodes[doc.root];
    return toPaperMm(page && page.type === "page" ? page.size : "A4");
  }, []);

  /**
   * 导出：切到导出态 → 等资源 → 发消息 → 还原
   */
  const onExport = async () => {
    if (!installed) return;
    setStatus("exporting");
    setMessage("");
    document.body.setAttribute("data-export", "pdf");
    try {
      await waitForAssets();
      await exportPdf(filename || "resume.pdf", paper);
      setStatus("done");
      setMessage("已开始下载");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      document.body.removeAttribute("data-export");
    }
  };

  /** 生成给 Agent 的 CDP 指令并写入剪贴板 */
  const onCopyPrompt = async () => {
    const text = createCdpPrompt(filename || "resume.pdf", paper);
    try {
      await navigator.clipboard.writeText(text);
      setCopyResult({ ok: true, text: "已复制到剪贴板，可直接粘贴给 Agent" });
    } catch {
      setCopyResult({ ok: false, text: "复制失败，请检查浏览器剪贴板权限" });
    }
  };

  return (
    <div
      className="cv-export-panel"
      style={{
        width: 320,
        flexShrink: 0,
        background: "#FFFFFF",
        borderLeft: "1px solid #E4E6EB",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        overflow: "auto",
      }}
    >
      <Section title="导出 PDF">
        <Field label="文件名">
          <input
            value={filename}
            onChange={e => setFilename(e.target.value)}
            style={styles.input}
            placeholder="resume.pdf"
          />
        </Field>
        <div style={styles.hint}>
          导出为 A4 单页矢量 PDF，文字可选中、可检索。内容超出纸张的部分会被裁切。
        </div>
        <button
          style={{ ...styles.primary, opacity: installed ? 1 : 0.45 }}
          disabled={!installed || status === "exporting"}
          onClick={onExport}
        >
          {status === "exporting" ? "正在导出..." : "导出 PDF"}
        </button>
        {message && (
          <div
            style={{
              ...styles.message,
              color: status === "error" ? "#D92D20" : status === "done" ? "#079455" : "#5F6672",
            }}
          >
            {message}
          </div>
        )}
      </Section>

      <Section title="浏览器扩展">
        {installed ? (
          <div style={styles.ok}>已检测到导出扩展 (CV PDF)，可直接导出。</div>
        ) : (
          <div style={styles.warn}>
            <div style={{ fontWeight: 500, marginBottom: 6 }}>未检测到导出扩展</div>
            <div style={{ lineHeight: 1.7 }}>
              PDF 通过扩展的 CDP 能力生成，需先安装 <b>CV PDF</b> 扩展：
              <ol style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                <li>
                  在项目根目录执行 <code style={styles.code}>pnpm build:pdf</code>
                </li>
                <li>打开 chrome://extensions 并开启「开发者模式」</li>
                <li>
                  点击「加载已解压的扩展程序」，选择{" "}
                  <code style={styles.code}>webs/pdf/build</code>
                </li>
                <li>刷新本页面</li>
              </ol>
            </div>
          </div>
        )}
      </Section>

      <Section title="没有扩展？用 Agent 导出">
        <div style={styles.hint}>
          可以复制下面的 CDP 指令交给 Agent，由它直接调用 Chrome DevTools Protocol
          完成导出。
        </div>
        <button style={styles.secondary} onClick={onCopyPrompt}>
          复制 CDP 指令
        </button>
        {copyResult && (
          <div style={{ ...styles.message, color: copyResult.ok ? "#079455" : "#D92D20" }}>
            {copyResult.text}
          </div>
        )}
      </Section>
    </div>
  );
};

/** 分区 */
const Section: FC<{ title: string; children?: React.ReactNode }> = props => (
  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ fontSize: 13, fontWeight: 600 }}>{props.title}</div>
    {props.children}
  </div>
);

/** 表单行 */
const Field: FC<{ label: string; children?: React.ReactNode }> = props => (
  <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "#5F6672" }}>
    {props.label}
    {props.children}
  </label>
);

const styles: Record<string, React.CSSProperties> = {
  input: {
    padding: "6px 10px",
    fontSize: 13,
    border: "1px solid #E4E6EB",
    borderRadius: 6,
    outline: "none",
  },
  primary: {
    padding: "8px 12px",
    fontSize: 13,
    border: "none",
    borderRadius: 6,
    background: "#1664FF",
    color: "#FFFFFF",
    cursor: "pointer",
  },
  secondary: {
    padding: "8px 12px",
    fontSize: 13,
    border: "1px solid #E4E6EB",
    borderRadius: 6,
    background: "#FFFFFF",
    cursor: "pointer",
  },
  hint: { fontSize: 12, color: "#8A8F99", lineHeight: 1.7 },
  message: { fontSize: 12 },
  ok: { fontSize: 12, color: "#079455", lineHeight: 1.7 },
  warn: {
    fontSize: 12,
    color: "#B54708",
    background: "#FFFAEB",
    border: "1px solid #FEDF89",
    borderRadius: 6,
    padding: "10px 12px",
  },
  code: {
    fontFamily: "Menlo, monospace",
    fontSize: 11,
    background: "#F5F6F7",
    padding: "1px 4px",
    borderRadius: 3,
  },
};
