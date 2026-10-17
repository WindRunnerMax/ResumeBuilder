import type { Op, ResumeDoc, ResumeNode } from "@cv/json";
import type { Rect } from "@cv/utils";
import { contains, rect } from "@cv/utils";

/**
 * 元素的运行时状态
 * - 不持有业务数据，只提供索引与换算
 */
export class ElementState {
  /** 节点 id */
  public readonly id: string;
  /** 父节点 id */
  public readonly parentId: string | null;
  /** 子节点 id 顺序 */
  public readonly children: string[];
  /** 由 React 注册进来的 DOM */
  public el: HTMLElement | null;

  public constructor(private node: ResumeNode) {
    this.id = node.id;
    this.parentId = node.parent;
    this.children = [...node.children];
    this.el = null;
  }

  /** 元素类型 */
  public get type() {
    return this.node.type;
  }

  /** 当前节点数据 */
  public get data(): ResumeNode {
    return this.node;
  }

  /** 用最新的节点数据刷新状态 */
  public setNode(node: ResumeNode): void {
    this.node = node;
    this.children.length = 0;
    this.children.push(...node.children);
  }

  /** 元素矩形（相对父节点） */
  public get rect(): Rect {
    const { x, y, width, height } = this.node;
    return rect(x, y, width, height);
  }

  /** 判断点是否命中 */
  public hitTest(point: { x: number; y: number }): boolean {
    return contains(this.rect, point);
  }
}

/**
 * 模型层
 * - ResumeDoc 的投影与索引
 * - 禁止在此写数据，所有变更走 Command → JSONDocument
 */
export class Model {
  /** id → 状态 */
  private states: Map<string, ElementState> = new Map();

  /**
   * @param doc 文档
   */
  public constructor(private doc: () => Readonly<ResumeDoc>) {
    this.rebuild();
  }

  /** 全量重建索引 */
  public rebuild(): void {
    this.states.clear();
    const nodes = this.doc().nodes;
    for (const node of Object.values(nodes)) {
      this.states.set(node.id, new ElementState(node));
    }
  }

  /** 获取元素状态 */
  public get(id: string): ElementState | null {
    return this.states.get(id) || null;
  }

  /** 获取页面状态 */
  public getPage(): ElementState {
    const root = this.doc().root;
    const state = this.states.get(root);
    if (!state) {
      throw new Error(`Root node not found: ${root}`);
    }
    return state;
  }

  /** 获取页面下所有元素 */
  public getChildren(): ElementState[] {
    return this.getPage().children.map(id => this.states.get(id)).filter(Boolean) as ElementState[];
  }

  /**
   * 按绘制顺序拍平所有元素
   * - 子节点在父节点之后
   */
  public getFlat(): ElementState[] {
    const result: ElementState[] = [];
    const walk = (id: string) => {
      const state = this.states.get(id);
      if (!state) return;
      result.push(state);
      state.children.forEach(walk);
    };
    this.getPage().children.forEach(walk);
    return result;
  }

  /** 按事件顺序拍平，后绘制的优先命中 */
  public getFlatReversed(): ElementState[] {
    return this.getFlat().reverse();
  }

  /**
   * 命中检测
   * @param point 相对页面的坐标
   */
  public hitTest(point: { x: number; y: number }): ElementState | null {
    const flat = this.getFlatReversed();
    for (const state of flat) {
      if (state.type === "page") continue;
      if (state.hitTest(point)) return state;
    }
    return null;
  }

  /**
   * 根据变更的 ops 刷新索引
   * @param ops 本次变更
   */
  public sync(ops: Op[]): void {
    const touched = new Set<string>();
    for (const op of ops) {
      const id = op.p[0] === "nodes" ? String(op.p[1]) : "";
      if (!id) continue;
      touched.add(id);
      op.li && typeof op.li === "object" && "id" in op.li && touched.add(String(op.li.id));
      op.oi && typeof op.oi === "object" && "id" in op.oi && touched.add(String(op.oi.id));
    }
    const nodes = this.doc().nodes;
    if (!touched.size) {
      this.rebuild();
      return;
    }
    for (const id of touched) {
      const node = nodes[id];
      const state = this.states.get(id);
      if (node && state) {
        state.setNode(node);
      } else if (!node && state) {
        this.states.delete(id);
      }
    }
    const page = this.states.get(this.doc().root);
    page && page.setNode(this.doc().nodes[this.doc().root]);
  }

  /** 销毁 */
  public destroy(): void {
    this.states.clear();
  }
}
