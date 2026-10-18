export type Manifest = {
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json
  manifest_version: number;
  name: string;
  version: string;
  description: string;
  default_locale: string;
  icons: Record<number, string>;
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background
  background: {
    service_worker: string;
  };
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions
  permissions: string[];
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/host_permissions
  host_permissions: string[];
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_scripts
  content_scripts: Array<{
    matches: string[];
    js: string[];
    run_at?: string;
  }>;
  web_accessible_resources: Array<{
    resources: string[];
    matches: string[];
  }>;
  minimum_chrome_version: string;
};

// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns
export const __URL_MATCH__ = ["https://*/*", "http://*/*", "file://*/*"];

/**
 * 允许页面直接访问 `chrome.runtime` 的站点
 * - `externally_connectable.matches` 不允许通配符域名，必须写成具体站点
 * - 需要新增部署域名时在此追加
 */
export const __EXTERNAL_MATCH__ = [
  "http://localhost/*",
  "http://127.0.0.1/*",
  "https://windrunnermax.github.io/*",
];
