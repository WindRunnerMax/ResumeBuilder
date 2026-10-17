import type { EventKey, EventMap } from "./types";

/** 事件监听器 */
export type Listener<T extends EventKey> = (payload: EventMap[T]) => void;

/** 监听器包装 */
type Handler<T extends EventKey> = {
  once: boolean;
  priority: number;
  listener: Listener<T>;
};

/** 监听器映射 */
type Listeners = Partial<Record<EventKey, Handler<EventKey>[]>>;

/**
 * 事件总线，支持优先级与 once
 */
export class EventBus {
  /** 监听器集合 */
  private listeners: Listeners = {};

  /** 注册监听 */
  public on<T extends EventKey>(key: T, listener: Listener<T>, priority = 0): void {
    this.add(key, listener, priority, false);
  }

  /** 注册一次性监听 */
  public once<T extends EventKey>(key: T, listener: Listener<T>, priority = 0): void {
    this.add(key, listener, priority, true);
  }

  /** 添加监听器 */
  private add<T extends EventKey>(key: T, listener: Listener<T>, priority: number, once: boolean) {
    const handlers = (this.listeners[key] || []) as Handler<T>[];
    if (handlers.some(item => item.listener === listener)) return;
    handlers.push({ listener, priority, once });
    handlers.sort((a, b) => a.priority - b.priority);
    this.listeners[key] = handlers as Handler<EventKey>[];
  }

  /** 移除监听 */
  public off<T extends EventKey>(key: T, listener: Listener<T>): void {
    const handlers = this.listeners[key] as Handler<T>[] | undefined;
    if (!handlers) return;
    this.listeners[key] = handlers.filter(item => item.listener !== listener) as Handler<EventKey>[];
  }

  /** 触发事件 */
  public trigger<T extends EventKey>(key: T, payload: EventMap[T]): void {
    const handlers = this.listeners[key] as Handler<T>[] | undefined;
    if (!handlers) return;
    // 复制一份，避免监听器内部增删导致遍历异常
    [...handlers].forEach(item => {
      item.listener(payload);
      item.once && this.off(key, item.listener);
    });
  }

  /** 清空所有监听 */
  public clear(): void {
    this.listeners = {};
  }
}
