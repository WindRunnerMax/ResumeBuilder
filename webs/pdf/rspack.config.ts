import type { Configuration } from "@rspack/cli";
import path from "path";
import { FilesPlugin } from "./script/files/index.ts";
import { InjectFilePlugin } from "./script/inject/index.ts";
import { ManifestPlugin } from "./script/manifest/index.ts";
import { ReloadPlugin } from "./script/reload/index.ts";
import { INJECT_ENTRY } from "./script/utils/constant.ts";
import { getUniqueId, IS_DEV } from "./script/utils/node.ts";

const EVENT_TYPE = IS_DEV ? "EVENT_TYPE" : getUniqueId();
// 注入脚本使用随机文件名，避免与页面上的脚本命名冲突，开发时固定便于定位
const INJECT_FILE = IS_DEV ? "INJECT_FILE" : getUniqueId();

process.env.EVENT_TYPE = EVENT_TYPE;
process.env.INJECT_FILE = INJECT_FILE;

/**
 * @type {import("@rspack/cli").Configuration}
 * @link https://www.rspack.dev/
 */
const config: Configuration = {
  context: __dirname,
  entry: {
    worker: "./src/worker/index.ts",
    content: "./src/content/index.ts",
    [INJECT_ENTRY]: "./src/inject/index.ts",
  },
  plugins: [new FilesPlugin(), new ReloadPlugin(), new InjectFilePlugin(), new ManifestPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  builtins: {
    define: {
      "__DEV__": JSON.stringify(IS_DEV),
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
      "process.env.EVENT_TYPE": JSON.stringify(process.env.EVENT_TYPE),
      "process.env.INJECT_FILE": JSON.stringify(process.env.INJECT_FILE),
    },
  },
  module: {
    rules: [{ test: /\.svg$/, type: "asset" }],
  },
  output: {
    publicPath: "/",
    filename: "[name].js",
    path: path.resolve(__dirname, "build"),
  },
  devtool: false,
};

export default config;
