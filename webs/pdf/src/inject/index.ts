/**
 * 安装标记
 * - 由 worker 通过 Scripting API 以 MAIN world 注入，运行在页面上下文中
 * - 只做一件事：在 `window` 上挂一个全局变量，页面据此判断扩展已安装
 * - 扩展被禁用或移除后不再注入，刷新页面后标记自然消失
 * - MAIN world 中无法访问 `chrome.runtime`，因此只放标记本身
 */

/** 页面侧检测用的全局变量名 */
export const MARKER = "__CV_PDF__";

if (!(MARKER in window)) {
  Object.defineProperty(window, MARKER, {
    value: true,
    // 不可写，避免被页面脚本覆盖
    writable: false,
  });
}
