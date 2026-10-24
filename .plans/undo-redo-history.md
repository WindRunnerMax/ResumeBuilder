# 撤销 / 重做：主栈 + 模块化重构

## 1. 模型（与飞书对齐）

**只有两种类型：主栈 + 子模块。**

```
主栈 A（History）
  条目: { type, id, time }
  职责: 只记「什么类型的操作、作用于哪个 id、何时」
  不 invert、不 compose、不碰任何操作内容

子模块（类型 1：画布 / 类型 2：文本）
  key: "canvas" | "text"
  职责: 自己记录操作、自己维护 undo/redo 栈、自己执行
```

| 层 | 归属 | 记录内容 | 实例数 |
|---|---|---|---|
| 主栈 A | `History` | `{ type, id, time }` | 1 |
| 画布模块 B | `CanvasModule` | 位置 / 尺寸 / 增删 / 属性（ot-json ops） | 1 |
| 文本模块 C | `TextModule` | delta 变更（BlockKit 栈） | 每个文本块 1 |

要点：
1. 主栈不认识 OT-JSON，新增模块只需注册新 `type`。
2. 撤销粒度、合并、批量全部下沉到模块。
3. redo 栈同样在主栈上，与模块栈顺序天然一致。
4. 模块找不到（节点已删除等）→ **跳过**，继续弹下一条。

## 2. 已确认决策

1. 多选操作记**一条**（ot-json 可直接合并）。
2. 主栈条目带 `time`（毫秒时间戳）。
3. redo 栈放主栈上。
4. 模块不存在时跳过。
5. 快捷键归属：core 新增独立 key 模块，`Interaction` 只管画布交互。
6. 主栈占位：惰性，首次变更才记。
7. 文本块内 Ctrl+Z 只动文本模块，空了也不落到主栈。
8. 不考虑浏览器原生 undo，直接 `preventDefault`。
9. **焦点判定只判断“是否在画布内”**，见 3.6。
10. `EditorModule.isActive()` 移除（主栈不需要），见 3.2。

## 3. 目标结构

### 3.1 主栈

`packages/core/src/history/index.ts`

```ts
/** 主栈条目：只保存索引信息 */
export type HistoryEntry = {
  /** 模块类型 */
  type: string;
  /** 作用对象 id */
  id: string;
  /** 记录时间（ms） */
  time: number;
};

export class History {
  private undoStack: HistoryEntry[];
  private redoStack: HistoryEntry[];
  public record(type: string, id: string): void;
  /** 弹出 undo 栈顶并压入 redo 栈，返回条目；空栈返回 null */
  public undo(): HistoryEntry | null;
  /** 弹出 redo 栈顶并压入 undo 栈，返回条目；空栈返回 null */
  public redo(): HistoryEntry | null;
  public canUndo(): boolean;
  public canRedo(): boolean;
  public clear(): void;
}
```

`History` 不再依赖 `Editor`，只做栈管理，可独立单测。

### 3.2 模块接口

`packages/core/src/module/index.ts`

```ts
export abstract class EditorModule {
  public abstract readonly key: string;
  public abstract canUndo(): boolean;
  public abstract canRedo(): boolean;
  public abstract undo(): void;
  public abstract redo(): void;
  /** 清空模块自身的栈 */
  public abstract clear(): void;
}
```

`ModuleManager`：保留 `register / unregister / getAll / destroy`，新增 `get(key: string): EditorModule | null`（按 key 查，不看路径），**移除 `resolveActive()`**。

> 移除理由：主栈只按 `type` 找模块，焦点判定在 Key 模块里做 DOM 判断即可，`isActive()` 不再有调用方。

### 3.3 画布模块（新增）

`packages/core/src/module/canvas.ts`

```ts
/** 画布模块：负责位置、尺寸、增删、属性类操作 */
export class CanvasModule extends EditorModule {
  public readonly key = "canvas";
  private undoStack: Op[][] = [];
  private redoStack: Op[][] = [];
  /** 入栈（正向后由 Command 调用） */
  public record(ops: Op[]): void;
  /** invert 后 editor.submit(..., HISTORY) */
  public undo(): void;
  public redo(): void;
  public clear(): void;
}
```

