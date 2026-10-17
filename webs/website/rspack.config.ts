import type { Configuration } from "@rspack/cli";
import HtmlRspackPlugin from "@rspack/plugin-html";
import path from "path";

const IS_DEV = process.env.NODE_ENV === "development";

/**
 * @type {import("@rspack/cli").Configuration}
 * @link https://www.rspack.dev/
 */
const config: Configuration = {
  context: __dirname,
  entry: {
    index: "./src/index.tsx",
  },
  plugins: [
    new HtmlRspackPlugin({
      template: "./public/index.html",
      title: "Resume Builder",
    }),
  ],
  resolve: {
    // 直接指向包源码，无需提前构建 packages
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@cv/utils": path.resolve(__dirname, "../../packages/utils/src"),
      "@cv/json": path.resolve(__dirname, "../../packages/json/src"),
      "@cv/core": path.resolve(__dirname, "../../packages/core/src"),
      "@cv/plugin": path.resolve(__dirname, "../../packages/plugin/src"),
      "@cv/react": path.resolve(__dirname, "../../packages/react/src"),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  builtins: {
    define: {
      __DEV__: JSON.stringify(IS_DEV),
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    },
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: [/node_modules/],
        use: {
          loader: "builtin:swc-loader",
          options: {
            jsc: {
              parser: { syntax: "typescript", tsx: true, decorators: true },
              transform: { legacyDecorator: true, react: { runtime: "automatic" } },
            },
          },
        },
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: ["style-loader", "css-loader", "sass-loader"],
        type: "javascript/auto",
      },
      // BlockKit 依赖 arco 的 less 样式
      { test: /\.less$/, use: ["style-loader", "css-loader", "less-loader"] },
      { test: /\.svg$/, type: "asset" },
    ],
  },
  output: {
    publicPath: "/",
    filename: "[name].js",
    path: path.resolve(__dirname, "build"),
  },
  devServer: {
    port: 3001,
    hot: true,
    historyApiFallback: true,
  },
  devtool: IS_DEV ? "source-map" : false,
};

export default config;
