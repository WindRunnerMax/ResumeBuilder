import type { ResumeNode } from "@cv/json";
import type { Point, Rect } from "@cv/utils";
import { mmToPx, PAPER_SIZE } from "@cv/utils";

import type { Editor } from "../editor";
import { resolvePaperSize } from "../model/utils";

/** 页面四周留白（px） */
const STAGE_GAP = 120;

/**
 * 视口模块
 * - 管理 viewport / stage / page 三层 DOM
 * - 不提供 zoom，坐标换算恒定
 */
export class View {
  /** 外层滚动容器 */
  private viewport: HTMLElement | null;
  /** 内层舞台，撑开滚动尺寸 */
  private stage: HTMLElement | null;
  /** 纸张节点 */
  private page: HTMLElement | null;
  /** 尺寸观察器 */
  private observer: ResizeObserver | null;

  public constructor(private editor: Editor) {
    this.viewport = null;
    this.stage = null;
    this.page = null;
    this.observer = null;
  }

  /** 挂载到容器 */
  public mount(container: HTMLElement): void {
    this.viewport = container;
    container.style.overflow = "auto";
    container.style.position = "relative";
    this.observer = new ResizeObserver(() => this.layout());
    this.observer.observe(container);
    this.layout();
  }

  /** 卸载 */
  public destroy(): void {
    this.observer && this.observer.disconnect();
    this.observer = null;
    this.viewport = null;
    this.stage = null;
    this.page = null;
  }

  /** 注册由 React 渲染的 stage 节点 */
  public setStage(stage: HTMLElement | null): void {
    this.stage = stage;
    this.layout();
  }

  /** 注册由 React 渲染的 page 节点 */
  public setPage(page: HTMLElement | null): void {
    this.page = page;
    this.layout();
  }

  /** 获取纸张节点 */
  public getPage(): HTMLElement | null {
    return this.page;
  }

  /** 获取视口节点 */
  public getViewport(): HTMLElement | null {
    return this.viewport;
  }

  /** 纸张尺寸（px） */
  public getPageSize(): { width: number; height: number } {
    const node = this.editor.document.getNode(this.editor.document.get().root);
    if (!node || node.type !== "page") {
      return { width: mmToPx(PAPER_SIZE.A4.width), height: mmToPx(PAPER_SIZE.A4.height) };
    }
    const size = resolvePaperSize(node.size);
    return { width: size.width, height: size.height };
  }

  /** 重新计算舞台尺寸与留白 */
  public layout(): void {
    const stage = this.stage;
    const viewport = this.viewport;
    if (!stage || !viewport) return;
    const { width, height } = this.getPageSize();
    const stageWidth = width + STAGE_GAP * 2;
    const stageHeight = height + STAGE_GAP * 2;
    stage.style.width = `${stageWidth}px`;
    stage.style.height = `${stageHeight}px`;
    const page = this.page;
    if (page) {
      page.style.left = `${STAGE_GAP}px`;
      page.style.top = `${STAGE_GAP}px`;
      page.style.width = `${width}px`;
      page.style.height = `${height}px`;
    }
    this.editor.event.trigger("RESIZE", { width: viewport.clientWidth, height: viewport.clientHeight });
  }

  /**
   * 屏幕坐标转画布坐标
   * - 没有 zoom，只减去纸张偏移
   */
  public toLocal(clientX: number, clientY: number): Point {
    const rect = this.page ? this.page.getBoundingClientRect() : null;
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  /** 纸张在屏幕上的矩形 */
  public getPageRect(): Rect {
    const rect = this.page ? this.page.getBoundingClientRect() : null;
    if (!rect) return { x: 0, y: 0, width: 0, height: 0 };
    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
  }

  /** 根据 id 找到元素 DOM */
  public getElement(id: string): HTMLElement | null {
    const page = this.page;
    if (!page) return null;
    return page.querySelector<HTMLElement>(`[data-element-id="${CSS.escape(id)}"]`);
  }

  /** 从事件目标向上查找元素 id */
  public findElementId(target: EventTarget | null): string | null {
    if (!(target instanceof HTMLElement)) return null;
    const el = target.closest<HTMLElement>("[data-element-id]");
    return el ? el.getAttribute("data-element-id") : null;
  }

  /** 给节点写入位置与尺寸 */
  public applyRect(node: HTMLElement, nodeData: ResumeNode): void {
    node.style.position = "absolute";
    node.style.left = "0";
    node.style.top = "0";
    node.style.width = `${nodeData.width}px`;
    node.style.height = `${nodeData.height}px`;
    node.style.transform = `translate3d(${nodeData.x}px, ${nodeData.y}px, 0)`;
    node.style.opacity = typeof nodeData.opacity === "number" ? `${nodeData.opacity}` : "";
  }
}
