import type { Op } from "@cv/json";
import { JSONDocument } from "@cv/json";
import type { ResumeDoc } from "@cv/json";

import { Command } from "../command";
import { EDITOR_EVENT } from "../event/types";
import { EventBus } from "../event/bus";
import { History } from "../history";
import { Interaction } from "../interaction";
import { LOG_LEVEL, Logger } from "../log";
import { ModeManager } from "../mode";
import { Model } from "../model";
import { ModuleManager } from "../module";
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
  /** 内置状态 */
  private status: Map<EditorStateKey, boolean> = new Map();
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
    this.module = new ModuleManager(this);
    this.history = new History(this);
    this.command = new Command(this);
    this.interaction = new Interaction(this);
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
    this.event.trigger(EDITOR_EVENT.MOUNT, {});
  }

  /** 卸载容器 */
  public unmount(): void {
    this.interaction.unbind();
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

  /** 从 ops 中提取受影响的节点 id */
  private collectIds(ops: Op[]): string[] {
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
