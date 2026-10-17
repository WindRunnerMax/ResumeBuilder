import type { Op as DeltaOp } from "@block-kit/delta";
import { Delta } from "@block-kit/delta";
import type { Path } from "@block-kit/ot-json";

import { json } from "./delta";

/** Delta 子类型操作，用于替换某个路径下的整份 Delta */
export type DeltaSubOp = {
  /** 目标路径，例如 ["nodes", id, "delta"] */
  p: Path;
  t: "delta";
  o: DeltaOp[];
};

/**
 * 构造替换整份 Delta 的子类型 op
 * @param path 目标路径
 * @param ops 新的 Delta
 */
export const createDeltaOp = (path: Path, ops: DeltaOp[]): DeltaSubOp => ({
  p: path,
  t: "delta",
  o: ops,
});

/**
 * 计算把 prev 变成 next 所需的 Delta
 * @param prev 原始内容
 * @param next 目标内容
 */
export const diffDelta = (prev: DeltaOp[], next: DeltaOp[]): DeltaOp[] => {
  return new Delta(prev).diff(new Delta(next)).ops;
};

export { json };
