/**
 * 注入脚本注册
 * - 注入脚本需要运行在页面上下文（MAIN world），由 worker 通过 Scripting API 注册
 * - 不在 manifest 中声明 `world`，避免依赖较高版本的 Chrome
 * - 注册后扩展被禁用或移除时，脚本不再注入，页面刷新后标记自然消失
 */

/** 注入脚本的注册 ID，重复注册时用于覆盖 */
const SCRIPT_ID = "cv-pdf-inject";

/** 注入脚本注入到所有匹配的页面 */
const register = () => {
  const file = `${process.env.INJECT_FILE}.js`;
  const ids = [SCRIPT_ID];
  // 安装或更新后可能残留旧脚本，先移除再注册保证幂等
  chrome.scripting.unregisterContentScripts({ ids }, () => {
    // 忽略未注册时的报错
    void chrome.runtime.lastError;
    chrome.scripting.registerContentScripts([
      {
        id: SCRIPT_ID,
        matches: ["https://*/*", "http://*/*", "file://*/*"],
        js: [file],
        runAt: "document_start",
        // 需要在页面上下文中执行，才能向 window 挂载标记
        world: "MAIN",
      },
    ]);
  });
};

export const initializeInject = () => {
  // 安装或更新扩展后，已打开的标签页不会自动注入，需要重新注册
  chrome.runtime.onInstalled.addListener(register);
  chrome.runtime.onStartup.addListener(register);
  // 每次 worker 唤醒时确保注册生效
  register();
};
