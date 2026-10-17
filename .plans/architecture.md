# ResumeBuilder 架构初始化计划

> 目标：基于 **DOM** 实现简历编辑器。
> 参考 `CanvasEditor`（class 生命周期 / 事件总线 / 选中拖拽 / 增量绘制思路）与 `BlocksKit`（core 无框架 + react 适配 + 插件化 + ot-json 子类型 + 扁平 Block 表）。

## 一、为什么 DOM 重写

CanvasEditor 的根本问题：**画布内容最终是一张图片**。

1. 导出 PDF 只能是位图：文字不可选、不可检索、体积大、缩放模糊。
2. 文字排版全自研：逐字符 `measureText`、手动换行、手动列表编号（`plugin/src/text/rich-text.ts` 的 `parse/render`）。
3. 文本编辑只能弹模态框（`react/.../right-panel/components/text/modules/editor.tsx`）。
4. 复制粘贴、无障碍、字体一致性都难保证。

DOM 方案让浏览器负责排版，PDF 通过 `CDP Page.printToPDF` + `preferCSSPageSize` 输出矢量文本。本仓库 `webs/pdf` 已具备该能力。

代价：放弃 canvas 的像素级增量重绘，改为「绝对定位 + transform + 局部 patch」。

## 二、总体设计

```
             ┌────────────────────────────────────────────────┐
  React UI ─▶│ @cv/react      适配层：ref 注册 + 事件订阅       │
 (webs/website)│ 不计算、不持有数据、不直接改 DOM 位置             │
             └────────────────────┬───────────────────────────┘
                                  │ editor 实例 / ref
             ┌────────────────────▼───────────────────────────┐
             │ @cv/core       无框架依赖，class 生命周期         │
             │  Editor ─┬─ View      视口/页面/滚动             │
             │          ├─ Model     json 投影 + 索引 + 命中     │
             │          ├─ Renderer  DOM patch                  │
             │          ├─ Overlay   选中框/手柄/参考线           │
             │          ├─ Selection 选中/拖拽/缩放/吸附         │
             │          ├─ Mode      图形态 / 文本编辑态          │
             │          ├─ Event     总线 + 原生事件             │
             │          ├─ History   主栈（ot-json op）          │
             │          ├─ Module    独立栈模块（文本/保留画板）  │
             │          ├─ Plugin    渲染/命令插件调度           │
             │          └─ Command   统一变更入口                │
             └────────────────────┬───────────────────────────┘
                                  │
             ┌────────────────────▼───────────────────────────┐
             │ @cv/json   ResumeDoc 类型 + JSONDocument(ot-json)│
             │ @cv/utils  几何 / 单位 / 节流 / id               │
             │ @block-kit/ot-json  JSON0 + text0 + delta 子类型 │
             └────────────────────────────────────────────────┘
```

四条硬约束：

1. **core 不 import react**。它只认 `HTMLElement`，通过 ref 传入。
2. **react 包是纯适配**：把 DOM 交给 core，把 core 事件转成 React state。
3. **数据只有一份**，在 `JSONDocument` 中；`Model` 只是投影与索引，禁止写数据。
4. **所有变更都是 ot-json op**，history 直接基于 op 的 invert。

### 2.1 与 BlocksKit `blocks/` 的关系（重要）

本质上，本项目就是 `BlocksKit/blocks`（`x-core` + `x-json` + `x-react` + `x-plugin`）那套「**用块管理富文本编辑器**」的模型，只加了两件事：**块有自由坐标**、**块可以拖拽**。

| BlocksKit blocks | 本项目 | 说明 |
|---|---|---|
| `BlockMap = Record<id, Block>` | `ResumeDoc.nodes` | 同一份扁平 id 表 |
| `BasicBlock { type, parent, children }` | `BaseNode { type, parent, children }` | 树结构完全相同 |
| `BlockModuleField`（`root` / `text`） | `NodeType`（`page`/`text`/`image`/`rect`） | 块类型的扩展点，用联合类型 |
| `x-json` 的 `delta` 子类型 | `@cv/json` 的 `delta` 子类型 | 同一份实现，直接复用 |
| `BlockEditor`（整个文档 = BlockKit 编辑器） | `Editor`（整个页面 = 画布编辑器） | 生命周期、事件、插件结构一致 |
| `BlockState` | `ElementState` | 运行时投影 |
| `BlockXModel` / `BlockXWrapModel` | `ElementView` / 元素包装 | React 渲染层一一对应 |
| `History`（`BlocksChange` + `Transform`） | `History`（ot-json op） | 同一套 invert/compose/transform |
| `x-plugin`（toolbar/align/indent/…） | `packages/plugin/feature` | 直接复刻 |

**唯一的结构性差异**：

