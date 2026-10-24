# 飞书文档 undoModule 逆向整理

分析对象：`lf-package-cn.feishucdn.com/obj/feishu-static/eesz/bear/docx/module/ee/docs/docx/1.0.18.836/index_merged_es6.js`

数据来源：在真实文档页面上通过 CDP 读取运行时实例，并派发真实鼠标键盘事件观察栈变化。文档为「测试空文档」，含一段正文、一个画板块。

---

## 1. 三层结构

```
PageMain.undoModule                      文档级协调者（undoService）
 ├─ undoDispatcher                      主栈 + 派发器
 │   ├─ stack
 │   │   ├─ undoStack: [Ct{_id}]
 │   │   └─ redoStack: [Ct{_id}]
 │   └─ undoModules: Map<id, Module>     id → 执行者
 ├─ 文本模块 fb0a0dcd-…                  快照式，自持栈
 └─ 画板模块 ec0e8b69-…                  代理式，委托给画板自己的 undoRedoManager
```

主栈元素是 `Ct` 类，只有一个 `_id` 字段和 `id()` 方法：

```js
class Ct {
  constructor(id) { this._id = id; }
  id() { return this._id; }
}
```

主栈不存操作内容、不存时间戳、不存快照。撤销时弹出一条，用 `id` 去 `undoModules` 找到模块，调 `module.onUndo()`。

`undoDispatcher` 的核心方法：

```js
undo() {
  const top = this.stack.getUndoStackTop();
  if (top && this.shouldUndo && !this.shouldUndo(top.id())) return;  // 业务否决
  const entry = this.stack.undo();                                   // undo → redo
  if (!entry) return;
  const id = entry.id();
  const module = this.undoModules.get(id);
  return module ? { id, element: module.onUndo() } : undefined;      // 找不到就跳过
}

do(id, options) {
  const module = this.undoModules.get(id);
  if (options === undefined) { this.stack.do(id); return true; }
  if (options.undoable === false) {                                  // 非撤销变更
    this.updateTransformBase(options.operations, id);
    return false;
  }
  const top = this.stack.getUndoStackTop();
  if (module.do) {
    const isTopRef = !top || id === top.id();
    module.do(options, isTopRef)                                       // 相邻同模块交给模块自己合并
      ? this.stack.clearRedoStack()
      : (this.stack.do(id), true);
  }
}
```

---

## 2. 文本模块（fb0a0dcd）

### 2.1 记录结构

```js
{
  operations: [{
    record: { id, snapshot: {...完整文本块快照...} },          // 应用后
    ops: [{ p: ["text"], action: {}, subType: { t: "easysync", o: {...} } }],
    createTime,
    snapshotBeforeApply: {...完整文本块快照...}               // 应用前
  }],
  transformBase: [],          // 非 undoable 变更累积的 ops
  timestamp,
  options: {
    selection: {
      prev: [{ id, type: "text", selection: { start, end }, recordId }],
      next: [{ id, type: "text", selection: { start, end }, recordId }]
    },
    applyOptions: { type: "flushInput", from: "local", transactionName, transactionFrame }
  }
}
```

要点：

- **存双快照**，不是 delta 逆运算。`snapshotBeforeApply` 用于回滚，`snapshot` 用于重做。
- `ops` 里是 **easysync changeset**（Etherpad 系格式，如 `"Z:e<3=b-3$"`），不是 ot-json。
- `selection.prev / next` 分别对应撤销时和重做时光标位置。
- `transformBase` 为空表示本次记录没有被非撤销变更干扰。

### 2.2 合并

`mergeGap = 700`（毫秒），`enableMergeOverTransformBase = true`。

```js
_shouldComposeElement(next, top, mergeMode) {
  return mergeMode !== SPLIT
    && top.undoable !== false
    && !(!this.enableMergeOverTransformBase && top.transformBase)
    && (mergeMode === MERGE || !(next.timestamp - top.timestamp > this.mergeGap));
}
```

合并时的操作：先把新 op 用 `transformBase` 变换到旧坐标，`invert` 之后与栈顶 `compose`，替换栈顶并清空 redo。

实测：连续输入 `ABC`（间隔 200ms）**只产生一条记录**。这是 input 层的 `debounce(1000ms)` 加 `flushInput` 事务名共同作用的结果。

### 2.3 非撤销变更

只读变更、远端变更不进栈，但会让历史 op 的坐标失效。处理方式是把这些 op 记进 `transformBase`，在下次合并时预先 transform。

---

## 3. 画板模块（ec0e8b69）

### 3.1 代理结构

`ec0e8b69` 的 `module.undoStack` **永远是 0**。它是个代理：

```js
module.plugin = { app, ctx, appEnv, externalUndoRedoModule }
// externalUndoRedoModule === module（同一对象引用）
// get canUndo() { return this.plugin.canUndo() }
```

真正的栈在 `module.plugin.app.undoRedoManager`（类名 `tn`）：

```
tn {
  ctx, undoStack, redoStack, afterUndoRedoCallbacks,
  canUndo, canRedo,
  add, mergeLast, registerAfterUndoRedoCallback,
  undo, redo, updateAction, clear, destroy
}
```

### 3.2 记录结构

```js
{
  actionLogs: [ ...N 条日志... ],
  timestamp,
  mergeKey,            // null 表示不参与合并
  mergeIntervalMs,     // 0
  setMerge(),
  reverse()            // 反向日志运行时现算
}
```

单条 log：

