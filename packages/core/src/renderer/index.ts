import type { ElementState } from "../model";
import type { Editor } from "../editor";
import { ELEMENT_KEY } from "../utils/constant";

/**
 * 渲染器
 * - DOM 由 React 托管，这里只负责把数据写进已注册的 DOM
 * - 拖拽期间直接写 style，绕过 React 规避整树重渲染
 */
export class Renderer {
  public constructor(private editor: Editor) {}

  /** 注册元素 DOM */
  public register(state: ElementState, el: HTMLElement | null): void {
    state.el = el;
    if (el) {
      el.setAttribute(ELEMENT_KEY, state.id);
      this.patch(state);
    }
  }

  /** 更新单个元素的位置、尺寸与插件注入的样式 */
  public patch(state: ElementState): void {
    const el = state.el;
    if (!el) return;
    this.editor.view.applyRect(el, state.data);
    this.applyPluginStyle(el, state);
  }

  /** 更新页面节点样式 */
  public patchPage(): void {
    const page = this.editor.model.getPage();
    const el = this.editor.view.getPage();
    if (!el) return;
    this.applyPluginStyle(el, page);
  }

  /** 把插件注入的样式写入 DOM */
  private applyPluginStyle(el: HTMLElement, state: ElementState): void {
    const ctx = this.editor.plugin.call("onRender", { state, style: {}, classList: [] });
    Object.entries(ctx.style).forEach(([key, value]) => {
      el.style.setProperty(this.toKebabCase(key), String(value));
    });
    ctx.classList.length && el.setAttribute("class", ctx.classList.join(" "));
  }

  /** camelCase 转 kebab-case */
  private toKebabCase(key: string): string {
    return key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
  }

  /** 批量更新 */
  public patchAll(states: ElementState[]): void {
    states.forEach(state => this.patch(state));
  }

  /** 全量重排 DOM 顺序，order 为从底到顶的 id 列表 */
  public reorder(order: string[]): void {
    const page = this.editor.view.getPage();
    if (!page) return;
    for (const id of order) {
      const el = page.querySelector<HTMLElement>(`[data-element-id="${CSS.escape(id)}"]`);
      el && page.appendChild(el);
    }
  }

  /**
   * 拖拽预览：直接写 style，不经过 React
   * @param id 元素 id
   * @param rect 临时矩形
   */
  public preview(id: string, rect: { x: number; y: number; width: number; height: number }): void {
    const el = this.editor.view.getElement(id);
    if (!el) return;
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
    el.style.transform = `translate3d(${rect.x}px, ${rect.y}px, 0)`;
  }

  /** 结束预览，恢复到数据状态 */
  public restore(id: string): void {
    const state = this.editor.model.get(id);
    state && this.patch(state);
  }

  /** 销毁 */
  public destroy(): void {}
}
