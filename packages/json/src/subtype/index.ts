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

/**
 * 规格化 Delta 后序列化，用于可靠的内容比较
 * - 合并相邻同属性片段（compose 输出与 toDelta 输出的分片可能不同）
 * - 剔除空 attributes，attributes key 排序
 * - 两边都用它比较，避免规格化差异导致误判与光标重置
 * @param ops Delta 操作列表
 */
export const serializeDelta = (ops: DeltaOp[]): string => {
  const sorted = (attrs?: Record<string, unknown>) => {
    if (!attrs || !Object.keys(attrs).length) return null;
    return JSON.stringify(attrs, Object.keys(attrs).sort());
  };
  const merged: Array<{ insert: unknown; attributes?: Record<string, unknown> }> = [];
  for (const op of ops) {
    const attrs = sorted(op.attributes);
    const last = merged[merged.length - 1];
    if (
      last &&
      typeof last.insert === "string" &&
      typeof op.insert === "string" &&
      sorted(last.attributes) === attrs
    ) {
      last.insert += op.insert;
      continue;
    }
    merged.push({ insert: op.insert, ...(attrs ? { attributes: JSON.parse(attrs) } : {}) });
  }
  return JSON.stringify(merged);
};

export { json };
