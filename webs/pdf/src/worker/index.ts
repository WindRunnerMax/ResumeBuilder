import { downloadPdf, exportPdf } from "./printer";
import type { RequestType } from "./types";
import { CDP_EXPORT_PDF } from "./types";

const DEFAULT_FILENAME = "resume.pdf";

const onExportPdf = async (tabId: number, request: RequestType) => {
  try {
    const base64 = await exportPdf(tabId, request);
    await downloadPdf(base64, request.payload.filename || DEFAULT_FILENAME);
    const response = { type: CDP_EXPORT_PDF, payload: { success: true } } as const;
    chrome.tabs.sendMessage(tabId, response);
  } catch (error) {
    const response = {
      type: CDP_EXPORT_PDF,
      payload: { success: false, error: (error as Error).message },
    } as const;
    chrome.tabs.sendMessage(tabId, response);
  }
};

chrome.runtime.onMessage.addListener((request: RequestType, sender, sendResponse) => {
  const tabId = sender.tab && sender.tab.id;
  if (typeof tabId !== "number") return void 0;
  switch (request.type) {
    case CDP_EXPORT_PDF: {
      onExportPdf(tabId, request).then(() => {
        sendResponse({ success: true });
      });
      // 保持消息通道以便异步响应
      return true;
    }
    default:
      return void 0;
  }
});
