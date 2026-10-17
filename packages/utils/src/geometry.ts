/** 二维坐标点 */
export type Point = {
  x: number;
  y: number;
};

/** 矩形，以左上角 + 宽高表示 */
export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** 矩形的四条边界，用于命中检测 */
export type RectBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/**
 * 由 x/y/width/height 构造矩形
 * @param x
 * @param y
 * @param width
 * @param height
 */
export const rect = (x: number, y: number, width: number, height: number): Rect => ({
  x,
  y,
  width,
  height,
});

/**
 * 取出矩形的四条边界
 * @param r
 */
export const bounds = (r: Rect): RectBounds => ({
  left: r.x,
  top: r.y,
  right: r.x + r.width,
  bottom: r.y + r.height,
});

/**
 * 判断点是否落在矩形内
 * @param r
 * @param point
 */
export const contains = (r: Rect, point: Point): boolean => {
  const b = bounds(r);
  return point.x >= b.left && point.x <= b.right && point.y >= b.top && point.y <= b.bottom;
};

/**
 * 判断两个矩形是否相交
 * @param a
 * @param b
 */
export const intersect = (a: Rect, b: Rect): boolean => {
  const ra = bounds(a);
  const rb = bounds(b);
  return ra.left < rb.right && ra.right > rb.left && ra.top < rb.bottom && ra.bottom > rb.top;
};

/**
 * 计算两个矩形的并集包围盒
 * @param a
 * @param b
 */
export const compose = (a: Rect, b: Rect): Rect => {
  const ra = bounds(a);
  const rb = bounds(b);
  const left = Math.min(ra.left, rb.left);
  const top = Math.min(ra.top, rb.top);
  const right = Math.max(ra.right, rb.right);
  const bottom = Math.max(ra.bottom, rb.bottom);
  return rect(left, top, right - left, bottom - top);
};

/**
 * 计算多个矩形的并集包围盒
 * @param list
 */
export const composeAll = (list: Rect[]): Rect | null => {
  if (!list.length) return null;
  return list.reduce((acc, item) => compose(acc, item));
};

/**
 * 平移矩形
 * @param r
 * @param dx
 * @param dy
 */
export const translate = (r: Rect, dx: number, dy: number): Rect => rect(r.x + dx, r.y + dy, r.width, r.height);

/**
 * 以指定锚点为基准缩放矩形
 * @param r 原始矩形
 * @param anchor 锚点，缩放时该点保持不动
 * @param dx
 * @param dy
 * @param minSize 最小尺寸限制
 */
export const resize = (r: Rect, anchor: Point, dx: number, dy: number, minSize = 1): Rect => {
  const b = bounds(r);
  let left = b.left;
  let top = b.top;
  let right = b.right;
  let bottom = b.bottom;
  const fixX = anchor.x === b.left ? "left" : anchor.x === b.right ? "right" : null;
  const fixY = anchor.y === b.top ? "top" : anchor.y === b.bottom ? "bottom" : null;
  if (fixX === "left") right += dx;
  if (fixX === "right") left += dx;
  if (fixY === "top") bottom += dy;
  if (fixY === "bottom") top += dy;
  if (right - left < minSize) {
    fixX === "left" ? (right = left + minSize) : (left = right - minSize);
  }
  if (bottom - top < minSize) {
    fixY === "top" ? (bottom = top + minSize) : (top = bottom - minSize);
  }
  return rect(left, top, right - left, bottom - top);
};

/**
 * 取整用于渲染，避免子像素抖动
 * @param value
 */
export const pixel = (value: number): number => Math.round(value * 100) / 100;