1. `BasicBlock` 没有位置信息，`x-core` 靠文档流布局；`BaseNode` 多了 `x/y/width/height`，`Model` 用**绝对定位 + transform** 渲染，不走 flex 流。
2. 因此多了 `Selection`（选中/拖拽/缩放/吸附）与 `Overlay`（选框/手柄/参考线），这两个在 x-core 中不存在。
3. 也因此多了 `ModeManager`：块的「内容编辑」与「图形操作」要显式区分模式（x-core 里块永远是可编辑的，因为没有图形操作的概念）。
4. `History` 多一层 `EditorModule` 委托（文本块独立栈），这是纯扩展，`x-core` 的 stack 结构可以直接搬。

结论：**`x-core` 的实现可以逐文件映射到 `@cv/core`**，新增的只有 `View`（页面/滚动）、`Selection`、`Overlay`、`ModeManager` 和坐标相关逻辑。`x-json` / `x-react` / `x-plugin` 基本可以按原结构平移，只是把「流动布局」换成「绝对定位」。

## 三、包划分

| 包 | 职责 | 现状 |
|---|---|---|
| `packages/utils` | Rect/Point/Matrix、px↔mm/pt、throttle、id、栈 | 空壳，需实现 |
| `packages/json` | `ResumeDoc` 类型、`JSONDocument`（ot-json 封装）、子类型注册、默认模板、校验 | 仅 package.json |
| `packages/core` | `Editor` 及全部子模块（见第四节） | 空壳，需实现 |
| `packages/plugin` | 元素插件 + 功能插件（复刻 x-plugin） | 目录不存在，需创建 |
| `packages/react` | `EditorView` / `ElementView` / hooks / react 插件 | 目录不存在，需创建 |
| `webs/website` | 应用壳：顶栏、模板面板、属性面板、右键菜单 | 目录不存在，需创建 |
| `webs/pdf` | 浏览器扩展 CDP 导出 | ✅ 已有 |

依赖调整：
- `pnpm-workspace.yaml` 移除 `packages/delta`（本项目不用 BlockKit 的 Delta 作为画布数据结构，但作为文本子类型的实现细节保留在 `@block-kit/delta` 依赖里），补齐 `packages/plugin`、`packages/react`、`webs/website`。
- 根 `tsconfig.json` 的 `paths` 从只有 `@cv/core` 补齐到 5 个包。
- 新增依赖（全部用绝对版本号，对齐 BlocksKit 现有版本）：
  - `@block-kit/ot-json@1.0.24`（已有，在 `packages/json`）
  - `@block-kit/core` / `@block-kit/delta` / `@block-kit/utils` / `@block-kit/react` / `@block-kit/plugin`
  - react 17 / react-dom 17（与 CanvasEditor、BlocksKit 保持一致）

## 四、@cv/core 核心类

### 4.1 Editor（总装 + 生命周期）

沿用 BlocksKit `Editor`（`BlocksKit/packages/core/src/editor/index.ts`）的装配方式，`modules` 选项可替换子模块。

```ts
/** 编辑器实例，持有子模块并管理挂载/销毁 */
export class Editor {
  public readonly view: View;
  public readonly model: Model;
  public readonly renderer: Renderer;
  public readonly overlay: Overlay;
  public readonly selection: Selection;
  public readonly mode: ModeManager;
  public readonly event: Event;
  public readonly history: History;
  public readonly module: ModuleManager;
  public readonly plugin: Plugin;
  public readonly command: Command;
  public readonly logger: Logger;

  public constructor(options: EditorOptions = {}) {}
  public mount(container: HTMLDivElement): void;
  public unmount(): void;
  public destroy(): void;
}
```

- `EditorOptions = { doc: JSONDocument; readonly?; logLevel?; modules?: Partial<ModuleCtors> }`
- `mount` 只接收容器（react ref），不创建。
- 顺序固定：`constructor` 装配 → `mount` 绑事件+首渲染 → `unmount` 解绑 → `destroy` 销毁模块/插件/缓存。

### 4.2 View（视口 / 页面）

**不做 zoom**。简历是固定 A4 纸张，缩放没有实际价值，且会带来坐标换算复杂度。

```
viewport (overflow:auto, 铺满)
└── stage (position:relative, 撑开滚动尺寸)
    ├── page  (position:absolute, A4 白底, overflow:hidden)   ← 裁切边界
    │   └── [element nodes]                                    ← Renderer 写入
    ├── overlay (选中/手柄/参考线, pointer-events:none)
    └── editor  (文本编辑时的临时 contenteditable 容器)
```

