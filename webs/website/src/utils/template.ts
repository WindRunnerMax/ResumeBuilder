import type { ResumeDoc } from "@cv/json";

import czy from "../templates/Czy.json";
import hty from "../templates/Hty.json";
import lbz from "../templates/Lbz.json";
import lch from "../templates/Lch.json";
import lmz from "../templates/Lmz.json";
import wxy from "../templates/Wxy.json";

/** 模板配置 */
export type TemplateConfig = {
  /** 模板 id */
  key: string;
  /** 展示名 */
  name: string;
  /** 缩略图地址 */
  image: string;
  /** 文档数据 */
  doc: ResumeDoc;
};

/** 缩略图基础路径 */
const THUMB_BASE = "/template/";

/** 模板清单，顺序与左侧面板一致 */
export const TEMPLATE_CONFIG: TemplateConfig[] = [
  { key: "Czy", name: "FE-Czy", image: `${THUMB_BASE}Czy.jpeg`, doc: czy as unknown as ResumeDoc },
  { key: "Hty", name: "FE-Hty", image: `${THUMB_BASE}Hty.jpeg`, doc: hty as unknown as ResumeDoc },
  { key: "Lbz", name: "FE-Lbz", image: `${THUMB_BASE}Lbz.jpeg`, doc: lbz as unknown as ResumeDoc },
  { key: "Lmz", name: "BE-Lmz", image: `${THUMB_BASE}Lmz.jpeg`, doc: lmz as unknown as ResumeDoc },
  { key: "Wxy", name: "FE-Wxy", image: `${THUMB_BASE}Wxy.jpeg`, doc: wxy as unknown as ResumeDoc },
  { key: "Lch", name: "SEC-Lch", image: `${THUMB_BASE}Lch.jpeg`, doc: lch as unknown as ResumeDoc },
];

/**
 * 拷贝一份模板文档，避免多份引用共享同一份数据
 * @param key 模板 id
 */
export const loadTemplate = (key: string): ResumeDoc | null => {
  const config = TEMPLATE_CONFIG.find(item => item.key === key);
  if (!config) return null;
  return JSON.parse(JSON.stringify(config.doc)) as ResumeDoc;
};
