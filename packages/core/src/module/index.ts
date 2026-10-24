/**
 * 可独立持有撤销栈的模块
 * - 主栈只记录 `{ type, id, time }`，操作内容与撤销粒度由模块自己维护
 * - 新增模块只需实现本接口并注册，主栈无需感知操作类型
 */
export abstract class EditorModule {
  /** 模块唯一标识，如 "canvas" | "text" */
  public abstract readonly key: string;
  /** 作用对象 id，同 key 的不同实例按此区分，如文本块 id */
  public abstract readonly id: string;
  /** 是否可撤销 */
  public abstract canUndo(): boolean;
  /** 是否可重做 */
  public abstract canRedo(): boolean;
  /** 撤销 */
  public abstract undo(): void;
  /** 重做 */
  public abstract redo(): void;
  /** 清空模块自身的栈 */
  public abstract clear(): void;
  /** 销毁 */
  public abstract destroy(): void;
}

/**
 * 模块管理器
 * - 按 key 调度模块，主栈只依赖 key
 */
export class ModuleManager {
  /** 已注册模块 */
  private modules: EditorModule[] = [];

  /**
   * 注册模块
   * - 同 key 且同一作用对象（id）时覆盖，其余情况保留
   * - 文本块按 id 区分，画布模块只有一份
   */
  public register(module: EditorModule): void {
    const exist = this.modules.findIndex(item => item.key === module.key && item.id === module.id);
    exist > -1 && this.modules.splice(exist, 1);
    this.modules.push(module);
  }

  /** 注销模块，按实例注销，避免误删同 key 的其他实例 */
  public unregister(module: EditorModule): void {
    this.modules = this.modules.filter(item => item !== module);
  }

  /** 按 key 取出所有模块，如多个文本块共用 "text" */
  public getList(key: string): EditorModule[] {
    return this.modules.filter(module => module.key === key);
  }

  /** 按 key 查找模块，多个同 key 时取最新注册的 */
  public get(key: string): EditorModule | null {
    const list = this.getList(key);
    return list[list.length - 1] || null;
  }

  /** 获取所有模块 */
  public getAll(): EditorModule[] {
    return this.modules;
  }

  /** 清空所有模块的栈 */
  public clear(): void {
    this.modules.forEach(module => module.clear());
  }

  /** 销毁 */
  public destroy(): void {
    this.modules.forEach(module => module.destroy());
    this.modules = [];
  }
}