- **页面**：A4 = 210×297mm，96dpi 下 `793.7008 × 1122.5197px`（对齐 canvas 版 `DPI=96`、`A4{210,296.99}`）。纸张尺寸由 `PageNode.size` 决定，不可在 UI 中缩放。
- **裁切**：`page` 固定尺寸 + `overflow:hidden`。导出时由 CSS 强制 `@page { size: 210mm 297mm; margin: 0 }` 保证一页。
- **坐标**：`View.toLocal(clientX, clientY)` = `clientX - pageRect.left`。**没有 scale，换算恒定**，`Selection` / `Model.hitTest` 都用这一套。
- **滚动/平移**：viewport 原生滚动即可，不额外做空格拖拽；`stage` 尺寸固定为「页面尺寸 + 四周留白」，滚动条自然出现。
- **ResizeObserver** 观察 viewport → 重算 `stage` 左右居中留白。

### 4.3 Model（投影层）

对应 canvas 版 `EditorState`（`CanvasEditor/packages/core/src/state/index.ts`），但**不持有业务数据**。

```ts
/** 元素运行时状态（不含业务数据） */
export class ElementState {
  public readonly id: string;
  public readonly type: ElementType;
  public readonly parentId: string | null;
  public readonly children: ElementState[];
  public get rect(): Rect;             // 由 json + 父级偏移计算
  public get el(): HTMLElement | null; // react 注册
}

export class Model {
  public get(id: string): ElementState | null;
  public getPage(): ElementState;
  public getFlat(order?: "paint" | "event"): ElementState[];
  public hitTest(x: number, y: number): ElementState | null;
  public sync(ops: Op[], previous: Snapshot): void;   // 重建受影响 state
  public toRect(id: string): Rect;
}
```

关键差异：canvas 版 `DeltaState` 自带 `insert/remove/move/resize/revise` 直接写数据。DOM 版**禁止** Model 写数据，一律 `Command → JSONDocument.submit → Model.sync`。

### 4.4 Renderer / Overlay（DOM 写入）

| canvas 版 | DOM 版 |
|---|---|
| `Graph.drawingEffect(range)` | `Renderer.patch(states)`：只改变动元素的 `transform/width/height` 与文本 |
| `Graph.drawingAll()` | `Renderer.renderAll()`：挂载 / 整体替换 |
| `Mask.drawingEffect(range)` | `Overlay.patch()`：选框、缩放手柄、hover、参考线（纯 CSS 定位） |
| `Mask.setCursorState` | `viewport.style.cursor` |

- 元素定位统一 `position:absolute; left:0; top:0; transform:translate3d(x,y,0)`，避免 `left/top` 触发重排。
- z 序用 DOM 顺序表达（`z` 变化时重排，对应 canvas 版 `Node.setZ` 的先移除后添加）。
- 元素 DOM 归属：**默认 React 托管**（`<ElementView>` 的 ref 注册到 `Model`），`Renderer` 只改 style 与文本；保留直接建 DOM 的能力用于拖拽预览。

### 4.5 Selection（选中 / 拖拽 / 缩放 / 吸附）

canvas 版靠 `Node.getFlatNode` 的后序冒泡（`canvas/dom/node.ts`）。DOM 版直接用事件冒泡 + `target.closest("[data-element-id]")`。

```ts
export class Selection {
  public set(ids: string[]): void;
  public add(ids: string[]): void;
  public has(id: string): boolean;
  public get ids(): string[];
  public getBounds(): Rect | null;
  public startGrab(handle: HandleType, e: PointerEvent): void;
}
```

- 8 个手柄挂在 overlay，带 `data-handle`，`pointer-events:auto`。
- **拖拽中不写 json**，只改 transform 预览；`pointerup` 一次性提交 `move`/`resize` op → 一次 undo。
- 吸附：页面边界 + 其他元素边/中线，结果渲染到 overlay。

### 4.6 交互模式（图形模式 / 文本编辑模式）

编辑器只有两种模式，互斥：

```
GRAPH (默认)                           TEXT_EDIT
├─ 单击元素 → 选中 + 弹出元素工具栏      ├─ 只能由「工具栏编辑按钮」或「双击」进入
├─ 拖拽/缩放/移动                        ├─ 元素内容的 contenteditable 获得焦点
├─ hover 元素 → 高亮 + tooltip 提示      ├─ 图形选框/手柄隐藏
└─ 键盘：删除、方向键微调                └─ 键盘：交给 BlockKit 文本编辑器
```

```ts
/** 编辑器交互模式 */
export const EDITOR_MODE = {
  GRAPH: "GRAPH",
  TEXT_EDIT: "TEXT_EDIT",
} as const;

export class ModeManager {
  public get mode(): EditorMode;
  public enterTextEdit(id: string, options?: { focus?: boolean }): void;
  public exitTextEdit(): void;
  public isTextEditing(id: string): boolean;
  public onChange(listener: (mode: EditorMode) => void): () => void;
}
```

规则：