```js
{
  type,        // 动作类型枚举
  needSend,    // 是否同步给协同
  data,        // 动作数据（数组或对象）
  reverseLog   // 实测全为 null，说明反向靠 reverse() 现算
}
```

### 3.3 实测：一次拖拽画矩形

主栈 +1，画板内部栈 +1，该记录含 16 条 log：

| 索引 | type | needSend | data |
|---|---|---|---|
| 0 | `0` | false | null — 事务开始 |
| 1–11 | `6` | true | `[{ id: "o3:2", props: [{ type:0, x, y, width, height, angle }, { type:7, sizeMode }] }]` 拖拽每帧 |
| 12 | `6` | true | 同上，最终尺寸 `120×80`, `sizeMode: 1` |
| 13 | `7` | true | 对象（非数组） |
| 14 | `5` | true | `[{ id: "o3:2" }]` |
| 15 | `1` | false | null — 事务结束 |

观察：

- **拖拽每一帧都进日志**（索引 1–11 是 25ms 间隔的中间态：70×92 → 80×100 → 90×108 …）
- 整段拖拽仍算**一次**撤销，因为被 `type:0` / `type:1` 事务包裹，且 `mergeKey` 控制合并
- 本次 `mergeKey: null`、`mergeIntervalMs: 0`，表示没有走合并路径
- `reverseLog` 全为 null，反向操作由 `record.reverse()` 从 `actionLogs` 现算

### 3.4 与文本模块的策略差异

| | 文本模块 | 画板模块 |
|---|---|---|
| 存储 | 双快照（前后各一份） | 操作日志（正向） |
| 反向 | 直接应用 `snapshotBeforeApply` | `reverse()` 现算 |
| 合并 | `mergeGap` 时间窗 + `compose` | `mergeKey` + `mergeIntervalMs` |
| 粒度 | 一次 `flushInput` 一条 | 一次事务一条，内部含 N 条日志 |

原因：文本状态小且需要精确光标定位，快照最省事；图形状态大且日志本身就要发给协同，正向日志更省内存。

---

## 4. 两级栈的同步

实测一次完整往返：

```
初始      main.undo = [fb0a0dcd, ec0e8b69]   main.redo = []
          画板内部   urm.undo = 1 (16 logs)   urm.redo = 0

undo 后   main.undo = [fb0a0dcd]             main.redo = [ec0e8b69]
          画板内部   urm.undo = 0              urm.redo = 1 (16 logs)

redo 后   main.undo = [fb0a0dcd, ec0e8b69]   main.redo = []
          画板内部   urm.undo = 1 (16 logs)   urm.redo = 0
```

主栈挪一格，模块内部栈就挪一格，严格一一对应。

---

## 5. 页面级处理

### 5.1 载入内容不入栈

页面重载后正文是服务端拉取的基线，`undoStack` 为 0。只有本地操作才入栈。

### 5.2 原生 Ctrl+Z 拦截

```js
handleInputEvent(e) {
  const t = e.nativeEvent;
  if (t.inputType === "historyUndo") { this.undo(); e.preventDefault(); e.stopEvent(); }
  else if (t.inputType === "historyRedo") { this.redo(); e.preventDefault(); e.stopEvent(); }
}
```

浏览器原生的 `historyUndo` / `historyRedo` 事件被转给自己的栈。

### 5.3 回环防护

撤销 / 重做过程中产生的内容变更不能再记一次：

```js
handleContentChange(e) {
  if (this.Be()) {                 // contentApplyRuntime.atRuntime && runtimeStack[0].type ∈ {undo, redo}
    const rec = (type === undo ? this.Ne : this.Ce).getNthFromTop(0);
    if (rec) rec.selection = this.Ae;   // 只回填 selection，不新增记录
    return;
  }
  ...
}
```

### 5.4 事务期间拒绝撤销

```js
undo() {
  if (this.inTransaction) return;                      // 正在应用中
  if (this.embedUndoDispatcher) return this.embedUndoDispatcher.undo();  // 嵌入块接管
  ...
}
```

`beforeChange` 置 `inTransaction = true`，`change` 置回 `false`。

---

## 6. 与本项目对照

| 维度 | 飞书 | 本项目 |
|---|---|---|
| 主栈条目 | `Ct{ _id }`，纯 id | `{ type, id, time }` |
| 主栈定位 | `undoModules: Map<id, Module>` | `ModuleManager` 按 `type + id` 查 |
| 文本记录 | 双快照 | BlockKit 自有栈，靠 `HISTORY_EFFECT` 上报 |
| 合并 | input 层 debounce + 模块 `mergeGap` | 模块自行合并，主栈被动接收 |
| 非撤销变更 | `transformBase` 修正坐标 | 直接不记录 |
| 外部组件 | 代理模式（`plugin.app.undoRedoManager`） | 暂无 |

可借鉴的三点：

1. **时间窗合并判定放在子栈记录上，不放主栈**。飞书主栈条目没有时间戳，`mergeGap` 判断的是子栈记录的 `timestamp`。本项目主栈条目带 `time`，但合并逻辑应该在模块侧。
2. **代理模式处理外部组件**。画板一步操作内部有 16 条日志，主栈只看到一条。如果将来接入类似的重编辑器，模块本身不必持栈，转发给对方的 `undoRedoManager` 即可。
3. **`transformBase` 是必需项**。只要存在非撤销变更（远端同步、程序化改写），历史 op 的坐标就会漂移，必须有修正机制。本项目目前没有非撤销变更，暂不受影响。
