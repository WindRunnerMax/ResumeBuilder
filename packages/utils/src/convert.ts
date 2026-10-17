/** 排版基准 DPI，与 CSS px 一致 */
export const DPI = 96;

/** 毫米转像素 */
export const mmToPx = (mm: number): number => (mm * DPI) / 25.4;

/** 像素转毫米 */
export const pxToMm = (px: number): number => (px * 25.4) / DPI;

/** 磅转像素 */
export const ptToPx = (pt: number): number => (pt * DPI) / 72;

/** 像素转磅 */
export const pxToPt = (px: number): number => (px * 72) / DPI;

/** 纸张尺寸（毫米） */
export const PAPER_SIZE = {
  A3: { width: 297, height: 420 },
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
} as const;

/** 纸张尺寸类型 */
export type PaperType = keyof typeof PAPER_SIZE;
