import type { Op as DeltaOp } from "@block-kit/delta";
import type { Op, ResumeDoc, ResumeNode } from "@re/json";
import { JSONDocument, serializeDelta } from "@re/json";

import { Command } from "../command";
import { EDITOR_EVENT } from "../event/types";
import { EventBus } from "../event/bus";
import { History } from "../history";
import type { HistoryEntry } from "../history";
import { Interaction } from "../interaction";
import { Key } from "../key";
import { LOG_LEVEL, Logger } from "../log";
import { ModeManager } from "../mode";
import { Model } from "../model";
import { CanvasModule } from "../module/canvas";
import { ModuleManager } from "../module";
import type { EditorModule } from "../module";
import { Overlay } from "../overlay";
import { Plugin } from "../plugin";
import { Renderer } from "../renderer";
import { Selection } from "../selection";
import { APPLY_SOURCE, EDITOR_STATE } from "../utils/constant";
import type { ApplySource, EditorStateKey } from "../utils/constant";
import { View } from "../view";
import type { EditorOptions } from "./types";

/**
 * 编辑器
 * - 无框架依赖，所有 DOM 通过外部 ref 注册进来
 * - 负责装配子模块与管理生命周期
 */
export class Editor {
  /** 文档数据源 */
  public readonly document: JSONDocument;
  /** 视口模块 */
  public readonly view: View;
  /** 模型模块 */
  public readonly model: Model;
  /** 渲染模块 */
  public readonly renderer: Renderer;
  /** 覆盖层 */
  public readonly overlay: Overlay;
  /** 选中模块 */
  public readonly selection: Selection;
  /** 模式模块 */
  public readonly mode: ModeManager;
  /** 事件模块 */
  public readonly event: EventBus;
  /** 历史模块 */
  public readonly history: History;
  /** 模块管理 */
  public readonly module: ModuleManager;
  /** 插件模块 */
  public readonly plugin: Plugin;
  /** 命令模块 */
  public readonly command: Command;
  /** 日志模块 */
  public readonly logger: Logger;
  /** 交互模块 */
  public readonly interaction: Interaction;
  /** 快捷键模块 */
  public readonly key: Key;
  /** 画布撤销模块，持有 op 级撤销栈 */
  public readonly canvas: CanvasModule;
  /** 内置状态 */
  private status: Map<EditorStateKey, boolean> = new Map();
  /** 文档代数，整文档替换时自增，驱动视图重建 */
  public docVersion = 0;
  /** 当前插入工具，由导航栏设置，Interaction 消费后置空 */
  public tool: string | null = null;
  /** 工具插入回调，由 UI 层注册 */
  public onToolInsert: ((type: string, x: number, y: number) => void) | null = null;
  /** 容器 */
  private container: HTMLElement | null = null;

  public constructor(options: EditorOptions = {}) {
    this.logger = new Logger(options.logLevel ?? LOG_LEVEL.WARNING);
    if (!options.doc && !options.data) {
      throw new Error("Editor requires either `doc` or `data`.");
    }
    this.document = options.doc || new JSONDocument(options.data!);
    this.event = new EventBus();
    this.view = new View(this);
    this.model = new Model(() => this.document.get());
    this.renderer = new Renderer(this);
    this.plugin = new Plugin();
    this.selection = new Selection(this);
    this.overlay = new Overlay(this);
    this.mode = new ModeManager(this);
    this.module = new ModuleManager();
    this.history = new History();
    this.command = new Command(this);
    this.interaction = new Interaction(this);
    this.key = new Key(this);
    this.canvas = new CanvasModule(this);
    this.module.register(this.canvas);
    // 快捷键是全局事件，构造即绑定，不依赖挂载顺序与焦点归属
    this.key.bind();
    this.plugin.register(options.plugins || []);
    options.modules && options.modules.forEach(module => this.module.register(module));
    this.set(EDITOR_STATE.READONLY, !!options.readonly);
  }

  /** 读取状态 */
  public getState(key: EditorStateKey): boolean {
    return !!this.status.get(key);
  }

  /** 写入状态 */
  public set(key: EditorStateKey, value: boolean): this {
    this.status.set(key, value);
    return this;
  }

  /** 是否只读 */
  public isReadonly(): boolean {
    return !!this.status.get(EDITOR_STATE.READONLY);
  }

  /** 挂载容器，由 React 的 ref 调用 */
  public mount(container: HTMLElement): void {
    if (this.getState(EDITOR_STATE.MOUNTED)) {
      this.logger.warning("Editor already mounted, unmount first.");
      this.unmount();
    }
    this.container = container;
    container.setAttribute("data-cv-editor", "true");
    this.set(EDITOR_STATE.MOUNTED, true);
    this.view.mount(container);
    this.interaction.bind();
    // 快捷键在构造时已绑定，重新挂载时避免重复绑定
    this.key.unbind();
    this.key.bind();
    this.event.trigger(EDITOR_EVENT.MOUNT, {});
  }

  /** 卸载容器 */
  public unmount(): void {
    this.interaction.unbind();
    this.key.destroy();
    this.view.destroy();
    this.set(EDITOR_STATE.MOUNTED, false);
    this.container = null;
  }

  /** 注册页面内的覆盖层 */
  public mountOverlay(root: HTMLElement): void {
    this.overlay.mount(root);
    this.overlay.patch();
  }

