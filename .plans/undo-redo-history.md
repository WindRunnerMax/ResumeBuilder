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
- `packages/react/src/hooks/use-history.ts`：`canUndo = editor.history.canUndo()`（主栈即全局真值）。

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
