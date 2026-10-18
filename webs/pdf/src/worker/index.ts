import { downloadPdf, exportPdf } from "./printer";
import { initializeInject } from "./inject";
import type { RequestType, ResponseType } from "./types";
import { CDP_EXPORT_PDF } from "./types";

initializeInject();

const DEFAULT_FILENAME = "resume.pdf";

/**
 * 执行导出，返回给页面响应的结果
 * @param tabId 当前页面 tab
 * @param request 导出请求
 */
const onExportPdf = async (tabId: number, request: RequestType): Promise<ResponseType> => {
  try {
    const base64 = await exportPdf(tabId, request);
    await downloadPdf(base64, request.payload.filename || DEFAULT_FILENAME);
    return { type: CDP_EXPORT_PDF, payload: { success: true } };
  } catch (error) {
    return {
      type: CDP_EXPORT_PDF,
      payload: { success: false, error: (error as Error).message },
    };
  }
};

chrome.runtime.onMessage.addListener((request: RequestType, sender, sendResponse) => {
  const tabId = sender.tab && sender.tab.id;
  if (typeof tabId !== "number") return void 0;
  switch (request.type) {
    case CDP_EXPORT_PDF: {
      // 通过 sendResponse 直接回传结果，content script 转发给页面
      onExportPdf(tabId, request).then(result => {
        sendResponse(result);
      });
      // 保持消息通道以便异步响应
      return true;
    }
    default:
      return void 0;
  }
});
