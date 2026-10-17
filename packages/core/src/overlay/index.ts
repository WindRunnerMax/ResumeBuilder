import { HANDLE } from "../selection";
import type { HandleType } from "../selection";
import type { Editor } from "../editor";
import { EDITOR_MODE, HANDLE_KEY } from "../utils/constant";

/** 手柄尺寸 */
const HANDLE_SIZE = 8;
/** 提示延迟 */
const TOOLTIP_DELAY = 300;

/**
 * 覆盖层
 * - 绘制选中框、缩放手柄、hover 描边与提示
 * - 纯 CSS 定位，不参与数据
 */
export class Overlay {
  /** 覆盖层根节点 */
  private root: HTMLElement | null = null;
  /** 选中框 */
  private box: HTMLElement | null = null;
  /** 手柄集合 */
  private handles: HTMLElement[] = [];
  /** 悬停提示 */
  private tooltip: HTMLElement | null = null;
  /** 提示计时器 */
  private timer: ReturnType<typeof setTimeout> | null = null;

  public constructor(private editor: Editor) {}

  /** 挂载到页面容器 */
  public mount(root: HTMLElement): void {
    this.root = root;
    root.style.position = "absolute";
    root.style.inset = "0";
    root.style.pointerEvents = "none";
    root.style.zIndex = "10";

    this.box = document.createElement("div");
    this.box.style.position = "absolute";
    this.box.style.border = "1px solid #1664FF";
    this.box.style.display = "none";
    this.box.style.pointerEvents = "none";
    root.appendChild(this.box);

    Object.values(HANDLE).forEach(handle => {
      const el = document.createElement("div");
      el.setAttribute(HANDLE_KEY, handle);
      el.style.position = "absolute";
      el.style.width = `${HANDLE_SIZE}px`;
      el.style.height = `${HANDLE_SIZE}px`;
      el.style.background = "#FFFFFF";
      el.style.border = "1px solid #1664FF";
      el.style.borderRadius = "1px";
      el.style.boxSizing = "border-box";
      el.style.display = "none";
      el.style.pointerEvents = "auto";
      el.style.cursor = this.getCursor(handle);
      root.appendChild(el);
      this.handles.push(el);
    });

    this.tooltip = document.createElement("div");
    this.tooltip.style.position = "absolute";
    this.tooltip.style.padding = "4px 8px";
    this.tooltip.style.fontSize = "12px";
    this.tooltip.style.background = "rgba(0,0,0,0.75)";
    this.tooltip.style.color = "#FFFFFF";
    this.tooltip.style.borderRadius = "4px";
    this.tooltip.style.whiteSpace = "nowrap";
    this.tooltip.style.display = "none";
    this.tooltip.style.pointerEvents = "none";
    this.tooltip.textContent = "双击进入编辑";
    root.appendChild(this.tooltip);
  }

  /** 手柄光标 */
  private getCursor(handle: HandleType): string {
    switch (handle) {
      case HANDLE.LT:
      case HANDLE.RB:
        return "nwse-resize";
      case HANDLE.RT:
      case HANDLE.LB:
        return "nesw-resize";
      case HANDLE.L:
      case HANDLE.R:
        return "ew-resize";
      default:
        return "ns-resize";
    }
  }

  /** 刷新选中框与手柄 */
  public patch(): void {
    if (!this.box) return;
    const editing = this.editor.mode.mode === EDITOR_MODE.TEXT_EDIT;
    const bounds = this.editor.selection.getBounds();
    if (!bounds || editing) {
      this.box.style.display = "none";
      this.handles.forEach(el => (el.style.display = "none"));
      this.hideTooltip();
      return;
    }
    this.box.style.display = "block";
    this.box.style.transform = `translate3d(${bounds.x}px, ${bounds.y}px, 0)`;
    this.box.style.width = `${bounds.width}px`;
    this.box.style.height = `${bounds.height}px`;
    this.patchHandles(bounds);
  }

  /** 只刷新选框位置，拖拽预览用 */
  public previewBox(bounds: { x: number; y: number; width: number; height: number }): void {
    if (!this.box) return;
    this.box.style.display = "block";
    this.box.style.transform = `translate3d(${bounds.x}px, ${bounds.y}px, 0)`;
    this.box.style.width = `${bounds.width}px`;
    this.box.style.height = `${bounds.height}px`;
    this.patchHandles(bounds);
  }

  /** 刷新手柄位置 */
  private patchHandles(bounds: { x: number; y: number; width: number; height: number }): void {
    this.handles.forEach((el, index) => {
      const handle = Object.values(HANDLE)[index];
      const point = this.getHandlePoint(bounds, handle);
      el.style.display = "block";
      el.style.transform = `translate3d(${point.x - HANDLE_SIZE / 2}px, ${
        point.y - HANDLE_SIZE / 2
      }px, 0)`;
    });
  }

  /** 计算手柄坐标 */
  public getHandlePoint(bounds: { x: number; y: number; width: number; height: number }, handle: HandleType) {
    const { x, y, width, height } = bounds;
    const cx = x + width / 2;
    const cy = y + height / 2;
    switch (handle) {
      case HANDLE.LT:
        return { x, y };
      case HANDLE.RT:
        return { x: x + width, y };
      case HANDLE.LB:
        return { x, y: y + height };
      case HANDLE.RB:
        return { x: x + width, y: y + height };
      case HANDLE.L:
        return { x, y: cy };
      case HANDLE.R:
        return { x: x + width, y: cy };
      case HANDLE.T:
        return { x: cx, y };
      default:
        return { x: cx, y: y + height };
    }
  }

  /** 显示悬停提示 */
  public showTooltip(x: number, y: number): void {
    if (!this.tooltip) return;
    this.timer && clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (!this.tooltip) return;
      this.tooltip.style.display = "block";
      this.tooltip.style.transform = `translate3d(${x}px, ${y + 16}px, 0)`;
    }, TOOLTIP_DELAY);
  }

  /** 隐藏悬停提示 */
  public hideTooltip(): void {
    this.timer && clearTimeout(this.timer);
    this.timer = null;
    this.tooltip && (this.tooltip.style.display = "none");
  }

  /** 销毁 */
  public destroy(): void {
    this.timer && clearTimeout(this.timer);
    this.timer = null;
    if (this.root) {
      this.box && this.root.removeChild(this.box);
      this.handles.forEach(el => this.root && this.root.removeChild(el));
      this.tooltip && this.root.removeChild(this.tooltip);
    }
    this.root = null;
    this.box = null;
    this.handles = [];
    this.tooltip = null;
  }
}
