import type { PaperSize } from "@re/json";
import { mmToPx, PAPER_SIZE } from "@re/utils";

/**
 * 解析纸张尺寸为像素
 * @param size 预设名或自定义毫米尺寸
 */
export const resolvePaperSize = (size: PaperSize): { width: number; height: number } => {
  if (typeof size === "string") {
    const preset = PAPER_SIZE[size] || PAPER_SIZE.A4;
    return { width: mmToPx(preset.width), height: mmToPx(preset.height) };
  }
  return { width: mmToPx(size.width), height: mmToPx(size.height) };
};