- 一次 `MOVE` 多节点 → `record` 一次（ops 在同一数组）。
- `undo()` 时用当前快照 `invert`，`redo()` 时用 `invert` 后的结果再反转，与现有 `History.invertEntry` 同思路。
- 该模块由 `Editor` 构造时直接 `new` 并注册，无需外部持有。

### 3.4 文本模块（补齐）

`packages/react/src/plugin/text/module.ts`

- `record()`：首次内容变更时调 `editor.history.record("text", this.id)`，`recorded` 标志保证一次会话一条。
- `undo() / redo()`：操作 BlockKit history，完成后 `editor.notifyHistory()`。
- `clear()`：`getTextEditor(id)?.history.clear()`。
- 移除 `isActive()`、`getSnapshot()`、`prefix`。

### 3.5 调度入口

`packages/core/src/editor/index.ts`

```ts
/** 撤销：主栈弹出条目，按 type 找模块执行；模块不存在则跳过 */
public undo(): void {
  if (this.isReadonly()) return;
  let entry = this.history.undo();
  while (entry) {
    const module = this.module.get(entry.type);
    if (module) {
      module.undo();
      this.notifyHistory();
      return;
    }
    entry = this.history.undo();  // 跳过失效条目
  }
  this.notifyHistory();
}

public redo(): void { /* 对称 */ }

/** 广播历史状态，供 UI 刷新 */
public notifyHistory(): void;
```

`Command.execute`（`packages/core/src/command/index.ts:66`）改为：

```
plugin.onCommand → ops
canvasModule.record(ops)             // B 自持栈
history.record("canvas", targetId)   // A 只记索引
submit(ops, USER, true)
```

- `targetId`：`MOVE/RESIZE/REVISE/DELETE` 取第一个受影响 id；多选时也只用一条（决策 1）。
- `record` 与 `submit` 的顺序：先 `record`（此时快照仍是旧值，便于模块 invert），再 `submit`。

### 3.6 快捷键（焦点判定）

新增 `packages/core/src/key/index.ts`，只绑 `document` 的 `keydown`：

```ts
1. isReadonly() → return
2. active = document.activeElement
   if (active?.closest(".cv-text-block")) return   // 文本块：BlockKit 自己处理
   if (!active?.closest("[data-cv-editor]")) return // 编辑器外的面板/表单，不处理
3. 匹配 undo/redo → preventDefault() + editor.undo() / editor.redo()
```

- `.cv-text-block` 与 `[data-cv-editor]` 都是既有常量/类名，不新增魔法值：
  - `TEXT_CLASS = "cv-text-block"`（`packages/react/src/plugin/text/const.ts:2`）
  - `EDITOR_KEY = "data-cv-editor"`（`packages/core/src/utils/constant.ts:47`）
- 判定语义：**只有焦点在编辑器容器内、且不在文本块内**时，主栈才响应。`mode` 不再参与判定，`失焦但仍是 TEXT_EDIT` 的滞后问题自动消失。
- `Interaction.onKeyDown` 保持原职责（选择/删除/移动/工具/Esc），补一行注释指向 `Key`。

### 3.7 状态汇聚

- `packages/react/src/hooks/use-command.ts`：`undo/redo` 走 `editor.undo/redo`。
- `packages/react/src/hooks/use-history.ts`：焦点在文本块内时读该块自身栈（BlockKit 逐字撤销主栈看不到），否则读主栈。
- 结论：主栈不是全局真值，按钮状态需要「主栈 + 当前文本块栈」共同决定，见 8.4。

## 4. 单元测试（完备性）

### 4.1 `packages/core/test/history.test.ts`（新增，纯栈，不依赖 Editor/DOM）

| # | 用例 | 断言 |
|---|---|---|
| 1 | record 后条目字段 | `type` / `id` / `time` 正确，`time` 单调不减 |
| 2 | undo 弹出并压入 redo | `canUndo` / `canRedo` 翻转，返回条目内容正确 |
| 3 | redo 回弹 | 条目回到 undo 栈顶 |
| 4 | 新操作清空 redo 栈 | `canRedo()` 为 false |
| 5 | 空栈 undo/redo | 返回 `null`，不抛错 |
| 6 | 栈上限 200 | 第 201 条入栈后丢弃最旧条目 |
| 7 | clear | 双栈清空 |
| 8 | 连续多选合并 | 一次 record 只 +1 |

