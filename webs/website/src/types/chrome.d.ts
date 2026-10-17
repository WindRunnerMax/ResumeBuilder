/**
 * 导出扩展注入的 chrome 运行时
 * - 只声明用到的成员，避免引入完整类型包
 */
type ChromeRuntime = {
  /** 扩展注入后才有值，可作为安装检测依据 */
  id?: string;
  /** 上一次消息调用的错误 */
  lastError?: { message: string };
  /** 发送消息给后台 service worker */
  sendMessage: (message: unknown, callback: (response: unknown) => void) => void;
};

declare const chrome: { runtime?: ChromeRuntime } | undefined;
