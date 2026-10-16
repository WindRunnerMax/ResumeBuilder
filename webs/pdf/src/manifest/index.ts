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
  permissions: ["activeTab", "tabs", "debugger", "downloads"],
  host_permissions: [...__URL_MATCH__],
  minimum_chrome_version: "88.0",
};

module.exports = __MANIFEST__;
