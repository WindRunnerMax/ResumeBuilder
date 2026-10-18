import type { Manifest } from "./types";
import { __URL_MATCH__ } from "./types";

// Chromium
const __MANIFEST__: Manifest = {
  manifest_version: 3,
  name: "CV PDF",
  version: "0.0.0",
  description: "Export Resume as single-page PDF via CDP",
  default_locale: "en",
  icons: {
    32: "static/favicon.128.png",
    96: "static/favicon.128.png",
    128: "static/favicon.128.png",
  },
  background: {
    service_worker: "worker.js",
  },
  permissions: ["activeTab", "tabs", "debugger", "downloads", "scripting"],
  host_permissions: [...__URL_MATCH__],
  // 注入内容脚本，由它转发导出请求
  content_scripts: [
    {
      matches: [...__URL_MATCH__],
      js: ["content.js"],
      run_at: "document_start",
    },
  ],
  // 注入脚本以 MAIN world 由 worker 注册，需要声明为可访问资源
  web_accessible_resources: [
    {
      resources: [`${process.env.INJECT_FILE}.js`],
      matches: ["<all_urls>"],
    },
  ],
  // `chrome.scripting.registerContentScripts` 的 `world: "MAIN"` 需要 Chrome 102+
  // 相比在 manifest 中静态声明 `world`（需要 111+）版本要求更低
  minimum_chrome_version: "102.0",
};

module.exports = __MANIFEST__;