1. **单击 = 选中 + 弹工具栏**，不进入编辑。工具栏是所有元素共用的「图形工具栏」（位置、尺寸、层级、删除、对齐等）。
2. **文本元素的工具栏多一个「编辑」按钮**（图标 + 文案）。点击后 `ModeManager.enterTextEdit(id)`：
   - `selection` 保留该 id（工具栏仍显示，但进入文本态样式）；
   - `overlay` 隐藏选框与手柄（文本态不需要缩放框）；
   - 对应 `<TextBlock>` 的 `Editable` 调用 `blockEditor.selection.focus()` / `selection.set(range)` 聚焦到末尾；
   - 触发 `EDITOR_EVENT.MODE_CHANGE`。
3. **双击文本元素也可进入编辑**（快捷方式），与「编辑」按钮等价。
4. **hover 提示**：鼠标悬停在文本元素上时，通过 `Overlay` 渲染一个跟随鼠标的 tooltip「双击进入编辑」，延迟 `300ms` 出现，移动即消失。非文本元素不显示该提示。
5. **退出文本编辑**：
   - `Escape`；
   - 点击画布空白处（`pointerdown` 目标不在 `page` 内或不在当前文本元素内）；
   - 点击其他元素；
   - **都不提交**：内容在每次 `CONTENT_CHANGE` 时已经回写到 json（见第七节），退出只是切模式。
6. **模式互斥**：`TEXT_EDIT` 期间禁用 `Selection.startGrab`、禁用拖拽缩放；`GRAPH` 期间 `contenteditable` 全部 `contentEditable=false`（或 `pointer-events:none` 由 overlay 接管），避免误触。
7. **工具栏**：单例组件，`SELECTION_CHANGE` 时按选中元素的 `type` 渲染不同按钮组；文本元素多出「编辑」按钮。工具栏挂在 `webs/website` 的 `components/toolbar`，通过 `editor.event` + `editor.command` 与 core 交互，core 不含 UI。

### 4.7 Event（事件总线）

直接复用 BlocksKit 结构（`core/src/event/bus/index.ts`、`action.ts`、`native/index.ts`）：`on/once/off/trigger` + 优先级 + 强类型 `EventMap`。

```ts
export const EDITOR_EVENT = {
  CONTENT_CHANGE: "CONTENT_CHANGE",
  SELECTION_CHANGE: "SELECTION_CHANGE",
  MODE_CHANGE: "MODE_CHANGE",            // GRAPH <-> TEXT_EDIT
  HISTORY_CHANGE: "HISTORY_CHANGE",
  MODULE_STACK_CHANGE: "MODULE_STACK_CHANGE",
  PAINT: "PAINT",
  RESIZE: "RESIZE",
  SCROLL: "SCROLL",
  MOUNT: "MOUNT",
  READONLY_CHANGE: "READONLY_CHANGE",
  ...NATIVE_EVENTS,
} as const;
```

react 只订阅这些事件，不读内部对象。**不提供 `ZOOM` 事件**（不支持缩放）。

### 4.8 History（主栈，ot-json）

```ts
export class History {
  public record(ops: Op[], snapshot: Snapshot): void;
  public undo(): void;
  public redo(): void;
  public canUndo(): boolean;
  public canRedo(): boolean;
  public beginBatch(): void;   // 注意：不要与 closeBatch 混用
  public closeBatch(): void;
  public clear(): void;
}
```

对照 canvas 版 `core/src/history/index.ts`：

| canvas 版 | DOM 版 |
|---|---|
| `changes.invert(previous)` 用整份 DeltaSet | `json.invert(ops, snapshot)` 按 op 路径反转 |
| 800ms 定时合并 `temp` | 同策略（`compose` 合并时间窗内同类 op），交互结束立即入栈 |
| `state.apply(op, {undoable:false})` | `JSONDocument.apply` + `Model.sync` + `Renderer.patch` |

一次拖拽 = 一组 op = 一次 undo。

### 4.9 Module（独立撤销栈，对应飞书 module）

飞书模型：主模块维护完整内容栈；文本块、画板是独立 module，各自维护栈；主栈里存 `{ _id: 'module1' }` 占位。

本项目落地：

```ts
/** 可独立持有撤销栈的模块 */
export abstract class EditorModule {
  public abstract readonly key: string;      // "text" | 预留 "board"
  public abstract readonly prefix: Path;     // 如 ["nodes", id]
  public abstract canUndo(): boolean;
  public abstract canRedo(): boolean;
  public abstract undo(): void;
  public abstract redo(): void;
  public abstract getSnapshot(): ModuleSnapshot;  // 供主栈占位
}

/** 主栈条目 */
export type HistoryEntry =
  | { kind: "ops"; ops: Op[] }
  | { kind: "module"; moduleKey: string; path: Path };

/** 按 id/焦点调度 */
export class ModuleManager {
  public register(module: EditorModule): void;
  public get(key: string, path: Path): EditorModule | null;
  public resolveActive(): EditorModule | null;
}
```

`History.undo()`：
1. 取栈顶。
2. `kind === "ops"` → `JSONDocument.apply(invert)`。
3. `kind === "module"` → 按 `key + path` 找到实例 → `module.undo()`（只撤销 `prefix` 下路径）。

