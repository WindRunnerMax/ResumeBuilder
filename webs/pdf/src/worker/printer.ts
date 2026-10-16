import type { CdpExportPdfRequest } from "./types";

/**
 * 通过 CDP `Page.printToPDF` 导出 PDF
 * 使用 `chrome.debugger` 附着到目标 Tab，打印完成后再分离
 * 由于是排版生成，配合 `preferCSSPageSize` 可以保证输出总是保持一页
 * https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-printToPDF
 */
export const exportPdf = (tabId: number, request: CdpExportPdfRequest): Promise<string> => {
  const options = request.payload.options || {};
  return new Promise((resolve, reject) => {
    const target = { tabId };
    const version = "1.3";
    chrome.debugger.attach(target, version, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return void 0;
      }
      const params = {
        printBackground: true,
        preferCSSPageSize: true,
        ...options,
      };
      chrome.debugger.sendCommand(target, "Page.printToPDF", params, result => {
        chrome.debugger.detach(target);
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return void 0;
        }
        const data = result && (result as { data?: string }).data;
        if (!data) {
          reject(new Error("CDP printToPDF: empty data"));
          return void 0;
        }
        resolve(data);
      });
    });
  });
};

/**
 * 将 base64 数据下载为文件
 * service worker 中无法直接使用 URL.createObjectURL，因此借助 downloads API
 */
export const downloadPdf = (base64: string, filename: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const url = `data:application/pdf;base64,${base64}`;
    chrome.downloads.download({ url, filename, saveAs: false }, downloadId => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return void 0;
      }
      resolve(downloadId);
    });
  });
};
