import type { ElementState, RenderContext } from "@re/core";
import { CorePlugin } from "@re/core";

/** 矩形插件，支持填充与四边独立描边 */
export class RectPlugin extends CorePlugin {
  /** 插件标识 */
  public readonly key = "rect";

  /** 只处理矩形节点 */
  public match(state: ElementState): boolean {
    return state.type === "rect";
  }

  /** 注入填充与描边样式 */
  public onRender(ctx: RenderContext): RenderContext {
    const node = ctx.state.data;
    if (node.type !== "rect") return ctx;
    ctx.style.background = node.fill || "transparent";
    ctx.style.borderRadius = `${node.radius || 0}px`;
    const border = node.border;
    if (border) {
      const { width, color, l, r, t, b } = border;
      Object.assign(ctx.style, {
        borderLeft: l ? `${width}px solid ${color}` : "none",
        borderRight: r ? `${width}px solid ${color}` : "none",
        borderTop: t ? `${width}px solid ${color}` : "none",
        borderBottom: b ? `${width}px solid ${color}` : "none",
        boxSizing: "border-box",
      });
    }
    return ctx;
  }
}
