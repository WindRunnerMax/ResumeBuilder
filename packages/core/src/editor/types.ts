import type { ResumeDoc } from "@cv/json";
import type { JSONDocument } from "@cv/json";

import type { LogLevel } from "../log";
import type { EditorModule } from "../module";
import type { CorePlugin } from "../plugin";

/** 编辑器构造选项 */
export type EditorOptions = {
  /** 初始数据，与 doc 二选一 */
  data?: ResumeDoc;
  /** 已有的文档实例，优先于 data */
  doc?: JSONDocument;
  /** 只读 */
  readonly?: boolean;
  /** 日志等级 */
  logLevel?: LogLevel;
  /** 核心插件 */
  plugins?: CorePlugin[];
  /** 独立撤销栈模块 */
  modules?: EditorModule[];
};
