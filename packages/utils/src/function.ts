const CHARS = "QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm0123456789";

/**
 * 生成随机 id
 * @param len 长度
 */
export const getUniqueId = (len = 10): string => {
  let result = "";
  for (let i = 0; i < len; ++i) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return result;
};

/**
 * 节流
 * @param fn
 * @param wait 间隔毫秒
 */
export const throttle = <T extends (...args: never[]) => void>(fn: T, wait = 17) => {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  return (...args: Parameters<T>) => {
    lastArgs = args;
    const now = Date.now();
    const remain = wait - (now - last);
    if (remain <= 0) {
      last = now;
      fn(...args);
      return void 0;
    }
    if (timer) return void 0;
    timer = setTimeout(() => {
      last = Date.now();
      timer = null;
      lastArgs && fn(...lastArgs);
    }, remain);
  };
};

/**
 * 防抖
 * @param fn
 * @param wait 延迟毫秒
 */
export const debounce = <T extends (...args: never[]) => void>(fn: T, wait = 300) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    timer && clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, wait);
  };
};

/**
 * 深拷贝，仅支持可 JSON 序列化的结构
 * @param value
 */
export const clone = <T>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

/**
 * 下一帧执行
 * @param fn
 */
export const nextFrame = (fn: () => void): number => {
  return requestAnimationFrame(() => fn());
};

/**
 * 类名拼接
 * @param list
 */
export const cs = (...list: (string | false | null | undefined)[]): string => {
  return list.filter(Boolean).join(" ");
};
