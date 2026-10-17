/** 日志等级 */
export const LOG_LEVEL = {
  DEBUG: 1,
  INFO: 2,
  WARNING: 3,
  ERROR: 4,
} as const;

/** 日志等级类型 */
export type LogLevel = (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL];

/** 编辑器日志 */
export class Logger {
  private level: LogLevel;

  /**
   * @param level 最低输出等级
   */
  public constructor(level: LogLevel = LOG_LEVEL.WARNING) {
    this.level = level;
  }

  /** 设置日志等级 */
  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  /** debug */
  public debug(...args: unknown[]): void {
    this.level <= LOG_LEVEL.DEBUG && console.log("[cv:debug]", ...args);
  }

  /** info */
  public info(...args: unknown[]): void {
    this.level <= LOG_LEVEL.INFO && console.info("[cv:info]", ...args);
  }

  /** warning */
  public warning(...args: unknown[]): void {
    this.level <= LOG_LEVEL.WARNING && console.warn("[cv:warn]", ...args);
  }

  /** error */
  public error(...args: unknown[]): void {
    this.level <= LOG_LEVEL.ERROR && console.error("[cv:error]", ...args);
  }
}