### 4.2 `packages/core/test/canvas-module.test.ts`（新增）

| # | 用例 | 断言 |
|---|---|---|
| 1 | MOVE → undo → redo | x/y 三次状态正确 |
| 2 | RESIZE → undo | x/y/width/height 回到原值 |
| 3 | DELETE → undo | 节点与 `children` 均恢复 |
| 4 | REVISE 属性 → undo | 属性回滚 |
| 5 | 多选 MOVE → 一次 undo | 全部节点同时回位 |
| 6 | 连续操作 → 连续 undo | 逐条回退，顺序正确 |
| 7 | clear | 模块栈清空，主栈不受影响 |
| 8 | 多次 undo 后再 redo | redo 链状态与原始一致 |

### 4.3 `packages/core/test/editor.test.ts`（补充）

| # | 用例 | 断言 |
|---|---|---|
| 1 | 现有 MOVE / DELETE undo 保持通过 | 语义不变 |
| 2 | `Editor.undo()` 模块不存在时跳过 | 伪造 `history.record("ghost", id)` 后 undo 不抛错、继续弹下一条 |
| 3 | `loadDocument` 清空主栈与所有模块 | `canUndo()` false，模块栈空 |
| 4 | 只读态 undo 无效果 | 数据不变，栈不变 |
| 5 | `Command.execute` 产生一条主栈条目 | 多选 MOVE 也仅 +1 |
| 6 | 主栈存在性：`record` 在 `submit` 之前 | 模块栈与主栈长度同步 +1 |

### 4.4 手动验证清单（文本块，依赖真实 DOM）

- 双击进入文本编辑 → 输入 → Ctrl+Z 逐字回退 → 栈空后 Ctrl+Z 无动作
- 点击画布退出编辑 → Ctrl+Z 撤销上一步排版操作（画布模块）
- Shift+Ctrl+Z 重做链与撤销链对称
- 焦点在右侧属性面板输入框 → Ctrl+Z 只影响输入框内容
- 焦点在顶栏按钮 → Ctrl+Z 不触发画布撤销

## 5. 关键文件

| 文件 | 改动 |
|---|---|
| `packages/core/src/history/index.ts` | 条目改为 `{type,id,time}`；不再依赖 Editor；undo/redo 负责栈迁移 |
| `packages/core/src/module/index.ts` | 接口收敛为 6 个方法；`get(key)`；移除 `resolveActive()` |
| `packages/core/src/module/canvas.ts` | **新增** |
| `packages/core/src/editor/index.ts` | `undo/redo` 调度、`notifyHistory`、`key` 生命周期、注册 `CanvasModule` |
| `packages/core/src/key/index.ts` | **新增** |
| `packages/core/src/command/index.ts` | 走 `CanvasModule.record` + `history.record("canvas", id)` |
| `packages/core/src/interaction/index.ts` | 注释指向 Key 模块 |
| `packages/core/src/index.ts` | 导出 `Key`、`CanvasModule` |
| `packages/react/src/plugin/text/module.ts` | 实现新接口，移除 `isActive/getSnapshot/prefix` |
| `packages/react/src/plugin/element/text/index.tsx` | 会话边界钩子（record / endSession） |
| `packages/react/src/hooks/use-command.ts` | 走 `editor.undo/redo` |
| `packages/react/src/hooks/use-history.ts` | 只读主栈 |
| `packages/core/test/history.test.ts` | **新增** |
| `packages/core/test/canvas-module.test.ts` | **新增** |
| `packages/core/test/editor.test.ts` | 补充用例 |

## 6. 迁移影响

- `History.record(ops)` 的唯一调用方是 `Command.execute`，改动可控。
- `HistoryEntry.kind` 移除，无外部使用。
- `ModuleManager.resolveActive()` 移除（当前无调用方）。
- `TextModule` 的 `prefix` / `getSnapshot` / `isActive` 移除；`EditorModule` 抽象类同步收敛。
- 现有 `editor.test.ts` 的 undo/redo 用例语义不变，应保持通过。

## 7. 文档同步（实施后）

