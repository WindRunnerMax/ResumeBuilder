import type { Rect } from "@cv/utils";

import type { Editor } from "../editor";

/** 拖拽类型 */
type GrabType = "move" | "resize";

/** 拖拽状态 */
type GrabState = {
  /** 拖拽类型 */
  type: GrabType;
  /** 起始点，相对页面 */
  start: { x: number; y: number };
  /** 起始包围盒 */
  bounds: Rect;
  /** 缩放命中的手柄 */
  handle?: string;
  /** 移动前的节点位置 */
  origins: Map<string, { x: number; y: number }>;
  /** 最终包围盒 */
  result: Rect;
};

/** 拖拽触发阈值 */
const DRAG_THRESHOLD = 2;
/** 最小尺寸 */
const MIN_SIZE = 4;

/**
 * 交互模块
 * - 绑定原生事件，驱动 Selection / ModeManager / Command
 * - 拖拽期间只写 DOM，结束时提交一次 op，因此一次拖拽只产生一条历史
 */
export class Interaction {
  /** 当前拖拽 */
  private grab: GrabState | null = null;
  /** 是否已超过阈值 */
  private moved = false;
  /** 抓手平移画布状态 */
  private panning: { x: number; y: number; scrollLeft: number; scrollTop: number } | null = null;
  /** 框选状态 */
  private marquee: { start: { x: number; y: number }; rect: Rect } | null = null;
  /** 框选触发阈值 */
  private static readonly MARQUEE_THRESHOLD = 4;

  public constructor(private editor: Editor) {}

  /** 绑定事件 */
  public bind(): void {
    const el = this.editor.view.getViewport();
    if (!el) return;
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("dblclick", this.onDoubleClick);
    el.addEventListener("pointerover", this.onPointerOver);
    el.addEventListener("pointerout", this.onPointerOut);
    // move/up 绑在 document 上，拖拽中鼠标移出画布或落在浮层上也能正确结束
    document.addEventListener("pointermove", this.onPointerMove);
    document.addEventListener("pointerup", this.onPointerUp);
    document.addEventListener("pointercancel", this.onPointerUp);
    document.addEventListener("keydown", this.onKeyDown);
  }

  /** 解绑事件 */
  public unbind(): void {
    const el = this.editor.view.getViewport();
    if (!el) return;
    el.removeEventListener("pointerdown", this.onPointerDown);
    el.removeEventListener("dblclick", this.onDoubleClick);
    el.removeEventListener("pointerover", this.onPointerOver);
    el.removeEventListener("pointerout", this.onPointerOut);
    document.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("pointerup", this.onPointerUp);
    document.removeEventListener("pointercancel", this.onPointerUp);
    document.removeEventListener("keydown", this.onKeyDown);
  }

  /** 指针按下 */
  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;

