import type { ContentChangeEvent } from "../event/types";
import type { ElementState } from "../model";
import type { CommandContext } from "../command";

/** 插件可介入的调用点 */
export const PLUGIN_CALLER = {
  ON_COMMAND: "onCommand",
  ON_CONTENT_CHANGE: "onContentChange",
  ON_RENDER: "onRender",
} as const;

/** 调用点类型 */
export type PluginCaller = (typeof PLUGIN_CALLER)[keyof typeof PLUGIN_CALLER];

/** 渲染上下文 */
export type RenderContext = {
  /** 元素状态 */
  state: ElementState;
  /** 内联样式 */
  style: Record<string, string | number>;
  /** 类名 */
  classList: string[];
};

/** 插件上下文映射 */
export type CallerMap = {
  onCommand: CommandContext;
  onContentChange: ContentChangeEvent;
  onRender: RenderContext;
};

/** 优先级属性 key 前缀 */
const PRIORITY_PREFIX = "__PRIORITY__";

/**
 * 核心插件
 * - 作用于数据与行为层
 * - 视图插件在 @cv/react 中实现
 */
export abstract class CorePlugin {
  /** 插件唯一标识 */
  public abstract readonly key: string;
  /** 是否处理该元素 */
  public abstract match(state: ElementState): boolean;
  /** 销毁 */
  public destroy(): void {}

  /** 命令拦截，可填充 ops 以接管 */
  public onCommand?(ctx: CommandContext): CommandContext;

  /** 内容变更后回调 */
  public onContentChange?(ctx: ContentChangeEvent): void;

  /** 渲染钩子，可注入样式与类名 */
  public onRender?(ctx: RenderContext): RenderContext;
}

/**
 * 优先级装饰器
 * @param priority 数值越大越先执行
 */
export function Priority(priority: number) {
  return function (target: CorePlugin, key: PluginCaller, descriptor: PropertyDescriptor) {
    const plugin = target as unknown as Record<string, number>;
    plugin[`${PRIORITY_PREFIX}${key}`] = priority;
    return descriptor;
  };
}

/**
 * 获取插件在某个调用点的优先级
 * @param key 调用点
 * @param plugin 插件
 */
export const getPluginPriority = (key: PluginCaller, plugin: CorePlugin): number => {
  const value = (plugin as unknown as Record<string, number>)[`${PRIORITY_PREFIX}${key}`];
  return typeof value === "number" ? value : 0;
};

/**
 * 插件容器
 */
export class Plugin {
  /** 当前注册的插件 */
  public current: CorePlugin[] = [];
  /** 按调用点缓存的排序结果 */
  private cache: Record<string, CorePlugin[]> = {};

  /** 批量注册插件 */
  public register(plugins: CorePlugin[]): void {
    this.reset();
    this.current = [...plugins];
  }

  /** 重置 */
  public reset(): void {
    this.current.forEach(plugin => plugin.destroy());
    this.current = [];
    this.cache = {};
  }

  /**
   * 获取某调用点下具备该方法的插件，按优先级降序
   * @param key 调用点
   */
  public getPriorityPlugins<T extends PluginCaller>(key: T): CorePlugin[] {
    const cache = this.cache[key];
    if (cache) return cache;
    const plugins = this.current
      .filter(plugin => typeof plugin[key] === "function")
      .sort((a, b) => getPluginPriority(key, b) - getPluginPriority(key, a));
    this.cache[key] = plugins;
    return plugins;
  }

  /**
   * 依次调度插件
   * - 返回值可被后续插件继续修改
   */
  public call<T extends PluginCaller>(key: T, payload: CallerMap[T]): CallerMap[T] {
    const plugins = this.getPriorityPlugins(key);
    let context = payload;
    for (const plugin of plugins) {
      try {
        const fn = plugin[key] as ((ctx: CallerMap[T]) => CallerMap[T] | void) | undefined;
        const next = fn && fn(context);
        if (next) context = next;
      } catch (error) {
        console.error(`[cv:plugin] ${plugin.key}.${key}`, error);
      }
    }
    return context;
  }

  /** 销毁 */
  public destroy(): void {
    this.reset();
  }
}
