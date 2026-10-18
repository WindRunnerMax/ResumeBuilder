/**
 * 注入脚本重命名
 * - 注入脚本按入口名 `inject` 构建，产物需要改名为随机文件名
 * - 避免与页面上的脚本命名冲突，同时与 manifest 中的声明保持一致
 */

import { INJECT_ENTRY } from "../utils/constant";

export class InjectFilePlugin {
  apply(compiler: import("@rspack/core").Compiler) {
    compiler.hooks.emit.tapAsync("InjectFilePlugin", (compilation, done) => {
      const key = `${INJECT_ENTRY}.js`;
      const asset = compilation.assets[key];
      if (!asset) return void done();
      const target = `${process.env.INJECT_FILE}.js`;
      compilation.assets[target] = asset;
      delete compilation.assets[key];
      done();
    });
  }
}
