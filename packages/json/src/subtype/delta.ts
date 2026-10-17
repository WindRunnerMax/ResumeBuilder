import type { Op as DeltaOp } from "@block-kit/delta";
import { Delta } from "@block-kit/delta";
import type { Side, Subtype } from "@block-kit/ot-json";
import { json as ot } from "@block-kit/ot-json";
import { SIDE } from "@block-kit/ot-json";

declare module "@block-kit/ot-json/dist/es/subtype" {
  interface SubtypeOpMap {
    delta: DeltaOp[];
  }
}

/**
 * Delta 子类型
 * - 把 BlockKit 的 Delta 当作 ot-json 的一个字段，从而直接复用其 OT 能力
 * - 实现与 BlocksKit/blocks/x-json 的 delta 子类型保持一致
 */
export const deltaType: Subtype = {
  name: "delta",
  apply(snapshot: DeltaOp[], delta: DeltaOp[]) {
    const delta1 = new Delta(snapshot);
    const delta2 = new Delta(delta);
    return delta1.compose(delta2).ops;
  },
  compose(ops1: DeltaOp[], ops2: DeltaOp[]) {
    const delta1 = new Delta(ops1);
    const delta2 = new Delta(ops2);
    // compose("A", "B") => BA => delta2 compose delta1
    return delta2.compose(delta1).ops;
  },
  transform(ops1: DeltaOp[], ops2: DeltaOp[], side?: Side) {
    const delta1 = new Delta(ops1);
    const delta2 = new Delta(ops2);
    return delta2.transform(delta1, side === SIDE.LEFT).ops;
  },
  invert(ops: DeltaOp[], snapshot?: DeltaOp[]) {
    if (!snapshot) throw new Error("Snapshot is required to invert delta");
    const delta1 = new Delta(snapshot);
    const delta2 = new Delta(ops);
    return delta2.invert(delta1).ops;
  },
  transformCursor(cursor: number, ops: DeltaOp[], side?: Side) {
    const delta = new Delta(ops);
    const isOwnOp = !side || side === SIDE.LEFT;
    return delta.transformPosition(cursor, isOwnOp);
  },
};

/** 注册了 delta 子类型的 ot-json 实例 */
export const json = ot.registerSubtype(deltaType);