修订 `.plans/architecture.md`：
- 4.8 History：改为「主栈只存 `{type,id,time}`，不持有 invert 逻辑」。
- 4.9 Module：补充 `CanvasModule` 与 `TextModule` 两个实现，说明调度在 `Editor` 层；移除 `resolveActive()` 相关描述。
- 4.1 装配图：加入 `Key`。

## 8. 实施记录

已按上述方案落地，与原设计的差异与取舍：

| 项 | 实施结果 |
|---|---|
| 主栈合并 | **不做同类型合并**。主栈一格必须等于模块栈一格，否则「多次 undo 后再 redo」时画布模块（集合语义，一次 undo 清空栈）与主栈对不上。`History` 保持纯 `HistoryEntry[]` 双栈。 |
| 模块栈条目 | `CanvasModule` 只存正向 `Op[][]`，`undo/redo` 时用当前快照现算反向 op；跳过失效条目导致文档已变时也能正确应用。 |
| 文本会话 | `TextModule.record()` 由文本块监听 BlockKit `CONTENT_CHANGE` 触发；首次可撤销内容时向主栈登记一条，`recorded` 标志保证一次会话一条。文本栈空了不会落到主栈（决策 7）。 |
| 只读 | `Editor.submit` 在只读态忽略非 `SYSTEM` 来源；`Command.execute` 只读时不入栈。 |
| 快捷键常量 | `TEXT_CLASS` 提到 core 常量 `TEXT_KEY`，`Key` 与 react 共用，避免重复魔法值。 |
| 新增 API | `Editor.undo/redo/notifyHistory`、`Editor.canvas`、`Editor.key`、`Editor.collectIds`（public）、`ModuleManager.clear`、`EditorModule.destroy` 保留。 |
| 测试 | `test/history.test.ts`（9 例）、`test/canvas-module.test.ts`（8 例）、`test/key.test.ts`（7 例）、`test/editor.test.ts` 补充 4 例，共 34 例通过。 |

### 8.1 修正：快捷键全局化

原方案的焦点判定（必须在 `[data-cv-editor]` 内）导致两个问题：

1. 点过顶栏按钮后焦点在 `body` 上，Ctrl+Z 完全没反应；
2. 「按钮撤销」与快捷键各自为政，无法统一。

修正后：

- `Editor` 构造即 `key.bind()`（`unbind` 在 `destroy`/`unmount`），**不再等待 mount**；
- `Key` 对 undo/redo 组合键**一律 `preventDefault`**，只保留编辑器一套历史；
- 路由：焦点在 `.cv-text-block` 内 → 该文本块模块；其余 → `editor.undo()/redo()`；
- 按钮、快捷键、子模块入口全部收敛到 `Editor.undo/redo`，模块只暴露 `undo/redo` 供调度。

### 8.2 修正：文本块按实例注册与派发

文本块是**非受控**的 BlockKit 编辑器，之前两个 bug 都出在这里：

1. **注销用 key**：`module.unregister("text")` 会把同 key 的其他文本块一起删掉，未挂载的旧实例残留，撤销派发命中了没有栈的实例 → 改为 `unregister(module)` 按实例注销。
2. **注册用 key 覆盖**：同一 key 只能保留一个实例 → `EditorModule` 增加 `id`，`register` 按 `key + id` 去重；`Editor.undo/redo` 用 `resolveModule(entry)` 先按 `type + id` 精确匹配，找不到再退回同 key 的最新实例（画布模块）。

另外 `TextModule.undo/redo` 执行后必须把内容写回文档（`syncBack` → `submitDelta(..., false)`）：BlockKit 内容变更以 `undoable: false` 写回，不记录历史，但撤销后文档必须跟着更新。

### 8.3 修正：撤销后再次输入未登记

`TextModule.recorded` 是「本轮输入只登记一条」的标志，但撤销 / 重做会把这条占位从主栈移走，标志没复位，导致：

> 输入 123 → 撤销 → 再输入 456 → 主栈为空，只有 redo 亮

修复：`undo()` / `redo()` 执行后均把 `recorded` 置回 `false`，让后续输入重新登记。

### 8.4 修正：富文本内 Ctrl+Z 与快捷键双绑定

RichText 内按 Ctrl+Z 后「undo 仍亮、redo 不亮」，根因是**两套撤销同时在跑**：

