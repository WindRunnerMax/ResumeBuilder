import type { ElementState, RenderContext } from "@cv/core";
import { CorePlugin } from "@cv/core";

/**
 * 页面插件
 * - 页面内元素全部使用绝对定位，`padding` 不参与布局
 * - 这里只负责纸张背景与溢出裁切
 */
export class PagePlugin extends CorePlugin {
  /** 插件标识 */
  public readonly key = "page";

  /** 只处理页面节点 */
  public match(state: ElementState): boolean {
    return state.type === "page";
  }

  /** 注入纸张样式 */
  public onRender(ctx: RenderContext): RenderContext {
    const node = ctx.state.data;
    if (node.type !== "page") return ctx;
    ctx.style.background = node.background;
    ctx.style.boxSizing = "border-box";
    ctx.style.overflow = "hidden";
    return ctx;
  }
}
