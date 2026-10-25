import type { Op as DeltaOp } from "@block-kit/delta";
import type { Op, Path, Snapshot } from "@block-kit/ot-json";
import { createDeltaOp, diffDelta, json } from "./subtype";
import type { ResumeDoc, ResumeNode } from "./types";

/**
 * 基于 ot-json 的文档容器
 * - 整个编辑器唯一的数据源头
 * - 所有变更都必须通过 ops 提交，以保证 history / OT 一致性
 */
export class JSONDocument {
  /** 当前快照 */
  private snapshot: ResumeDoc;

  /**
   * @param doc 初始文档
   */
  public constructor(doc: ResumeDoc) {
    this.snapshot = json.create(doc) as ResumeDoc;
  }

  /** 获取当前文档（只读） */
  public get(): Readonly<ResumeDoc> {
    return this.snapshot;
  }

  /** 获取节点 */
  public getNode(id: string): ResumeNode | null {
    return (this.snapshot.nodes[id] as ResumeNode) || null;
  }

  /** 按路径取值 */
  public getValue<T>(path: Path): T | null | undefined {
    return json.get<T>(this.snapshot, path);
  }

  /**
   * 提交变更
   * @param ops ot-json 操作列表
   * @returns 应用后的新快照
   */
  public submit(ops: Op[]): ResumeDoc {
    if (!ops.length) return this.snapshot;
    this.snapshot = json.apply(this.snapshot, ops);
    return this.snapshot;
  }

  /**
   * 提交文本块内容变更，内部转成 delta 子类型 op
   * - 子类型的 apply 语义是「把 o compose 到现有值上」，因此这里传入 prev → next 的差异
   * - invert 时 ot-json 会按路径从快照取出旧值，调用子类型的 invert，无需携带 ld/li
   * @param id 文本节点 id
   * @param next 新的 delta
   */
  public submitDelta(id: string, next: DeltaOp[]): Op[] {
    const node = this.getNode(id);
    const prev = node && node.type === "text" ? node.delta : [];
    const change = diffDelta(prev, next);
    const ops = [createDeltaOp(["nodes", id, "delta"], change)] as unknown as Op[];
    this.submit(ops);
    return ops;
  }

  /** 反转变更 */
  public invert(ops: Op[], snapshot?: Snapshot): Op[] {
    return json.invert(ops, snapshot || this.snapshot);
  }

  /** 组合变更 */
  public compose(a: Op[], b: Op[]): Op[] {
    return json.compose(a, b);
  }

  /** 变换变更 */
  public transform(ops: Op[], other: Op[], side?: "left" | "right"): Op[] {
    return json.transform(ops, other, side);
  }

  /**
   * 清空文档
   * - 删除页面下所有节点，保留页面根节点本身
   * - 用于导入前重置，避免新旧节点 id 冲突
   */
  public clear(): void {
    const root = json.create(this.snapshot.nodes[this.snapshot.root]) as ResumeNode;
    const page: ResumeNode = { ...root, children: [] };
    this.snapshot = json.create({
      ...this.snapshot,
      nodes: { [this.snapshot.root]: page },
    }) as ResumeDoc;
  }

  /** 整体替换文档 */
  public load(doc: ResumeDoc): void {
    this.snapshot = json.create(doc) as ResumeDoc;
  }

  /** 导出纯 JSON */
  public toJSON(): ResumeDoc {
    return json.create(this.snapshot) as ResumeDoc;
  }
}
