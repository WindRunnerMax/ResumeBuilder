import type { ResumeNode } from "@cv/json";
import type { FC, ReactNode } from "react";

/** 元素视图属性 */
export type ElementViewProps = {
  /** 元素数据 */
  node: ResumeNode;
  /** 子元素 */
  children?: ReactNode;
};

/** 元素视图注册表，按节点类型分发 */
const VIEWS: Record<string, FC<ElementViewProps>> = {};

/**
 * 注册某类节点的视图
 * @param type 节点类型
 * @param component 视图组件
 */
export const registerElementView = (type: string, component: FC<ElementViewProps>): void => {
  VIEWS[type] = component;
};

/**
 * 获取节点视图
 * @param type 节点类型
 */
export const getElementView = (type: string): FC<ElementViewProps> | null => {
  return VIEWS[type] || null;
};
