/** 像素转毫米并保留一位小数 */
export const convertPxToMm = (px: number): number => (px * 25.4) / 96;

/** 尺寸展示文本 */
export const formatSize = (px: number): string => `${convertPxToMm(px).toFixed(1)}mm`;