判定：焦点在文本块 `contenteditable` 内 → 返回文本 module；在画布上 → `null`，走主栈。
文本块是第一个实现；画板只留接口。

### 4.10 Plugin（两层插件）

参考 BlocksKit 的 **core 插件**（数据/行为）与 **react 插件**（视图）：

```ts
/** 核心插件，可在 core 中注册 */
export abstract class CorePlugin {
  public abstract readonly key: string;
  public abstract destroy(): void;
  public abstract match(state: ElementState): boolean;
  public onCommand?(ctx: CommandContext): CommandContext;
  public onRender?(ctx: RenderContext): RenderContext;
  public onContentChange?(ctx: ChangeContext): void;
}
```

- `@Priority(n)` 装饰器 + `PLUGIN_CALLER` 枚举，`Plugin.call(key, payload)` 顺序调度（照搬 `core/src/plugin/`）。
- react 插件：`wrapElement` / `renderElement` 返回 `ReactNode`，按优先级由内向外包裹（照搬 `react/src/plugin/modules/wrap.tsx`）。

## 五、@cv/json 数据设计

### 5.1 文档结构（扁平 id → node）

```ts
/** 文档：扁平存储，children 存 id（沿用 x-json 的 Block 表思路） */
export type ResumeDoc = {
  version: number;
  root: string;
  nodes: Record<string, ResumeNode>;
};

/** 公共字段 */
export type BaseNode = {
  id: string;
  type: "page" | "text" | "image" | "rect";
  parent: string | null;
  children: string[];       // 顺序即 z 序
  x: number;
  y: number;
  width: number;
  height: number;
  rotate?: number;
  opacity?: number;
  locked?: boolean;
};

export type PageNode = BaseNode & {
  type: "page";
  size: "A4" | "A3" | "Letter" | { width: number; height: number };
  padding: [number, number, number, number];
  background: string;
};

/** 文本块：内容为一个 BlockKit Delta */
export type TextNode = BaseNode & {
  type: "text";
  delta: DeltaOp[];      // BlockKit Delta ops（行 + marks）
  style: TextStyle;      // 块级默认样式
  autoHeight: boolean;
};

export type ImageNode = BaseNode & {
  type: "image";
  src: string;
  mode: "contain" | "cover" | "fill";
  border?: { width: number; color: string } | null;
  radius?: number;
};

export type RectNode = BaseNode & {
  type: "rect";
  fill?: string | null;
  border?: { width: number; color: string; l: boolean; r: boolean; t: boolean; b: boolean };
  radius?: number;
};
```

**为什么扁平**：ot-json 路径可直接 `["nodes", id, "x"]`；移动只改 `parent/children`，不用整棵子树挪路径；与飞书按 id 调度 module 天然契合。代价是 `parent` 索引由 `Model.sync` 维护。

### 5.2 扩展子类型（对齐 `BlocksKit/blocks/x-json/src/modules/subtype.ts`）

`@block-kit/ot-json` 通过 `Subtype` 接口 + `registerSubtype` 扩展，`SubtypeOpMap` 用 `declare module` 增强。本项目注册两个：

```ts
// packages/json/src/subtype/delta.ts
declare module "@block-kit/ot-json/dist/es/subtype" {
  interface SubtypeOpMap { delta: DeltaOp[] }
}

/** Delta 子类型：把 BlockKit Delta 当作 ot-json 的一个可 OT 的字段 */
export const deltaType: Subtype = {
  name: "delta",
  apply, compose, transform, invert, transformCursor,     // 委托 @block-kit/delta
};

// packages/json/src/subtype/text.ts
/** text0 子类型：纯文本内联（ot-json 内置 TextType，直接注册） */
```

```ts
/** 统一导出，应用初始化时 import 一次即完成注册 */
export const json = ot.registerSubtype(deltaType);
export { TextType } from "@block-kit/ot-json";
```

这样：
- `text` 子类型用于纯文本字段（如个人信息的单行字段）。
- `delta` 子类型用于文本块的富文本内容，`History` / `compose` / `transform` 全部可直接复用 BlockKit 已验证的实现。
- 将来加表格/代码块，只需再加一个 `Subtype`，不用改 core。

### 5.3 JSONDocument

```ts
/** 唯一数据源，基于 ot-json */
export class JSONDocument {
  public get(): Readonly<ResumeDoc>;
  public submit(ops: Op[]): void;                 // 应用并广播
  public invert(ops: Op[], snapshot?: Snapshot): Op[];
  public compose(a: Op[], b: Op[]): Op[];
  public load(doc: ResumeDoc): void;
  public toJSON(): ResumeDoc;
  /** 文本块内容变更走子类型 op */
  public submitDelta(id: string, deltaOps: DeltaOp[]): void;
}
```