  /**
   * 提交变更
   * - 所有数据写入都会经过这里，保证 Model 与 DOM 同步
   * @param ops ot-json 操作
   * @param source 变更来源
   * @param undoable 是否可撤销
   */
  public submit(ops: Op[], source: ApplySource = APPLY_SOURCE.USER, undoable = true): void {
    if (!ops.length) return;
    // 只读态只允许系统来源（如导出前的尺寸回写）写入，用户与历史回放一律忽略
    if (this.isReadonly() && source !== APPLY_SOURCE.SYSTEM) return;
    this.document.submit(ops);
    this.model.sync(ops);
    const ids = this.collectIds(ops);
    ids.forEach(id => {
      const state = this.model.get(id);
      state && this.renderer.patch(state);
    });
    this.overlay.patch();
    const change = {
      current: this.document.get(),
      ops,
      source,
      ids,
      undoable,
    };
    this.plugin.call("onContentChange", change);
    this.event.trigger(EDITOR_EVENT.CONTENT_CHANGE, change);
    this.event.trigger(EDITOR_EVENT.PAINT, {});
  }

  /**
   * 提交文本内容变更
   * - 走 ot-json 的 delta 子类型，保证可反转
   * @param id 文本节点 id
   * @param next 新的 delta
   * @param undoable 是否记录到主栈，文本编辑态下由模块自己维护
   */
  public submitDelta(id: string, next: DeltaOp[], undoable = true): void {
    const node = this.document.getNode(id);
    if (!node || node.type !== "text") return;
    if (serializeDelta(node.delta) === serializeDelta(next)) return;
    const ops = this.document.submitDelta(id, next);
    this.model.sync(ops);
    this.renderer.patchPage();
    const change = {
      current: this.document.get(),
      ops,
      source: APPLY_SOURCE.USER,
      ids: [id],
      undoable,
    };
    this.event.trigger("CONTENT_CHANGE", change);
  }

  /**
   * 整体替换文档
   * - 用于导入、切换模板
   * @param doc 新文档
   */
  public loadDocument(doc: ResumeDoc): void {
    this.docVersion += 1;
    this.document.load(doc);
    this.model.rebuild();
    this.selection.clear();
    this.mode.exitTextEdit();
    this.history.clear();
    this.module.clear();
    this.view.layout();
    this.renderer.patchPage();
    this.notifyHistory();
    this.event.trigger("CONTENT_CHANGE", {
      current: this.document.get(),
      ops: [],
      source: APPLY_SOURCE.SYSTEM,
      ids: [],
      undoable: false,
    });
  }

  /**
   * 在页面下插入节点
   * - 同时更新父节点的 children 与 nodes 索引
   * @param node 完整节点数据
   * @returns 新节点 id
   */
  public insertNode(node: ResumeNode): string | null {
    const parentId = node.parent || this.document.get().root;
    const parent = this.model.get(parentId);
    if (!parent) return null;
    const ops: Op[] = [
      // 列表插入的 path 必须包含插入位置
      { p: ["nodes", parentId, "children", parent.children.length], li: node.id },
      { p: ["nodes", node.id], oi: node },
    ];
    if (!this.isReadonly()) {
      this.canvas.record(ops);
      this.history.record(this.canvas.key, node.id);
      this.notifyHistory();
    }
    this.submit(ops, APPLY_SOURCE.USER, true);
    return node.id;
  }

  /**
   * 撤销
   * - 主栈弹出条目，按 type 找模块执行
   * - 模块找不到（如文本块已被删除）时跳过，继续弹下一条
   */
  public undo(): void {
    if (this.isReadonly()) return;
    let entry = this.history.undo();
    while (entry) {
      const module = this.resolveModule(entry);
      if (module) {
        module.undo();
        this.notifyHistory();
        return;
      }
      entry = this.history.undo();
    }
    this.notifyHistory();
  }

  /**
   * 重做
   * - 与 `undo` 对称，模块不存在时跳过
   */
  public redo(): void {
    if (this.isReadonly()) return;
    let entry = this.history.redo();
    while (entry) {
      const module = this.resolveModule(entry);
      if (module) {
        module.redo();
        this.notifyHistory();
        return;
      }
      entry = this.history.redo();
    }
    this.notifyHistory();
  }

  /**
   * 找到条目对应的模块
   * - 同 key 可能有多个实例（每个文本块一个），优先按 id 精确匹配
   * - 找不到精确实例时退回同 key 的最新实例（如画布模块）
   * @param entry 主栈条目
   */
  private resolveModule(entry: HistoryEntry): EditorModule | null {
    const list = this.module.getList(entry.type);
    return list.find(module => module.id === entry.id) || list[list.length - 1] || null;
  }

  /** 广播历史状态，供 UI 刷新 */
  public notifyHistory(): void {
    this.event.trigger(EDITOR_EVENT.HISTORY_CHANGE, {
      canUndo: this.history.canUndo(),
      canRedo: this.history.canRedo(),
    });
  }

  /** 从 ops 中提取受影响的节点 id */
  public collectIds(ops: Op[]): string[] {
    const ids = new Set<string>();
    ops.forEach(op => {
      if (op.p[0] === "nodes" && op.p[1] !== undefined) ids.add(String(op.p[1]));
      op.li && typeof op.li === "object" && "id" in op.li && ids.add(String(op.li.id));
      op.oi && typeof op.oi === "object" && "id" in op.oi && ids.add(String(op.oi.id));
    });
    return [...ids];
  }

  /** 获取容器 */
  public getContainer(): HTMLElement | null {
    return this.container;
  }

  /** 销毁 */
  public destroy(): void {
    this.unmount();
    this.interaction.destroy();
    this.key.destroy();
    this.mode.destroy();
    this.overlay.destroy();
    this.selection.destroy();
    this.history.destroy();
    this.module.destroy();
    this.plugin.destroy();
    this.renderer.destroy();
    this.model.destroy();
    this.event.clear();
    this.set(EDITOR_STATE.MOUNTED, false);
  }
}
