/** 编辑页路由 */
export const EDITOR_ROUTE = "#/";

/** 预览导出页路由 */
export const EXPORT_ROUTE = "#/preview";

/** 预览页窗口名 */
export const EXPORT_WINDOW_NAME = "cv-export";

/**
 * 在新标签页打开预览导出页
 * - 复用同名窗口，重复点击不会叠加标签
 */
export const openExportPage = (): void => {
  const url = `${location.origin}${location.pathname}${EXPORT_ROUTE}`;
  const win = window.open(url, EXPORT_WINDOW_NAME);
  win && win.focus();
};

/** 返回编辑页 */
export const backToEditor = (): void => {
  window.close();
};
