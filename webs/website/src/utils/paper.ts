import type { PaperSize } from "@re/json";

/** 纸张预设的毫米尺寸 */
export const PAPER_MM: Record<string, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 215.9, height: 279.4 },
};

/** 把纸张配置换算成毫米 */
export const toPaperMm = (size: PaperSize): { width: number; height: number } => {
  if (typeof size === "string") return PAPER_MM[size] || PAPER_MM.A4;
  return size;
};

/** 毫米转英寸，CDP 打印参数使用英寸 */
export const mmToInch = (mm: number): number => Math.round((mm / 25.4) * 1000) / 1000;
