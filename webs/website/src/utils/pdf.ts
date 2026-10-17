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
 * 生成交给 Agent 使用的导出提示词
 * - 纯 headless Chrome 命令行，不依赖 Node / Python / ws 等任何运行时或第三方包
 * - 简历数据存在浏览器 localStorage 中，需要复用用户 profile 才能读到真实草稿
 * - 预览页带 `?print=1` 时自动进入导出态，只渲染纸张，配合 `--no-pdf-header-footer` 输出单页
 * @param filename 输出文件名
 * @param paper 纸张毫米尺寸
 */
export const createCdpPrompt = (filename: string, paper: PaperMm): string => {
  const chrome = `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`;
  const width = paper.width.toFixed(2);
  const height = paper.height.toFixed(2);
  const printUrl = (() => {
    const base = location.href.split("?")[0].split("#")[0];
    return `${base}?print=1#/preview`;
  })();
  return `请把下面的页面导出成单页 PDF，文件名 ${filename}。

页面：${printUrl}
纸张：${width} × ${height} mm

背景：简历数据保存在浏览器的 localStorage 中，headless 实例若使用全新的临时 profile，
读不到任何草稿，只会打印出默认示例内容。所以必须先复用用户浏览器的 profile 数据。

要求：
- 只用命令行完成，不安装任何依赖（不需要 Node、Python、ws、puppeteer），不连接调试端口。
- 所有不确定的地方都要先询问用户，不要自己猜。
- 最后确认 ${filename} 已生成且大小大于 0。

步骤一，探测用户浏览器与 profile（这一步必须真实执行命令，不能凭默认值假设）：

\`\`\`bash
# 列出所有存在且有实际数据的 Local Storage 目录
for d in "$HOME/Library/Application Support/Google/Chrome/"*/ \\
         "$HOME/Library/Application Support/Microsoft Edge/"*/ \\
         "$HOME/Library/Application Support/BraveSoftware/Brave-Browser/"*/; do
  [ -d "$d/Local Storage/leveldb" ] || continue
  size=$(du -sk "$d/Local Storage" | cut -f1)
  [ "$size" -gt 0 ] && echo "$size KB  $d"
done
\`\`\`

- 体积为 0 的目录（例如 \`Guest Profile\`、\`System Profile\`）直接忽略，它们不算候选。
- 过滤后只剩一个候选，就直接使用它。
- 过滤后仍有多个候选（例如 \`Default\`、\`Profile 1\`、\`Profile 2\`），无法确定用户在哪个 profile 里编辑过简历时，
  必须停下来询问用户，例如：「检测到多个浏览器 profile，请问你是在哪一个里打开的这个页面？」
  不要用文件修改时间等启发式规则擅自选择。
- 一个候选都没有，或者用户使用的不是 Chrome / Edge / Brave，
  也要询问用户：用的是哪个浏览器、profile 目录在哪里。

步骤二，把这些 profile 下的 localStorage 复制到临时目录（只复制 Local Storage，不要复制整个 profile）：

\`\`\`bash
PROFILE="<步骤一确认的 profile 路径，例如 $HOME/Library/Application Support/Google/Chrome/Default>"
TMP_PROFILE=/tmp/cv-export-profile
rm -rf "$TMP_PROFILE"
mkdir -p "$TMP_PROFILE/Default"
cp -R "$PROFILE/Local Storage" "$TMP_PROFILE/Default/"
\`\`\`

步骤三，用临时 profile 以 headless 方式打印：

\`\`\`bash
${chrome} \\
  --headless \\
  --disable-gpu \\
  --no-sandbox \\
  --no-pdf-header-footer \\
  --user-data-dir="$TMP_PROFILE" \\
  --print-to-pdf="${filename}" \\
  "${printUrl}"

ls -l "${filename}"
\`\`\`

步骤四，立即删除临时目录（里面包含用户所有站点的 localStorage，不能保留）：

\`\`\`bash
rm -rf /tmp/cv-export-profile
\`\`\`

说明：
- URL 中的 \`?print=1\` 会让预览页直接进入导出态，只保留简历纸张、隐藏所有界面元素；漏掉该参数会打印出整套 UI。
- 页面已声明 \`@page { size: ${width}mm ${height}mm; margin: 0 }\`，输出按原尺寸裁切且始终一页。
- \`--no-pdf-header-footer\` 去掉页眉页脚，PDF 中只有简历内容。
- 如果打印结果是空白或内容明显不是用户自己的简历（例如只有一行示例标题），说明 profile 选错了或数据没复制成功，
  重新执行步骤一确认，必要时询问用户，而不要直接交付结果。
- 如果 ${filename} 为空或大小为 0，先检查 Chrome 是否还在使用该 profile，必要时在命令前加 \`sleep 3\` 重试。`;
};
