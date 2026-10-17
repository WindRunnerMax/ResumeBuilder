/**
 * 按 depth 排序，depth 越小越靠前
 * - 用于把扁平的元素列表还原成「先父后子」的绘制顺序
 * @param list
 * @param getDepth
 */
export const sortByDepth = <T>(list: T[], getDepth: (item: T) => number): T[] => {
  return [...list].sort((a, b) => getDepth(a) - getDepth(b));
};

/**
 * 把元素移动到数组指定位置
 * @param list
 * @param from
 * @param to
 */
export const moveItem = <T>(list: T[], from: number, to: number): T[] => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};
