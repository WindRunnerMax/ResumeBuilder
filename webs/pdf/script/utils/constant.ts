/**
 * 注入脚本参数
 * - 与 TKScript 保持一致：注入脚本以随机文件名构建，避免与页面上的脚本命名冲突
 * - 文件名在构建期注入，worker 与 content script 共用同一份常量
 */

/** 注入脚本的入口 key */
export const INJECT_ENTRY = "inject";
