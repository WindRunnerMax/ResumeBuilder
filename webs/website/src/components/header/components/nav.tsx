import type { RectNode, ResumeNode, TextNode } from "@cv/json";
import { NODE_TYPE } from "@cv/json";
import { useEditor } from "@cv/react";
import type { FC } from "react";
import React, { useState } from "react";

import { getUniqueId } from "@cv/utils";

import { CursorIcon, GrabIcon, ImageIcon, RectIcon, TextIcon } from "../../../static/icons";

/** 导航栏工具 */
export const NAV_ENUM = {
  /** 默认，选择 */
  DEFAULT: "DEFAULT",
  /** 抓手，拖拽平移画布 */
  GRAB: "GRAB",
  /** 矩形 */
  RECT: "RECT",
  /** 图片 */
  IMAGE: "IMAGE",
  /** 文本 */
  TEXT: "TEXT",
} as const;

/** 选择 / 抓手，用于切换画布交互模式 */
const MODE_ITEMS: Array<{ key: string; label: string; icon: React.ReactNode }> = [
  { key: NAV_ENUM.DEFAULT, label: "选择", icon: <CursorIcon /> },
  { key: NAV_ENUM.GRAB, label: "抓手（拖拽平移画布）", icon: <GrabIcon /> },
];

/** 插入类工具，点击即在画布中央插入节点 */
const INSERT_ITEMS: Array<{ key: string; label: string; icon: React.ReactNode }> = [
  { key: NAV_ENUM.RECT, label: "矩形", icon: <RectIcon /> },
  { key: NAV_ENUM.IMAGE, label: "图片", icon: <ImageIcon /> },
  { key: NAV_ENUM.TEXT, label: "文本", icon: <TextIcon /> },
];

/** 插入节点尺寸 */
const SIZE = {
  TEXT: { width: 200, height: 30 },
  RECT: { width: 200, height: 120 },
  IMAGE: { width: 100, height: 100 },
} as const;

/** SVG 字符串转 dataURL */
const svgToBase64 = (svg: string): string => {
  const cleaned = svg.replace(/\s+/g, " ").trim();
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(cleaned)))}`;
};

/** 新插入图片的占位图，参考 CanvasEditor */
const DEFAULT_IMAGE = svgToBase64(
  `<svg viewBox="-530 -530 2048 2048" xmlns="http://www.w3.org/2000/svg" width="300" height="300"><path d="M0 192c0-70.6 57.4-128 128-128h768c70.6 0 128 57.4 128 128v640c0 70.6-57.4 128-128 128H128c-70.6 0-128-57.4-128-128V192z m647.6 213c-9-13.2-23.8-21-39.6-21s-30.8 7.8-39.6 21l-174 255.2-53-66.2c-9.2-11.4-23-18-37.4-18s-28.4 6.6-37.4 18l-128 160c-11.6 14.4-13.8 34.2-5.8 50.8S157.6 832 176 832h672c17.8 0 34.2-9.8 42.4-25.6s7.2-34.8-2.8-49.4l-240-352zM224 384a96 96 0 1 0 0-192 96 96 0 1 0 0 192z" fill="#BBBBBB"></path></svg>`
);

/**
 * 顶栏左侧工具栏
 * - 选择 / 抓手切换画布交互模式
 * - 矩形 / 图片 / 文本点击即在画布可视区域中央插入节点
 */
export const NavTools: FC = () => {
  const editor = useEditor();
  const [active, setActive] = useState<string>(NAV_ENUM.DEFAULT);

  /** 切换模式 */
  const switchMode = (key: string) => {
    const next = active === key ? NAV_ENUM.DEFAULT : key;
    setActive(next);
    editor.tool = next === NAV_ENUM.DEFAULT ? null : next;
    // 抓手模式下光标为抓手
    const viewport = editor.view.getViewport();
    viewport && (viewport.style.cursor = next === NAV_ENUM.GRAB ? "grab" : "");
  };

  /** 构造新节点 */
  const createNode = (type: string, x: number, y: number): ResumeNode => {
    const page = editor.model.getPage().data;
    const base = { id: getUniqueId(), parent: page.id, children: [] as string[], x, y };
    if (type === NAV_ENUM.TEXT) {
      return {
        ...base,
        type: NODE_TYPE.TEXT,
        ...SIZE.TEXT,
        delta: [{ insert: "新文本" }],
        style: { family: "PingFang SC", size: 14, lineHeight: 1.6, color: "#1F2328" },
        autoHeight: true,
      } satisfies TextNode;
    }
    if (type === NAV_ENUM.RECT) {
      return {
        ...base,
        type: NODE_TYPE.RECT,
        ...SIZE.RECT,
        fill: "#F2F3F5",
        border: null,
        radius: 0,
      } satisfies RectNode;
    }
    return {
      ...base,
      type: NODE_TYPE.IMAGE,
      ...SIZE.IMAGE,
      src: DEFAULT_IMAGE,
      mode: "cover",
      border: { width: 1, color: "#DADADA" },
    };
  };

  /** 在当前可视区域中央插入节点 */
  const insertAtCenter = (type: string) => {
    const page = editor.model.getPage().data;
    if (page.type !== NODE_TYPE.PAGE) return;
    const size = type === NAV_ENUM.TEXT ? SIZE.TEXT : type === NAV_ENUM.RECT ? SIZE.RECT : SIZE.IMAGE;
    const viewport = editor.view.getViewport();
    const rect = viewport ? viewport.getBoundingClientRect() : null;
    // 可视区域中心转换为纸张坐标，纸张不可见时落在纸张中心
    const center = rect
      ? editor.view.toLocal(rect.left + rect.width / 2, rect.top + rect.height / 2)
      : { x: page.width / 2, y: page.height / 2 };
    // 居中放置，并随已有元素数量轻微错开，避免连续插入完全重叠
    const offset = (page.children.length % 5) * 16;
    const x = Math.min(Math.max(0, center.x - size.width / 2 + offset), Math.max(0, page.width - size.width));
    const y = Math.min(Math.max(0, center.y - size.height / 2 + offset), Math.max(0, page.height - size.height));
    const newId = editor.insertNode(createNode(type, Math.round(x), Math.round(y)));
    newId && editor.selection.set([newId]);
  };

  /** 点击插入工具 */
  const onInsertClick = (type: string) => {
    setActive(NAV_ENUM.DEFAULT);
    editor.tool = null;
    insertAtCenter(type);
  };

  return (
    <div className="cv-nav-tools">
      {MODE_ITEMS.map(item => (
        <div
          key={item.key}
          className={`cv-nav-tool ${active === item.key ? "is-active" : ""}`}
          title={item.label}
          onClick={() => switchMode(item.key)}
        >
          {item.icon}
        </div>
      ))}
      <div className="cv-nav-divider" />
      {INSERT_ITEMS.map(item => (
        <div
          key={item.key}
          className="cv-nav-tool"
          title={`${item.label}（点击插入）`}
          onClick={() => onInsertClick(item.key)}
        >
          {item.icon}
        </div>
      ))}
    </div>
  );
};