### 5.4 单位

- 存储统一 `px`（96dpi）。`mm → px = mm * 96 / 25.4`；A4 = `793.7008 × 1122.5197`。
- 属性面板可显示 `mm`，由 `@cv/utils` 换算。
- PDF 不依赖在轴 px：`@page` 用 `mm` + `preferCSSPageSize`。

## 六、@cv/react 适配层

| 文件 | 作用 |
|---|---|
| `hooks/use-editor.ts` | `EditorContext` + `useEditorStatic`（同 `BlocksKit/packages/react/src/hooks/use-editor.ts`） |
| `preset/editor.tsx` | `<EditorView editor>`：`useLayoutEffect` 里 `ref && editor.mount(ref)`，卸载 `unmount` + `destroy` |
| `preset/page.tsx` | `<PageView>`：读 `Model.getPage()`，渲染 A4 纸张 |
| `preset/element.tsx` | `<ElementView>`：按 `type` 分发插件视图，ref 注册 `state.el` |
| `preset/text.tsx` | `<TextBlock>`：`<BlockKitX>` + `<Editable>`，见第七节 |
| `plugin/index.tsx` | `ElementPlugin`（返回 ReactNode）+ `wrapElement` / `renderElement` |
| `hooks/use-selection.ts` | 订阅 `SELECTION_CHANGE` → `{ ids, bounds }` |
| `hooks/use-history.ts` | 订阅 `HISTORY_CHANGE` → `{ canUndo, canRedo }` |
| `hooks/use-command.ts` | 封装 `editor.command.execute`，绑定快捷键 |

三条适配规则（沿用 BlocksKit 约定）：
1. 实例稳定：`useMemo(() => new Editor(...), [])`。
2. DOM 只注册不改写：React 不参与拖拽时的位置更新，避免与 core 抢 DOM。
3. 单向：core → React 用事件；React → core 用 `command`。

## 七、文本块：复用 BlockKit 内联编辑器

这是与 CanvasEditor 最大的结构性差异。CanvasEditor 的做法是：**独立 BlockKit `Editor` 实例 + 前后端 TSON 字符串双向转换**（`right-panel/components/text/modules/editor.tsx` + `utils/transform.ts`），每 300ms debounce 回写一次，转换函数手写了 20+ 个 attr 映射。

本项目改为**同一份 Delta 两个消费者**：

```tsx
/** 文本块视图：BlockKit 编辑器直接挂在画布元素内 */
export const TextBlock: FC<{ editor: CanvasEditor; state: ElementState }> = ({ editor, state }) => {
  const blockEditor = useMemo(() => createTextEditor(editor, state), [state.id]);
  const readonly = editor.mode.mode !== "TEXT_EDIT";
  return (
    <BlockKitX editor={blockEditor} readonly={readonly}>
      <EditableX className="cv-text-editable" placeholder="请输入" />
    </BlockKitX>
  );
};
```

- **只有 `TEXT_EDIT` 模式下 `readonly=false`**。图形模式下文本块以只读方式渲染（不可聚焦、不可输入），单击交给画布 `Selection` 处理，这样单击选中与文本编辑不会互相抢焦点。
- 进入 `TEXT_EDIT` 由 `ModeManager.enterTextEdit(id)` 驱动：它把该块 `readonly` 置 false，并调用 `blockEditor.selection.set(range)` + `focus()` 让光标落到末尾。
- 文本内容：`TextNode.delta` 直接就是 BlockKit 的 `Op[]`，**没有 TSON 字符串、没有 transform 转换层**。
- 同步方向：BlockKit `CONTENT_CHANGE` → 取 `content/delta` → `JSONDocument.submitDelta(id, ops)`（走 ot-json `delta` 子类型）→ `Model.sync` → 画布视图更新。
- 反向（undo/导入）：`JSONDocument` 变更 → 若涉及该 `TextNode.delta`，`Model.sync` 后通知 `blockEditor.state` 整体替换 delta。
- `contenteditable` 直接位于 `page` 内，所见即所得；高度由 `autoHeight` 决定，`Model` 在文字变化后用 `ResizeObserver` / `scrollHeight` 回写 `height`（只读状态下不写，导出前统一刷新一次）。
- 字体、行高、字号等由 `TextNode.style` 注入 CSS，BlockKit 的 `LINE_HEIGHT/FONT_SIZE` 插件负责内联覆盖。

**模块化 history 的落点**：

```ts
/** 文本模块：把 BlockKit 的 history 包成 EditorModule */
export class TextModule implements EditorModule {
  public readonly key = "text";
  public get prefix() { return ["nodes", this.state.id]; }
  public canUndo() { return this.blockEditor.history.isUndoAble(); }
  public undo() { this.blockEditor.history.undo(); }
  public redo() { this.blockEditor.history.redo(); }
}
```

