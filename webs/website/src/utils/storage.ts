import type { ResumeDoc } from "@re/json";

/** 本地存储 key */
export const STORAGE_KEY = "__cv-resume-document";

/**
 * 读取本地文档
 */
export const loadDocument = (): ResumeDoc | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ResumeDoc) : null;
  } catch {
    return null;
  }
};

/**
 * 写入本地文档
 * @param doc 文档
 */
export const saveDocument = (doc: ResumeDoc): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch (error) {
    console.warn("[cv] save document failed", error);
  }
};
