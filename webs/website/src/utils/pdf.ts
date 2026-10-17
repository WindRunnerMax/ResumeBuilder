import { mmToInch } from "./paper";

/** 扩展消息类型，与 webs/pdf 保持一致 */
export const CDP_EXPORT_PDF = "CDP_EXPORT_PDF";

/** 扩展导出请求 */
export type CdpExportPdfRequest = {
  type: typeof CDP_EXPORT_PDF;
  payload: {
    options?: {
      paperWidth?: number;
      paperHeight?: number;
      marginTop?: number;
      marginBottom?: number;
      marginLeft?: number;
      marginRight?: number;
      printBackground?: boolean;
      preferCSSPageSize?: boolean;
      scale?: number;
    };
    filename?: string;
  };
};

/** 扩展导出响应 */
export type CdpExportPdfResponse = {
  type: typeof CDP_EXPORT_PDF;
  payload: { success: true } | { success: false; error: string };
};

/** 扩展检测超时 */
const DETECT_TIMEOUT = 1500;

/** 页面导出态属性 */
export const EXPORT_ATTR = "data-export";

/**
 * 是否运行在浏览器扩展环境中
 * - 扩展注入后 `chrome.runtime.id` 存在
 */
export const hasExtension = (): boolean => {
  return typeof chrome !== "undefined" && !!chrome && !!chrome.runtime && !!chrome.runtime.id;
};

/**
 * 探测扩展是否安装
 * - 扩展未注入时不会挂载 `chrome.runtime`
 */
export const detectExtension = (): Promise<boolean> => {
  return new Promise(resolve => {
    if (hasExtension()) return resolve(true);
    const start = Date.now();
    const timer = setInterval(() => {
      if (hasExtension()) {
        clearInterval(timer);
        resolve(true);
        return;
      }
      if (Date.now() - start > DETECT_TIMEOUT) {
        clearInterval(timer);
        resolve(false);
      }
    }, 100);
  });
};

/** 纸张尺寸，单位为毫米 */
export type PaperMm = { width: number; height: number };

/**
 * 通过扩展导出 PDF
 * @param filename 文件名
 * @param paper 纸张毫米尺寸，作为裁剪范围
 */
export const exportPdf = (filename: string, paper: PaperMm): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const runtime = typeof chrome !== "undefined" ? chrome && chrome.runtime : undefined;
    if (!runtime || !runtime.id) {
      reject(new Error("扩展未安装"));
      return;
    }
    const request: CdpExportPdfRequest = {
      type: CDP_EXPORT_PDF,
      payload: {
        filename,
        options: {
          printBackground: true,
          preferCSSPageSize: true,
          paperWidth: mmToInch(paper.width),
          paperHeight: mmToInch(paper.height),
          marginTop: 0,
          marginBottom: 0,
          marginLeft: 0,
          marginRight: 0,
        },
      },
    };
    try {
      runtime.sendMessage(request, response => {
        const error = runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        if (!response) {
          reject(new Error("扩展未响应"));
          return;
        }
        const result = response as CdpExportPdfResponse;
        result.payload.success ? resolve(true) : reject(new Error(result.payload.error));
      });
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
};

/**
 * 等待字体与图片加载完成
 * - 导出前必须确保资源就绪，否则 PDF 会缺内容
 */
export const waitForAssets = async (): Promise<void> => {
  await document.fonts.ready;
  const images = [...document.images];
  await Promise.all(
    images.map(img => (img.complete ? Promise.resolve() : img.decode().catch(() => void 0)))
  );
};

/**
 * 生成供 Agent 使用的 CDP 导出指令
 * - 不依赖 ws 等额外包，使用 CDP 的 HTTP 端点
 * - 让 Agent 直接在已打开页面的 Chrome 上执行
 */
export const createCdpPrompt = (filename: string, paper: PaperMm): string => {
  const printOptions = {
    printBackground: true,
    preferCSSPageSize: true,
    paperWidth: mmToInch(paper.width),
    paperHeight: mmToInch(paper.height),
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
  };
  return `请用 Chrome DevTools Protocol 把当前预览页导出为单页 PDF。

1. 以调试模式启动 Chrome：
   /Applications/Google Chrome.app/Contents/MacOS/Google Chrome \\
     --remote-debugging-port=9222 --user-data-dir=/tmp/cv-chrome "${location.href}"

2. 等待页面渲染完成后执行下面的 Node 脚本（仅用内置模块）：

\`\`\`js
const http = require("http");
const fs = require("fs");

const get = url =>
  new Promise((res, rej) =>
    http.get(url, r => {
      let d = "";
      r.on("data", c => (d += c));
      r.on("end", () => res(JSON.parse(d)));
    }).on("error", rej)
  );

const print = body =>
  new Promise((res, rej) => {
    const req = http.request(
      { host: "127.0.0.1", port: 9222, path: "/json/print", method: "PUT" },
      r => {
        let d = "";
        r.on("data", c => (d += c));
        r.on("end", () => res(d));
      }
    );
    req.on("error", rej);
    req.setHeader("Content-Type", "application/json");
    req.end(JSON.stringify(body));
  });

(async () => {
  const list = await get("http://127.0.0.1:9222/json/list");
  const page = list.find(t => t.type === "page" && t.url.includes(${JSON.stringify(
    location.origin
  )}));
  if (!page) throw new Error("未找到预览页，请确认 URL 正确");

  const base64 = await print({
    printBackground: true,
    preferCSSPageSize: true,
    paperWidth: 8.27,
    paperHeight: 11.69,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    targetId: page.id,
  });

  fs.writeFileSync(${JSON.stringify(filename)}, Buffer.from(base64, "base64"));
  console.log("已导出 ${filename}");
})();
\`\`\`

说明：
- 若 \`/json/print\` 不可用，改用 WebSocket 连接 \`webSocketDebuggerUrl\`，发送 \`Page.printToPDF\`（参数同上：${JSON.stringify(
    printOptions
  )}）。
- 页面在导出时会自动添加 \`body[data-export="pdf"]\`，隐藏面板与滚动条。`;
};
