/**
 * 内容脚本
 * - 转发页面发来的导出请求到后台 worker，再把结果回传
 * - 安装检测由 `marker`（MAIN world）负责，这里不再做握手
 */

/** 页面与扩展的消息类型 */
export const RELAY_REQUEST = "CV_PDF_REQUEST";
export const RELAY_RESPONSE = "CV_PDF_RESPONSE";

/** 扩展与脚本之间的通道标识，避免与页面其他消息冲突 */
const CHANNEL = "__cv_pdf__";

/**
 * 转发页面的导出请求到后台 worker
 * - 结果再通过 postMessage 回传给页面
 */
window.addEventListener("message", event => {
  const data = event.data;
  if (event.source !== window || !data || data.channel !== CHANNEL) return;
  if (data.type !== RELAY_REQUEST) return;
  chrome.runtime.sendMessage(data.payload, response => {
    const error = chrome.runtime.lastError;
    window.postMessage(
      {
        channel: CHANNEL,
        type: RELAY_RESPONSE,
        requestId: data.requestId,
        error: error ? error.message : undefined,
        response,
      },
      "*"
    );
  });
});