- 主栈记录「进入文本块编辑」这一事件为 `{ kind: "module", moduleKey: "text", path }`。
- 文本块内连续输入只进文本栈，主栈不膨胀；退出文本块后，主栈仍能整体回滚这次文本编辑（`module.getSnapshot()` 存 BlockKit delta 前后值）。
- 画布上的 `move/resize/delete` 走主栈 `kind: "ops"`。

## 八、交互管线

```
GRAPH 模式
pointerdown/move/up, keydown
   │
   ▼
Event.native ─▶ hitTest(closest [data-element-id]) ─▶ Selection(单击选中)
   │                                                    │
   │ grab 预览：只改 DOM transform                       │ pointerup
   ▼                                                    ▼
Command.execute(ops) ─▶ JSONDocument.submit(ops)
                          ├─▶ History.record
                          ├─▶ ModuleManager.resolveActive()
                          └─▶ Model.sync ─▶ Renderer.patch / Overlay.patch
                                                  │
                                                  ▼
                                          Event.trigger(CONTENT_CHANGE / …)
                                                  │
                                                  ▼
                                            React setState
```

```
选中变化 → Toolbar 渲染（按 type）
  文本元素 → 多一个「编辑」按钮
               │ click / 双击画布元素
               ▼
        ModeManager.enterTextEdit(id)
               ├─▶ 文本块 readonly=false + focus
               ├─▶ Overlay 隐藏选框/手柄
               └─▶ Event.trigger(MODE_CHANGE, { from: GRAPH, to: TEXT_EDIT })

TEXT_EDIT 模式
BlockKit 内部处理键盘/输入 ─▶ CONTENT_CHANGE ─▶ submitDelta ─▶ 文本模块栈
Escape / 点击外部 ─▶ ModeManager.exitTextEdit() ─▶ 回到 GRAPH
```

- 拖拽中：只写 `style.transform`，不提交、不触发 React。
- 结束时：提交 op，`patch` 只更新变动元素。
- 整体替换（模板/导入）：`renderAll`。

## 九、PDF 导出（已实现）

导出走**独立预览页** `#/preview`，与编辑页分离，避免编辑器的覆盖层、面板干扰打印。

```
编辑页 --「预览导出」按钮--> #/preview
                                ├── 左：只读 PreviewView（A4 尺寸，不滚动）
                                └── 右：ExportPanel
                                        ├── 文件名 + 导出按钮
                                        ├── 扩展状态（已装 / 未装提示安装）
                                        └── 未装扩展：复制 CDP 指令交给 Agent
```

**数据传递**：编辑页每次 `CONTENT_CHANGE` 写入 `localStorage["__cv-resume-document"]`，预览页读取快照，所以两边互不影响，导出的是稳定版本。

**导出流程**（`webs/website/src/components/export-panel/index.tsx`）：
1. `document.body.setAttribute("data-export", "pdf")` 切到导出态
2. `waitForAssets()`：`document.fonts.ready` + 所有 `img.decode()`
3. `chrome.runtime.sendMessage({ type: "CDP_EXPORT_PDF", payload })` 交给 `webs/pdf` 扩展
4. 完成后移除导出态

**导出态 CSS**（`webs/website/src/styles/global.scss`）：

| 规则 | 作用 |
|---|---|
| `@page { size: 210mm 297mm; margin: 0 }` | 固定 A4，配合 `preferCSSPageSize` 单页 |
| `body[data-export] { overflow: hidden }` | 去掉整页滚动 |
| 隐藏 `.cv-header` / `.cv-panel` / `.cv-export-panel` | 只留纸张 |
| `.cv-export` / `.cv-export-body` / `.cv-export-scroll` 改为 `display:block; overflow:visible; padding:0` | 取消 flex 布局与内边距 |
| `.cv-preview { width: 210mm }` | 纸张按毫米出图 |
| `.cv-preview-stage { box-shadow: none }` | 去掉投影 |

**扩展安装**：根目录 `pnpm build:pdf` → `chrome://extensions` 开发者模式 → 加载 `webs/pdf/build`。`webs/pdf` 的 `manifest.json` 已配置 `debugger` / `downloads` 权限与 `https://*/*`、`http://*/*`、`file://*/*` 匹配。

**未安装扩展的降级**：`ExportPanel` 用 `detectExtension()`（轮询 `chrome.runtime.id`，1.5s 超时）判断，未安装时：

- 展示安装步骤，导出按钮置灰；
- 提供「复制 CDP 指令」，生成一段只用 Node 内置 `http` 模块的脚本（走 `PUT /json/print`），可直接粘贴给 Agent 执行。

**只读预览的布局**：`View.layout()` 检测 `editor.isReadonly()`，此时 stage 与 page 一一对应、不居中、不滚动，`mount()` 也把 `overflow` 设为 `visible`。

