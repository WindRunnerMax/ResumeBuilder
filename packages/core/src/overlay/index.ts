import { HANDLE } from "../selection";
import type { HandleType } from "../selection";
import type { Editor } from "../editor";
import { EDITOR_MODE, HANDLE_KEY } from "../utils/constant";

/** 手柄尺寸 */
const HANDLE_SIZE = 8;

/**
 * 覆盖层
 * - 绘制选中框与缩放手柄
 * - 纯 CSS 定位，不参与数据
 */
export class Overlay {
  /** 覆盖层根节点 */
  private root: HTMLElement | null = null;
  /** 选中框 */
  private box: HTMLElement | null = null;
  /** 手柄集合 */
  private handles: HTMLElement[] = [];
  /** 框选虚线框 */
  private marquee: HTMLElement | null = null;

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

    this.marquee = document.createElement("div");
    this.marquee.style.position = "absolute";
    this.marquee.style.border = "1px solid #1664FF";
    this.marquee.style.background = "rgba(22, 100, 255, 0.06)";
    this.marquee.style.display = "none";
    this.marquee.style.pointerEvents = "none";
    root.appendChild(this.marquee);
  }

  /** 显示框选框 */
  public showMarquee(rect: { x: number; y: number; width: number; height: number }): void {
    if (!this.marquee) return;
    const offset = this.editor.view.getPaperOffset();
    this.marquee.style.display = "block";
    this.marquee.style.transform = `translate3d(${rect.x + offset.x}px, ${rect.y + offset.y}px, 0)`;
    this.marquee.style.width = `${rect.width}px`;
    this.marquee.style.height = `${rect.height}px`;
  }

  /** 隐藏框选框 */
  public hideMarquee(): void {
    this.marquee && (this.marquee.style.display = "none");
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
      return;
    }
    const offset = this.editor.view.getPaperOffset();
    this.box.style.display = "block";
    this.box.style.transform = `translate3d(${bounds.x + offset.x}px, ${bounds.y + offset.y}px, 0)`;
    this.box.style.width = `${bounds.width}px`;
    this.box.style.height = `${bounds.height}px`;
    // 纸张只能通过属性面板设置尺寸，不显示缩放手柄
    if (this.editor.selection.has(this.editor.document.get().root)) {
      this.handles.forEach(el => (el.style.display = "none"));
      return;
    }
    this.patchHandles(bounds);
  }

  /** 只刷新选框位置，拖拽预览用 */
  public previewBox(bounds: { x: number; y: number; width: number; height: number }): void {
    if (!this.box) return;
    const offset = this.editor.view.getPaperOffset();
    this.box.style.display = "block";
    this.box.style.transform = `translate3d(${bounds.x + offset.x}px, ${bounds.y + offset.y}px, 0)`;
    this.box.style.width = `${bounds.width}px`;
    this.box.style.height = `${bounds.height}px`;
    this.patchHandles(bounds);
  }

  /** 刷新手柄位置 */
  private patchHandles(bounds: { x: number; y: number; width: number; height: number }): void {
    const offset = this.editor.view.getPaperOffset();
    this.handles.forEach((el, index) => {
      const handle = Object.values(HANDLE)[index];
      const point = this.getHandlePoint(bounds, handle);
      el.style.display = "block";
      el.style.transform = `translate3d(${point.x + offset.x - HANDLE_SIZE / 2}px, ${
        point.y + offset.y - HANDLE_SIZE / 2
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

  /** 销毁 */
  public destroy(): void {
    if (this.root) {
      this.box && this.root.removeChild(this.box);
      this.handles.forEach(el => this.root && this.root.removeChild(el));
    }
    this.root = null;
    this.box = null;
    this.handles = [];
  }
}
