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
    // Arco 组件与图标按需引入，由插件自动补上各组件的样式依赖
    pluginImport: [
      {
        libraryName: "@arco-design/web-react",
        customName: "@arco-design/web-react/es/{{ member }}",
        style: true,
      },
      {
        libraryName: "@arco-design/web-react/icon",
        customName: "@arco-design/web-react/icon/react-icon/{{ member }}",
        style: false,
      },
    ],
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
      // 样式走 rspack 原生 CSS 管线：直接产出 css 文件，不经过 style-loader
      {
        test: /\.(sa|sc|c)ss$/,
        use: ["sass-loader"],
        type: "css",
      },
      // Less：用于 Arco 的按需样式与 BlockKit 自带样式
      {
        test: /\.less$/,
        use: [{ loader: "less-loader", options: { lessOptions: { javascriptEnabled: true } } }],
        type: "css",
      },
      { test: /\.svg$/, type: "asset" },
    ],
  },
  output: {
    // 生产构建使用相对路径，保证部署到 GitHub Pages 等子路径下也能正确加载资源；
    // dev server 必须使用绝对路径，否则 HtmlRspackPlugin 不会注入 script 标签
    publicPath: IS_DEV ? "" : "./",
    filename: "[name].js",
    // 原生 CSS 管线产出的样式文件名
    cssFilename: "[name].css",
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
