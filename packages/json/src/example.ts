import type { ResumeDoc } from "./types";
import example from "./example.json";

/** 示例简历文档，由 CanvasEditor 的模板转换而来 */
export const createExampleDoc = (): ResumeDoc => example as unknown as ResumeDoc;