1. BlockKit 的 `History` 在构造时 `event.on(KEY_DOWN, onKeyDown)`，自己在处理 Ctrl+Z；
2. 画布层 `Key` 又处理一次，且 `preventDefault` 拦不住已经执行的那次。

修复：通过 BlockKit 提供的 `modules.History` 注入子类，在子类构造里主动退订内置快捷键：

```ts
/** 文本块专用 History：不处理快捷键，只承接内容变更 */
export class TextHistory extends History {
  public constructor(editor: BlockEditor) {
    super(editor);
    // 父类构造时已按 `@Bind` 后的引用订阅，这里用同一引用精确退订
    this.editor.event.off(EDITOR_EVENT.KEY_DOWN, this.onKeyDown);
  }
}

// createTextEditor
new Editor({ ..., modules: { History: TextHistory } });
```

- 用**继承 + 构造函数退订**，而不是外部 `off` 或空实现覆盖：
  - 外部 `off` 需要 `as unknown as` 绕开 `protected`，属于反模式；
  - 空 `onKeyDown` 会整段屏蔽父类逻辑，BlockKit 后续在 `onKeyDown` 内新增的必要处理会被静默跳过；
  - 退订语义准确，且 `destroy()` 仍能按同一引用解绑（`EventBus.off` 幂等）。
- 只退订 `KEY_DOWN`，内容变更监听保留，文本栈仍正常记录；
- `Selection` 自己的 `onArrowKeyDown` 不受影响；
- 撤销 / 重做统一由画布 `Key` 调度，富文本内外只有一套记录。

同时 `Key` 的文本块路由改为**按 `data-element-id` 精确匹配**（此前 `module.get("text")` 会取到最新注册的实例，多文本块时撤错块）；`useHistory` 在焦点位于文本块时读取该块自身栈的状态，保证按钮与实际可用操作一致。

### 8.5 测试沉淀

| 文件 | 覆盖 |
|---|---|
| `core/test/history.test.ts`（9） | 纯栈：条目字段、弹栈迁移、上限、清空、跨类型顺序 |
| `core/test/canvas-module.test.ts`（8） | MOVE/RESIZE/DELETE/REVISE、多选一次撤销、连续撤销、redo 链 |
| `core/test/key.test.ts`（8） | 全局快捷键：无焦点、Meta、Shift+Z / Ctrl+Y、文本块路由、**多文本块按 id 路由**、只读、卸载 |
| `core/test/editor.test.ts`（11） | 调度、失效条目跳过、loadDocument 清空、只读、多选一条、**同 key 按 id 派发 + 按实例注销** |
| `react/test/text-history.test.ts`（4） | 注入生效、**只退订 History 的 KEY_DOWN**、内容监听保留、`destroy()` 正常解绑 |
| `react/test/text-module.test.ts`（7） | 一次会话一条、撤销回写文档、**撤销后再输入重新登记**、重做后再输入、空栈不登记、同 key 多实例注册/注销、历史状态广播 |

共 51 例（core 36 + react 15）。

---

## 9. 二次重构：主栈成为唯一时间线

§8 之后仍有两个遗留问题：

1. `Key` 必须按焦点路由（焦点在 `.cv-text-block` 内走文本块栈，其余走主栈）；
2. `useHistory` 必须拼「主栈 + 当前文本块栈」，主栈不是唯一真值，按钮状态随焦点跳变。

根因是**记条目的地方和存数据的地方绑在一起**：文本块只在会话开始登记一条占位，之后逐字撤销发生在 BlockKit 自己的栈里，主栈看不到。于是只能靠焦点猜测该调哪个栈。

本轮把「记条目」上收到唯一时间线，**数据仍留在各编辑器**。

### 9.0 核心思想：主栈「被动接收」条目

这是本轮最关键的转变，也是后续所有细节的出发点。

**旧模式：谁负责写入谁记条目。** `Command.execute` 自己调 `history.record(...)`，文本块自己调 `module.record()`，两处各写各的。哪里存数据，哪里就顺手记一笔 —— 于是记录逻辑分散在 N 个调用方，且都没法知道「自己这一笔和上一个模块的栈是不是对得上」。

**新模式：主栈不主动记，只被动接收模块上报的「栈结构变化」。**

```
模块栈发生实际变化
  → 模块把变化性质上报（HistoryEffect）
  → 主栈据此被动增 / 删自己的条目
```

