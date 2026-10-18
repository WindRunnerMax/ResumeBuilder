import { IconClose } from "@arco-design/web-react/icon";
import { useEditor, useEditorEvent, useSelection } from "@re/react";
import type { FC } from "react";
import React, { useState } from "react";

/** 类型展示名 */
const TYPE_LABEL: Record<string, string> = {
  text: "文字",
  rect: "矩形",
  image: "图片",
  page: "页面",
};

/** 分组顺序 */
const GROUP_ORDER = ["text", "image", "rect"];

/**
 * 结构面板
 * - 按类型分组列出页面内所有元素，可选中或删除
 */
export const Structure: FC = () => {
  const editor = useEditor();
  const { ids } = useSelection();
  const [, setVersion] = useState(0);
  useEditorEvent("CONTENT_CHANGE", () => setVersion(v => v + 1));

  const list = editor.model.getFlat().filter(state => state.type !== "page");

  const onDelete = (id: string) => {
    editor.command.execute({ type: "DELETE", payload: { ids: [id] } });
    editor.selection.clear();
  };

  if (!list.length) {
    return <div className="cv-empty">暂无元素</div>;
  }

  return (
    <div className="cv-structure">
      {GROUP_ORDER.map(type => {
        const items = list.filter(state => state.type === type);
        if (!items.length) return null;
        return (
          <div className="cv-structure__group" key={type}>
            <div className="cv-structure__title">{TYPE_LABEL[type] || type}</div>
            {items.map(state => (
              <div
                key={state.id}
                className={`cv-structure-item ${ids.includes(state.id) ? "is-active" : ""}`}
                onClick={() => editor.selection.set([state.id])}
              >
                <span className="cv-structure-item__id">{state.id.slice(0, 8)}</span>
                <IconClose
                  className="cv-structure-item__del"
                  onClick={e => {
                    e.stopPropagation();
                    onDelete(state.id);
                  }}
                />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};
