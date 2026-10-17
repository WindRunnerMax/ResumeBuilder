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
  /** 矩形 / 分割线 */
  RECT: "RECT",
  /** 图片 */
  IMAGE: "IMAGE",
  /** 文本 */
  TEXT: "TEXT",
} as const;

/** 工具项 */
const ITEMS: Array<{ key: string; label: string; icon: React.ReactNode }> = [
  { key: NAV_ENUM.DEFAULT, label: "选择", icon: <CursorIcon /> },
  { key: NAV_ENUM.GRAB, label: "抓手（拖拽平移画布）", icon: <GrabIcon /> },
  { key: NAV_ENUM.RECT, label: "分割线", icon: <RectIcon /> },
  { key: NAV_ENUM.IMAGE, label: "图片", icon: <ImageIcon /> },
  { key: NAV_ENUM.TEXT, label: "文本", icon: <TextIcon /> },
];

/**
 * 顶栏左侧工具栏
 * - 点击工具激活插入模式，画布上按下即在落点插入对应元素
 * - 工具状态由 core 的 Interaction 统一消费，无额外事件监听
 */
export const NavTools: FC = () => {
  const editor = useEditor();
  const [active, setActive] = useState<string>(NAV_ENUM.DEFAULT);

  /** 切换工具 */
  const switchTool = (key: string) => {
    const next = active === key ? NAV_ENUM.DEFAULT : key;
    setActive(next);
    editor.tool = next === NAV_ENUM.DEFAULT ? null : next;
    // 抓手模式下光标为抓手
    const viewport = editor.view.getViewport();
    viewport && (viewport.style.cursor = next === NAV_ENUM.GRAB ? "grab" : "");
    editor.selection.clear();
  };

  /** 在指定位置插入元素，落点钳制在纸张内 */
  const insert = (type: string, x: number, y: number) => {
    const page = editor.model.getPage().data;
    if (page.type !== NODE_TYPE.PAGE) return;
    setActive(NAV_ENUM.DEFAULT);
    const cx = Math.min(Math.max(0, x), Math.max(0, page.width - 60));
    const cy = Math.min(Math.max(0, y), Math.max(0, page.height - 40));
    const id = getUniqueId();
    const base = { id, parent: page.id, children: [] as string[], x: cx, y: cy };
    let node: ResumeNode;
    if (type === NAV_ENUM.TEXT) {
      node = {
        ...base,
        type: NODE_TYPE.TEXT,
        width: 200,
        height: 30,
        delta: [{ insert: "新文本" }],
        style: { family: "PingFang SC", size: 14, lineHeight: 1.6, color: "#1F2328" },
        autoHeight: true,
      } satisfies TextNode;
    } else if (type === NAV_ENUM.RECT) {
      node = {
        ...base,
        type: NODE_TYPE.RECT,
        width: 200,
        height: 1,
        fill: null,
        border: { width: 1, color: "#E4E6EB", l: false, r: false, t: false, b: true },
        radius: 0,
      } satisfies RectNode;
    } else {
      node = {
        ...base,
        type: NODE_TYPE.IMAGE,
        width: 100,
        height: 100,
        src: "",
        mode: "cover",
        border: null,
      };
    }
    const newId = editor.insertNode(node);
    newId && editor.selection.set([newId]);
  };

  // 注册工具插入回调，由 Interaction 在画布 pointerdown 时调用
  React.useEffect(() => {
    editor.onToolInsert = insert;
    return () => {
      editor.onToolInsert = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <div className="cv-nav-tools">
      {ITEMS.map(item => (
        <div
          key={item.key}
          className={`cv-nav-tool ${active === item.key ? "is-active" : ""}`}
          title={item.label}
          onClick={() => switchTool(item.key)}
        >
          {item.icon}
        </div>
      ))}
    </div>
  );
};
