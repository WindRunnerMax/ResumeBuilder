import { CorePlugin } from "@re/core";

import { PagePlugin } from "./element/page";
import { RectPlugin } from "./element/rect";

export { PagePlugin } from "./element/page";
export { RectPlugin } from "./element/rect";
export { registerBaseViews } from "./element/views";
export { TEXT_CLASS } from "./text/const";
export { TextModule } from "./text/module";

/** 内置元素插件列表 */
export const BASE_PLUGINS = [new PagePlugin(), new RectPlugin()];
