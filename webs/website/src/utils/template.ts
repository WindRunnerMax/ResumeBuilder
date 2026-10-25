import type { ResumeDoc } from "@re/json";

/** 模板配置 */
export type TemplateConfig = {
  /** 模板 id */
  key: string;
  /** 展示名 */
  name: string;
  /** 缩略图地址 */
  image: string;
};

/** 缩略图基础路径，使用相对路径以兼容子路径部署 */
const THUMB_BASE = "./template/";

/** 模板清单，顺序与左侧面板一致 */
export const TEMPLATE_CONFIG: TemplateConfig[] = [
  { key: "Czy", name: "FE-Czy", image: `${THUMB_BASE}Czy.jpeg` },
  { key: "Hty", name: "FE-Hty", image: `${THUMB_BASE}Hty.jpeg` },
  { key: "Lbz", name: "FE-Lbz", image: `${THUMB_BASE}Lbz.jpeg` },
  { key: "Lmz", name: "BE-Lmz", image: `${THUMB_BASE}Lmz.jpeg` },
  { key: "Wxy", name: "FE-Wxy", image: `${THUMB_BASE}Wxy.jpeg` },
  { key: "Lch", name: "SEC-Lch", image: `${THUMB_BASE}Lch.jpeg` },
];

/** 模板数据加载器，交由打包器拆成独立 chunk，点击时才下载 */
const TEMPLATE_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  Czy: () => import("../templates/Czy.json"),
  Hty: () => import("../templates/Hty.json"),
  Lbz: () => import("../templates/Lbz.json"),
  Lmz: () => import("../templates/Lmz.json"),
  Wxy: () => import("../templates/Wxy.json"),
  Lch: () => import("../templates/Lch.json"),
};

/**
 * 懒加载模板文档
 * - 模板 JSON 体积较大，改为动态导入，避免首屏加载全部模板
 * @param key 模板 id
 * @returns 模板文档副本，未找到时返回 null
 */
export const loadTemplate = async (key: string): Promise<ResumeDoc | null> => {
  const loader = TEMPLATE_LOADERS[key];
  if (!loader) return null;
  const mod = await loader();
  // 拷贝一份，避免多份引用共享同一份数据
  return JSON.parse(JSON.stringify(mod.default)) as ResumeDoc;
};
