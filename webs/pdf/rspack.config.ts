import type { Configuration } from "@rspack/cli";
import path from "path";
import { FilesPlugin } from "./script/files/index.ts";
import { ManifestPlugin } from "./script/manifest/index.ts";
import { ReloadPlugin } from "./script/reload/index.ts";
import { getUniqueId, IS_DEV } from "./script/utils/node.ts";

const EVENT_TYPE = IS_DEV ? "EVENT_TYPE" : getUniqueId();

process.env.EVENT_TYPE = EVENT_TYPE;

/**
 * @type {import("@rspack/cli").Configuration}
 * @link https://www.rspack.dev/
 */
const config: Configuration = {
  context: __dirname,
  entry: {
    worker: "./src/worker/index.ts",
  },
  plugins: [new FilesPlugin(), new ReloadPlugin(), new ManifestPlugin()],
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