具体落地就是 `TextHistory.onContentChange` 拿到父类返回值后广播 `HistoryEffect`，`TextModule.record(effect)` 再据此决定主栈「记一条」还是「丢一条」。**主栈自身完全不知道内容是什么，也不需要知道** —— 它只响应「有没有新开一格」这个事实。

这个转变带来了三个直接收益：

1. **单一真值**：主栈成为唯一时间线，`useHistory` 只读主栈，按钮状态不再随焦点跳变；
2. **路由消失**：`Key` 不需要按焦点猜测该调哪个栈，统一 `editor.undo()/redo()`，由 `type + id` 精确派发；
3. **可扩展**：新增一类可撤销内容时，只要在它的栈变化时上报 `HistoryEffect`，主栈无需任何改动。

代价是模块必须精确汇报「自己栈里到底发生了什么」—— 这正是需要一个可靠的 `HistoryEffect` 返回值的原因（见 §9.2），也是为什么不能用「比较 `undoStack.length` 前后差值」这类间接推断（见 §9.3）。

### 9.1 核心模型

```
主栈 History（唯一时间线，只存指针，被动接收）
  条目 { type, id, time }

各编辑器（各自维护 undo/redo 栈，主动上报变化性质）
  CanvasModule   → Op[][]
  TextModule(id) → 委托 BlockKit TextHistory

Ctrl+Z / 按钮
  → editor.undo() → 主栈弹一条 → 按 type+id 找模块 → module.undo()
```

主栈**不存任何操作内容**，只保证「模块栈一格 = 主栈一条」。

### 9.2 BlockKit 侧：`HISTORY_EFFECT`

`onContentChange` 原先返回 `void`，外部无从得知这次变更对栈做了什么。

**这正是「被动接收」模式的前提条件**：主栈既然不主动记，就必须由模块准确告知「你这次到底新开了一格、并入了上一格、还是把上一格抵消掉了」。返回值不给这个信息，主栈就只能靠长度差值间接推断，一旦误判就会多记或漏记，导致主栈与模块栈错位。

1.0.30 起 `onContentChange` 返回五值枚举（`packages/core/src/history/types`）：

| 值 | 含义 | 主栈动作 |
|---|---|---|
| `NONE: 0` | 空变更 / REMOTE / `undoable: false` / 空 delta 未入栈 | 不记 |
| `MERGE: 1` | 并入上一格 | 不记 |
| `APPEND: 2` | 新开一格 | 记一条 |
| `APPEND_DROP: 3` | 新开一格且 `shift` 丢掉最旧一格 | 记一条并丢最旧 |
| `MERGE_DROP: 4` | 合并后完全抵消，栈少一格 | **丢一条** |

`NONE` 取 `0` 是为了让它成为唯一 falsy 值，`if (effect)` 的语义与「有变化」一致。

关键实现细节：

- `APPEND → APPEND_DROP` 的升级只在 `effect === APPEND` 时发生：合并分支长度不变，`shift` 不可能由合并触发；
- 空 delta 分支必须区分来源 —— `effect === MERGE` 说明合并分支**已经 pop 过**，栈真的少了一格，返回 `MERGE_DROP`；否则栈没动，返回 `NONE`。早期版本无条件返回 `MERGE_DROP`，会让主栈删掉一条不存在的条目。

### 9.3 `@Bind` 与子类覆写的坑（重要）

「被动接收」要求模块**必须真的拿到并转发**父类的返回值。而 `History.onContentChange` 被 `@Bind` 装饰，`Bind` 的实现是**原型 getter**，首次访问时把方法绑定成实例自有属性：

```ts
// packages/utils/src/decorator.ts
get() {
  const boundFunction = originalMethod.bind(this);
  Object.defineProperty(this, key, { value: boundFunction, configurable: true });
  return boundFunction;
}
```

由此得出两条结论：

1. **子类必须用 `@Bind` 方法覆写**。父类构造函数会读取 `this.onContentChange` 注册到事件总线，此时走子类原型 getter，绑定的是子类实现；若改用**箭头函数字段**，字段初始化在 `super()` **之后**，父类早已把实例属性钉死成父类实现，覆写完全失效（踩过）。
2. **`super.onContentChange` 是安全的**。它走父类原型 getter，把父类实现绑定到实例，但不影响事件总线上已注册的子类引用 —— 事件总线持有的是子类那份。

