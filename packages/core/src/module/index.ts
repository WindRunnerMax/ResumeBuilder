import type { Path } from "@block-kit/ot-json";

import type { Editor } from "../editor";

/** 模块快照，用于主栈占位时记录前后状态 */
export type ModuleSnapshot = unknown;

/**
 * 可独立持有撤销栈的模块
 * - 主栈记录完整内容，模块栈记录局部粒度
 * - 参考飞书的 module 机制
 */
export abstract class EditorModule {
  /** 模块唯一标识，如 "text" */
  public abstract readonly key: string;
  /** 模块作用路径，如 ["nodes", id] */
  public abstract get prefix(): Path;
  /** 是否可撤销 */
  public abstract canUndo(): boolean;
  /** 是否可重做 */
  public abstract canRedo(): boolean;
  /** 撤销 */
  public abstract undo(): void;
  /** 重做 */
  public abstract redo(): void;
  /** 获取快照 */
  public abstract getSnapshot(): ModuleSnapshot;
  /** 是否为当前活跃模块 */
  public abstract isActive(): boolean;
  /** 销毁 */
  public abstract destroy(): void;
}

/**
 * 模块管理器
 * - 按 key + 路径调度模块
 */
export class ModuleManager {
  /** 已注册模块 */
  private modules: EditorModule[] = [];

  public constructor(private editor: Editor) {}

  /** 注册模块 */
  public register(module: EditorModule): void {
    const exist = this.modules.findIndex(item => item.key === module.key);
    exist > -1 && this.modules.splice(exist, 1);
    this.modules.push(module);
  }

  /** 注销模块 */
  public unregister(key: string): void {
    this.modules = this.modules.filter(item => item.key !== key);
  }

  /**
   * 按 key 与路径查找模块
   * - 路径前缀匹配
   */
  public get(key: string, path: Path): EditorModule | null {
    return (
      this.modules.find(module => {
        if (module.key !== key) return false;
        const prefix = module.prefix;
        if (prefix.length > path.length) return false;
        return prefix.every((item, index) => String(item) === String(path[index]));
      }) || null
    );
  }

  /** 解析当前活跃模块（焦点所在） */
  public resolveActive(): EditorModule | null {
    return this.modules.find(module => module.isActive()) || null;
  }

  /** 获取所有模块 */
  public getAll(): EditorModule[] {
    return this.modules;
  }

  /** 销毁 */
  public destroy(): void {
    this.modules.forEach(module => module.destroy());
    this.modules = [];
  }
}