    // 抓手工具：拖拽平移画布
    if (this.editor.tool === "GRAB") {
      const viewport = this.editor.view.getViewport();
      if (!viewport) return;
      this.panning = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
      };
      viewport.style.cursor = "grabbing";
      e.preventDefault();
      return;
    }

    // 插入工具激活时，在落点插入元素并消费工具
    const tool = this.editor.tool;
    if (tool) {
      const point = this.editor.view.toLocal(e.clientX, e.clientY);
      this.editor.tool = null;
      this.editor.onToolInsert?.(tool, Math.round(point.x), Math.round(point.y));
      e.preventDefault();
      return;
    }

    // 文本编辑态：点击编辑元素之外的位置退出编辑
    if (this.editor.mode.isTextEdit()) {
      const id = this.editor.view.findElementId(e.target);
      if (!this.isInside(id, this.editor.mode.editingId)) {
        this.editor.mode.exitTextEdit();
      }
      return;
    }

    const point = this.editor.view.toLocal(e.clientX, e.clientY);
    const bounds = this.editor.selection.getBounds();
    const handle = this.getHandle(e.target);
    const rootId = this.editor.document.get().root;
    const rootSelected = this.editor.selection.has(rootId);

    // 纸张不能拖拽与缩放，尺寸只在属性面板中设置
    if (handle && bounds && !rootSelected) {
      this.startGrab("resize", point, bounds, handle);
      e.preventDefault();
      return;
    }

    const id = this.editor.view.findElementId(e.target);
    if (id) {
      if (e.shiftKey) {
        this.editor.selection.has(id) ? this.editor.selection.remove(id) : this.editor.selection.add([id]);
      } else if (!this.editor.selection.has(id)) {
        this.editor.selection.set([id]);
      }
      const nextBounds = this.editor.selection.getBounds();
      nextBounds && this.startGrab("move", point, nextBounds);
      e.preventDefault();
      return;
    }

    // 点中白底纸张或画板空白：清空选择并准备框选，拖动超过阈值出现选框
    this.editor.selection.clear();
    this.marquee = { start: point, rect: { x: point.x, y: point.y, width: 0, height: 0 } };
    e.preventDefault();
  };

  /** 判断 id 是否为当前编辑元素的自身或子级 */
  private isInside(id: string | null, editingId: string | null): boolean {
    if (!id || !editingId) return false;
    let current: string | null = id;
    while (current) {
      if (current === editingId) return true;
      current = this.editor.model.get(current)?.parentId || null;
    }
    return false;
  }

  /** 从事件目标获取手柄 */
  private getHandle(target: EventTarget | null): string | null {
    if (!(target instanceof HTMLElement)) return null;
    const el = target.closest<HTMLElement>("[data-handle]");
    return el ? el.getAttribute("data-handle") : null;
  }

  /** 开始拖拽 */
  private startGrab(type: GrabType, start: { x: number; y: number }, bounds: Rect, handle?: string) {
    const origins = new Map<string, { x: number; y: number }>();
    this.editor.selection.list.forEach(id => {
      const state = this.editor.model.get(id);
      state && origins.set(id, { x: state.data.x, y: state.data.y });
    });
    this.grab = { type, start, bounds: { ...bounds }, handle, origins, result: { ...bounds } };
    this.moved = false;
    this.editor.set("MOUSE_DOWN", true);
  }

  /** 指针移动 */
  private onPointerMove = (e: PointerEvent) => {
    // 抓手平移画布
    const pan = this.panning;
    if (pan) {
      const viewport = this.editor.view.getViewport();
      if (viewport) {
        viewport.scrollLeft = pan.scrollLeft - (e.clientX - pan.x);
        viewport.scrollTop = pan.scrollTop - (e.clientY - pan.y);
      }
      return;
    }

    // 更新框选框
    const mq = this.marquee;
    if (mq) {
      const point = this.editor.view.toLocal(e.clientX, e.clientY);
      const x = Math.min(mq.start.x, point.x);
      const y = Math.min(mq.start.y, point.y);
      const width = Math.abs(point.x - mq.start.x);
      const height = Math.abs(point.y - mq.start.y);
      mq.rect = { x, y, width, height };
      this.editor.overlay.showMarquee(mq.rect);
      return;
    }

    const grab = this.grab;
    if (!grab) return;
    const point = this.editor.view.toLocal(e.clientX, e.clientY);
    const dx = point.x - grab.start.x;
    const dy = point.y - grab.start.y;
    if (!this.moved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
    this.moved = true;

    if (grab.type === "move") {
      grab.result = { ...grab.bounds, x: grab.bounds.x + dx, y: grab.bounds.y + dy };
      grab.origins.forEach((origin, id) => {
        const state = this.editor.model.get(id);
        if (!state) return;
        this.editor.renderer.preview(id, {
          x: origin.x + dx,
          y: origin.y + dy,
          width: state.data.width,
          height: state.data.height,
        });
      });
    } else {
      grab.result = this.resizeBounds(grab.bounds, grab.handle || "", dx, dy);
      const id = this.editor.selection.list[0];
      id && this.editor.renderer.preview(id, grab.result);
    }
    this.editor.overlay.previewBox(grab.result);
  };

  /** 计算缩放后的矩形 */
  private resizeBounds(
    bounds: Rect,
    handle: string,
    dx: number,
    dy: number
  ): Rect {
    let { x, y, width, height } = bounds;
    if (handle.includes("l")) {
      x += dx;
      width -= dx;
    }
    if (handle.includes("r")) width += dx;
    if (handle.includes("t")) {
      y += dy;
      height -= dy;
    }
    if (handle.includes("b")) height += dy;
    if (width < MIN_SIZE) {
      handle.includes("l") ? (x = x + width - MIN_SIZE) : void 0;
      width = MIN_SIZE;
    }
    if (height < MIN_SIZE) {
      handle.includes("t") ? (y = y + height - MIN_SIZE) : void 0;
      height = MIN_SIZE;
    }
    return { x, y, width, height };
  }

  /** 指针抬起，提交一次变更 */
  private onPointerUp = () => {
    this.editor.set("MOUSE_DOWN", false);

    // 结束抓手平移
    if (this.panning) {
      this.panning = null;
      const viewport = this.editor.view.getViewport();
      viewport && this.editor.tool === "GRAB" && (viewport.style.cursor = "grab");
      return;
    }

    // 结束框选：选中与选框相交的元素
    const mq = this.marquee;
    this.marquee = null;
    this.editor.overlay.hideMarquee();
    if (mq) {
      const { x, y, width, height } = mq.rect;
      if (width > Interaction.MARQUEE_THRESHOLD || height > Interaction.MARQUEE_THRESHOLD) {
        const right = x + width;
        const bottom = y + height;
        const ids = this.editor.model
          .getFlat()
          .filter(state => {
            if (state.type === "page") return false;
            const rect = state.rect;
            return rect.x < right && rect.x + rect.width > x && rect.y < bottom && rect.y + rect.height > y;
          })
          .map(state => state.id);
        ids.length && this.editor.selection.set(ids);
      }
      return;
    }

    const grab = this.grab;
    this.grab = null;
    if (!grab) return;

    const ids = [...grab.origins.keys()];
    ids.forEach(id => this.editor.renderer.restore(id));

    if (this.moved) {
      if (grab.type === "move") {
        const dx = grab.result.x - grab.bounds.x;
        const dy = grab.result.y - grab.bounds.y;
        (dx || dy) && this.editor.command.execute({ type: "MOVE", payload: { ids, dx, dy } });
      } else {
        const id = ids[0];
        id &&
          this.editor.command.execute({
            type: "RESIZE",
            payload: {
              id,
              x: grab.result.x,
              y: grab.result.y,
              width: grab.result.width,
              height: grab.result.height,
            },
          });
      }
    }
    this.moved = false;
    this.editor.overlay.patch();
  };

  /** 双击进入文本编辑 */
  private onDoubleClick = (e: MouseEvent) => {
    const id = this.editor.view.findElementId(e.target);
    if (!id) return;
    const state = this.editor.model.get(id);
    if (state && state.type === "text") {
      this.editor.mode.enterTextEdit(id);
      e.preventDefault();
    }
  };

  /** 悬停进入 */
  private onPointerOver = (e: PointerEvent) => {
    if (this.editor.mode.isTextEdit()) return;
    const id = this.editor.view.findElementId(e.target);
    if (!id) return;
    const state = this.editor.model.get(id);
    if (!state) return;
    const point = this.editor.view.toLocal(e.clientX, e.clientY);
    this.editor.event.trigger("HOVER_CHANGE", { node: state.data, point });
  };

  /** 悬停离开 */
  private onPointerOut = (e: PointerEvent) => {
    if (!this.editor.view.findElementId(e.target)) return;
    this.editor.event.trigger("HOVER_CHANGE", { node: null, point: { x: 0, y: 0 } });
  };

  /** 键盘事件 */
  private onKeyDown = (e: KeyboardEvent) => {
    if (this.editor.mode.isTextEdit()) {
      e.key === "Escape" && this.editor.mode.exitTextEdit();
      return;
    }
    // Esc 退出抓手工具
    if (e.key === "Escape" && this.editor.tool === "GRAB") {
      this.editor.tool = null;
      const viewport = this.editor.view.getViewport();
      viewport && (viewport.style.cursor = "");
      return;
    }
    // Ctrl/Cmd + A 全选画布元素
    if ((e.ctrlKey || e.metaKey) && e.key === "a") {
      const ids = this.editor.model
        .getFlat()
        .filter(state => state.type !== "page")
        .map(state => state.id);
      ids.length && this.editor.selection.set(ids);
      e.preventDefault();
      return;
    }
    const ids = this.editor.selection.list;
    if (!ids.length) return;
    if (e.key === "Backspace" || e.key === "Delete") {
      // 纸张是文档根节点，不允许删除
      const deletable = ids.filter(id => id !== this.editor.document.get().root);
      if (!deletable.length) return;
      this.editor.command.execute({ type: "DELETE", payload: { ids: deletable } });
      this.editor.selection.clear();
      e.preventDefault();
      return;
    }
    const step = e.shiftKey ? 10 : 1;
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = arrows[e.key];
    if (move) {
      this.editor.command.execute({ type: "MOVE", payload: { ids, dx: move[0], dy: move[1] } });
      e.preventDefault();
    }
  };

  /** 销毁 */
  public destroy(): void {
    this.unbind();
    this.grab = null;
    this.panning = null;
    this.marquee = null;
  }
}