**实测结果**：`Page.printToPDF` 输出单页、`MediaBox 594.96 × 841.92 pt`（A4）、含 `/Font` 与 `/Image`、中文字体以子集内嵌，文字可选中。

## 十、目录结构

```
packages/
  utils/src/{index,geometry,convert,function,sort}.ts
  json/src/
    index.ts  types.ts  document.ts  schema.ts  preset.ts
    subtype/{index,delta,text}.ts
  core/src/
    index.ts
    editor/{index,types}.ts
    view/index.ts
    model/{index,element-state}.ts
    renderer/index.ts
    overlay/index.ts
    selection/index.ts
    mode/index.ts
    event/{bus,native}/index.ts
    history/index.ts
    module/index.ts
    plugin/index.ts
    command/index.ts
    log/index.ts
  plugin/src/
    index.ts
    element/{page,rect,image,text}/index.tsx     # 画布元素
    feature/{toolbar,align,indent,shortcut}/...  # 复刻 x-plugin，作用于文本块
  react/src/
    index.ts
    hooks/{use-editor,use-selection,use-history,use-command,use-mode}.ts
    preset/{editor,page,element,text}.tsx
    plugin/index.tsx
webs/website/
  rspack.config.ts  public/index.html
  src/index.tsx
  src/components/header
  src/components/left-panel
  src/components/right-panel
  src/components/toolbar          # 图形工具栏（单击选中弹出，文本元素多「编辑」按钮）
  src/components/context-menu
  src/styles/
```

## 十一、里程碑

| 阶段 | 内容 | 验收 |
|---|---|---|
| **M0 骨架** | 修 `pnpm-workspace.yaml`（去 delta，补 plugin/react/webs-react）、根 tsconfig alias、五个包配置、`webs/website` 空壳可 `rspack serve` | `pnpm lint:ts` 通过，页面能起 |
| **M1 渲染** | `utils` 几何/单位；`json` 类型 + `JSONDocument` + delta 子类型；core 的 `Editor/View/Model/Renderer/Event`；`page`/`rect` 元素插件；react 的 `EditorView/PageView/ElementView` | 加载示例文档渲染静态页面，滚动正常 |
| **M2 交互** | `Selection`（点选/框选/拖拽/8 点缩放/吸附）、`Overlay`、`ModeManager`、图形工具栏（选中即弹出、文本元素带编辑按钮、hover 双击提示）、`History` 主栈、`Command` | 单击选中弹工具栏，拖拽缩放产生正确 op，undo/redo 正确 |
| **M3 文本** | `text` 元素插件 + `<TextBlock>` 内联 BlockKit 编辑器（图形模式下只读）；`TextModule` 独立栈；模式切换（编辑按钮/双击进入、Esc 退出、点击外部退出）；功能插件（toolbar/align/indent/shortcut） | 单击选中、点编辑按钮或双击才进入编辑，主栈与文本栈互不污染 |
| **M4 PDF** | 导出态 CSS、字体/图片等待、`webs/pdf` 对接、开发态 fallback | 扩展导出单页矢量 PDF，文字可选中 |
| **M5 完善** | image 插件、模板列表、属性面板、本地存储、i18n | 可完整产出一份简历 |

M2 起可并行：image 插件与 webs/website 的 UI 面板。

## 十二、风险与取舍

1. **DOM 重排性能**：绝对定位 + transform、拖拽只写 style、rAF 合批。
2. **不支持 zoom 的取舍**：简历固定 A4，去掉缩放后坐标换算恒定，但小屏幕上整页可能放不下，依赖 viewport 滚动。若后续要加缩略图，用 `renderToStaticMarkup` 单独渲染只读版本，不改画布。
3. **两套 editor 概念**：画布 Editor 与每文本块一个 BlockKit Editor。用 `ModuleManager` 隔离职责，避免相互触发事件（subscribe 时按 `state.id` 过滤）。
4. **单击选中 vs 文本聚焦**：靠 `ModeManager` 强制互斥——图形模式文本块 `readonly=true`，避免单击直接把光标放进 `contenteditable` 抢走选中逻辑。
5. **contenteditable 高度回写**：`autoHeight` 的文本块在每次 `CONTENT_CHANGE` 后用 `scrollHeight` 更新 `height`，需防抖且避免写回 json 造成循环（用 `source: HISTORY/SYSTEM` 标记跳过）。
6. **一页溢出**：只提示不分页。
7. **为什么不直接依赖 `x-core`**：`x-core` 的布局由浏览器文档流决定，块没有坐标概念，`Selection`/`Overlay`/`Mode` 都无处安放；硬塞进去会让 `x-core` 同时承担「流式文档」和「自由画布」两种语义。因此抄结构、不抄代码，`@cv/core` 是 `x-core` 的**坐标化版本**。
8. **测试**：`utils` / `json` 用纯 node；`core` 用 jsdom；`react` 用 `@testing-library/react`。
