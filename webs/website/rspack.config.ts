/// <reference types="./script/global.d.ts" />
import type { Configuration } from "@rspack/cli";
import HtmlRspackPlugin from "@rspack/plugin-html";
import CopyPlugin from "copy-webpack-plugin";
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
    // 静态资源（图标、模板缩略图）原样拷贝到产物目录，保持 static/* 与 template/* 结构
    // 排除 index.html（由 HtmlRspackPlugin 生成）与 macOS 系统文件
    new CopyPlugin([{ from: "./public", to: ".", ignore: ["./index.html", "**/.DS_Store"] }]),
    new HtmlRspackPlugin({
      template: "./public/index.html",
      title: "Resume Builder",
    }),
  ],
  resolve: {
    // 直接指向包源码，无需提前构建 packages
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@re/utils": path.resolve(__dirname, "../../packages/utils/src"),
      "@re/json": path.resolve(__dirname, "../../packages/json/src"),
      "@re/core": path.resolve(__dirname, "../../packages/core/src"),
      "@re/react": path.resolve(__dirname, "../../packages/react/src"),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  builtins: {
    define: {
      "__DEV__": JSON.stringify(IS_DEV),
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
      // Less：用于 Arco 的按需样式与 BlockKit 自带样式
      {
        test: /\.less$/,
        use: ["style-loader", "css-loader", "less-loader"],
        type: "javascript/auto",
      },
      { test: /\.svg$/, type: "asset" },
    ],
  },
  output: {
    // 生产构建使用相对路径，保证部署到 GitHub Pages 等子路径下也能正确加载资源；
    // dev server 必须使用绝对路径，否则 HtmlRspackPlugin 不会注入 script 标签
    publicPath: IS_DEV ? "" : "./",
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
