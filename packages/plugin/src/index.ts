export { PagePlugin } from "./element/page";
export { RectPlugin } from "./element/rect";
export { registerBaseViews } from "./element/views";

import { PagePlugin } from "./element/page";
import { RectPlugin } from "./element/rect";

/** 内置元素插件列表 */
export const BasePlugins = [new PagePlugin(), new RectPlugin()];
