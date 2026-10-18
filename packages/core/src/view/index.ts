import type { ResumeNode } from "@re/json";
import type { Point, Rect } from "@re/utils";
import { mmToPx, PAPER_SIZE } from "@re/utils";

import type { Editor } from "../editor";
import { resolvePaperSize } from "../model/utils";

/** 画板尺寸（px），即可滚动区域的上限 */
export const BOARD_SIZE = 5000;

/** 顶部留白（px） */
const SCROLL_MARGIN_TOP = 20;
/** 纸张与左侧边界的间距（px） */
const SCROLL_MARGIN_LEFT = 5;
/** 右侧浮动面板占位（px） */
const RIGHT_PANEL_WIDTH = 316;

/**
 * 视口模块
 * - 管理 viewport / board / page 三层 DOM
 * - board 为固定 5000×5000 的大画板，page 在其中自由摆放
 * - 不提供 zoom，坐标换算恒定
 */
export class View {
  /** 外层滚动容器 */
  private viewport: HTMLElement | null;
  /** 大画板，撑开滚动尺寸 */
  private stage: HTMLElement | null;
  /** 纸张节点 */
  private page: HTMLElement | null;
  /** 尺寸观察器 */
  private observer: ResizeObserver | null;
  /** 纸张左上角在画板中的坐标 */
  private paperX = 0;
  private paperY = 0;
  /** 纸张尺寸缓存，用于跳过无意义的 layout */
  private paperKey = "";
  /** 上一次广播的视口尺寸，避免重复触发 */
  private lastWidth = 0;
  private lastHeight = 0;

  public constructor(private editor: Editor) {
    this.viewport = null;
    this.stage = null;
    this.page = null;
    this.observer = null;
  }

  /** 挂载到容器 */
  public mount(container: HTMLElement): void {
    this.viewport = container;
    // 只读预览不滚动，编辑态保留滚动以浏览画板
    container.style.overflow = this.editor.isReadonly() ? "visible" : "auto";
    container.style.position = "relative";
    this.observer = new ResizeObserver(() => this.layout());
    this.observer.observe(container);
    // 编辑态接管滚轮，保证斜向（deltaX + deltaY）平移
    if (!this.editor.isReadonly()) {
      container.addEventListener("wheel", this.onWheel, { passive: false });
    }
    this.layout();
    this.scrollToPaper();
  }

  /** 滚轮平移：deltaX 与 deltaY 同时生效，实现斜向滚动 */
  private onWheel = (e: WheelEvent) => {
    const viewport = this.viewport;
    if (!viewport) return;
    e.preventDefault();
    viewport.scrollLeft += e.deltaX;
    viewport.scrollTop += e.deltaY;
  };

  /** 卸载 */
  public destroy(): void {
    this.viewport && this.viewport.removeEventListener("wheel", this.onWheel);
    this.observer && this.observer.disconnect();
    this.observer = null;
    this.viewport = null;
    this.stage = null;
    this.page = null;
  }

  /** 注册由 React 渲染的 board 节点 */
  public setStage(stage: HTMLElement | null): void {
    this.stage = stage;
    this.layout();
    this.scrollToPaper();
  }

  /** 注册由 React 渲染的 page 节点 */
  public setPage(page: HTMLElement | null): void {
    this.page = page;
    this.layout();
    this.scrollToPaper();
  }

  /** 获取纸张节点 */
  public getPage(): HTMLElement | null {
    return this.page;
  }

  /** 纸张在画板中的偏移 */
  public getPaperOffset(): { x: number; y: number } {
    return { x: this.paperX, y: this.paperY };
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

  /** 重新计算画板与纸张位置 */
  public layout(): void {
    const stage = this.stage;
    const viewport = this.viewport;
    if (!stage || !viewport) return;
    const { width, height } = this.getPageSize();
    const page = this.page;

    // 只读预览：画板与纸张一一对应，不滚动
    if (this.editor.isReadonly()) {
      stage.style.width = `${width}px`;
      stage.style.height = `${height}px`;
      if (page) {
        page.style.left = "0";
        page.style.top = "0";
        page.style.width = `${width}px`;
        page.style.height = `${height}px`;
      }
      this.paperKey = `${width}x${height}`;
      return;
    }

    // 纸张始终位于画板中央
    this.paperX = Math.round((BOARD_SIZE - width) / 2);
    this.paperY = Math.round((BOARD_SIZE - height) / 2);
    stage.style.width = `${BOARD_SIZE}px`;
    stage.style.height = `${BOARD_SIZE}px`;
    if (page) {
      page.style.left = `${this.paperX}px`;
      page.style.top = `${this.paperY}px`;
      page.style.width = `${width}px`;
      page.style.height = `${height}px`;
    }

    // 纸张尺寸变化时按新的纸张位置重画选中框
    const key = `${width}x${height}`;
    if (this.paperKey && this.paperKey !== key) {
      this.editor.overlay.patch();
    }
    this.paperKey = key;

    // 仅在视口尺寸真正变化时广播，避免 layout 与 RESIZE 互相递归
    const viewWidth = viewport.clientWidth;
    const viewHeight = viewport.clientHeight;
    if (viewWidth !== this.lastWidth || viewHeight !== this.lastHeight) {
      this.lastWidth = viewWidth;
      this.lastHeight = viewHeight;
      this.editor.event.trigger("RESIZE", { width: viewWidth, height: viewHeight });
    }
  }

  /**
   * 首次挂载时把纸张滚动到视口中间
   * - 纸张宽度超过可用宽度时左对齐，与左侧边界留 5px 间距
   * - 右侧有浮动面板时向左偏移其宽度的一半，实现视觉居中
   * - 顶部保留 20px 留白
   */
  public scrollToPaper(): void {
    const viewport = this.viewport;
    if (!viewport || this.editor.isReadonly()) return;
    const { width, height } = this.getPageSize();
    // 扣除右侧浮动面板后的可视宽度（左侧再预留 5px 间距）
    const viewWidth = viewport.clientWidth - RIGHT_PANEL_WIDTH - SCROLL_MARGIN_LEFT;
    const left =
      width >= viewWidth
        ? this.paperX - SCROLL_MARGIN_LEFT
        : this.paperX - (viewWidth - width) / 2 - SCROLL_MARGIN_LEFT;
    const top =
      height >= viewport.clientHeight
        ? this.paperY - SCROLL_MARGIN_TOP
        : this.paperY - (viewport.clientHeight - height) / 2;
    viewport.scrollLeft = Math.max(0, Math.round(left));
    viewport.scrollTop = Math.max(0, Math.round(top));
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

  /** 事件目标是否为纸张空白处 */
  public isPaperTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement) || !this.page) return false;
    return this.page.contains(target) && !target.closest("[data-element-id]");
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
