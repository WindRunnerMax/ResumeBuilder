import { Message, Modal } from "@arco-design/web-react";
import { useEditor } from "@re/react";
import type { FC } from "react";
import React from "react";

import { loadTemplate, TEMPLATE_CONFIG } from "../../../utils/template";

/**
 * 模板面板
 * - 两列网格展示缩略图，点击后按需加载模板数据
 */
export const Template: FC = () => {
  const editor = useEditor();

  /** 载入模板 */
  const onLoad = (key: string) => {
    Modal.confirm({
      title: "加载模板",
      simple: true,
      content: "确定要加载模板吗，当前的数据将会被覆盖。",
      // onConfirm 返回 Promise 时，确认按钮自动进入 loading 状态
      onConfirm: async () => {
        try {
          const doc = await loadTemplate(key);
          if (!doc) {
            Message.error("模板加载失败");
            return;
          }
          editor.loadDocument(doc);
          Message.success("模板已载入");
        } catch (error) {
          Message.error("模板加载失败");
          console.error("[cv] load template failed", error);
        }
      },
    });
  };

  // 两列一行
  const rows: (typeof TEMPLATE_CONFIG)[] = [];
  TEMPLATE_CONFIG.forEach((item, index) => {
    if (index % 2 === 0) rows.push([item]);
    else rows[Math.floor(index / 2)].push(item);
  });

  return (
    <div className="cv-template">
      {rows.map((row, index) => (
        <div className="cv-template__row" key={index}>
          {row.map(item => (
            <div className="cv-template__item" key={item.key} onClick={() => onLoad(item.key)}>
              <div className="cv-template__preview">
                <div className="cv-template__img">
                  <img src={item.image} alt={item.name} />
                </div>
                <div className="cv-template__name">{item.name}</div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
