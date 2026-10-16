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
  minimum_chrome_version: string;
};

// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns
export const __URL_MATCH__ = ["https://*/*", "http://*/*", "file://*/*"];