```ts
export class TextHistory extends History {
  private listeners: TextHistoryListener[] = [];

  public constructor(editor: BlockEditor) {
    super(editor);
    this.editor.event.off(EDITOR_EVENT.KEY_DOWN, this.onKeyDown);
  }

  @Bind
  protected override onContentChange(event: ContentChangeEvent): HistoryEffect {
    const effect = super.onContentChange(event);
    this.listeners.forEach(listener => listener(effect));
    return effect;
  }
}
```

早期尝试过的两种方案都更差，不要回退：

- **返回值经事件总线传出** —— 不行，`EventBus.emit` 丢弃监听器返回值；
- **比较 `undoStack.length` 前后变化** —— 能跑但属于间接推断，且在依赖私有字段。

### 9.4 业务侧改动

| 文件 | 改动 |
|---|---|
| `react/src/plugin/text/history.ts` | 覆写 `onContentChange`，把 `HistoryEffect` 广播给订阅者 |
| `react/src/plugin/text/module.ts` | `record(effect)` 接收效果：`APPEND`/`APPEND_DROP` → 主栈记一条，`MERGE_DROP` → 主栈丢一条；**删除 `recorded` 惰性标志** |
| `react/src/plugin/element/text/index.tsx` | 由 `CONTENT_CHANGE` + `module.record()` 改为 `history.subscribe(effect => module.record(effect))` |
| `core/src/history/index.ts` | `record()` 增加 `replace` 参数；新增 `drop(type, id)` |
| `core/src/key/index.ts` | **删除整段焦点路由**，`handler()` 只剩 `editor.undo()/redo()` |
| `react/src/hooks/use-history.ts` | 删除 `readTextState`，直接读主栈 |

`TextModule` 的 `recorded` 标志及其在 `undo/redo/clear/destroy` 里的复位逻辑全部移除 —— 逐条登记后不再需要「一次会话一条」的语义。

### 9.5 依赖策略

业务侧统一使用 npm 上发布的 `@block-kit/*@1.0.30`，**不使用 `link:` 本地依赖**。

曾尝试 link 本地 BlocksKit 调试，暴露出一系列问题（记录备查）：

- `@block-kit/react` / `plugin` 内部仍解析到自己的 `core` 副本，`protected` 成员导致两个 `Editor` 类不兼容；
- `plugin` 的样式由 rollup 用 `postcss-preserve` 抽成 `.css`，用 `tsc` 构建会丢掉产物，rspack 报 `Failed to resolve ./styles/index.scss`；
- `@block-kit/utils` 的 `hooks.js` 依赖 `react` 但未声明，link 后 Node 解析失败。

**结论：BlockKit 的改动仍走正常发版流程，业务侧只消费版本号。**

### 9.6 行为验证

浏览器端（headless Chrome + CDP 派发真实鼠标键盘事件）实测：

| 操作 | 文本 | canUndo | canRedo |
|---|---|---|---|
| 进入编辑态 | — | false | false |
| 输入 ABC | ABC 出现 | **true** | false |
| Ctrl+Z | ABC 消失 | **false** | true |
| 再按 Ctrl+Z ×5 | 不变 | false | true |
| Ctrl+Shift+Z | ABC 恢复 | true | **false** |

另外，双击撤销/重做按钮不再丢焦点：撤销执行后按钮变 `disabled`，而禁用元素不接收鼠标事件，双击第二下会落到外层 `body` 上 —— 已在 `.cv-history` 容器与 `HistoryBar` 容器上补 `onMouseDown` → `preventDefault()` 兜底。

### 9.7 测试现状

共 60 例（utils 1 + json 6 + core 35 + react 18），全部通过。

| 文件 | 变化 |
|---|---|
| `core/test/key.test.ts` | 删除 2 例焦点路由；新增「无视焦点，始终驱动主栈」1 例 |
| `react/test/text-history.test.ts` | 新增 `subscribe` 生效 / 取消订阅 2 例 |
| `react/test/text-module.test.ts` | 按 effect 重写：逐条登记、`MERGE` 不记、`MERGE_DROP` 丢弃、无匹配条目不丢 |



