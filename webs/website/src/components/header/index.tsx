import { Button, Dropdown, Menu, Message, Modal } from "@arco-design/web-react";
import { IconDown, IconGithub, IconRedo, IconUndo } from "@arco-design/web-react/icon";
import { useCommand, useEditor, useEditorEvent, useHistory } from "@re/react";
import { getTimestamp } from "@re/utils";
import type { FC } from "react";
import React from "react";

import { NavTools } from "./components/nav";
import { convertPxToMm } from "../../utils/format";
import { openExportPage } from "../../utils/constant";

/**
 * 阻止 mousedown 的默认聚焦行为
 * - 撤销 / 重做按钮点击后编辑器应保留选区与焦点
 * @param event 鼠标按下事件
 */
const preventFocus = (event: React.MouseEvent) => event.preventDefault();

/**
 * 撤销 / 重做按钮所在容器的 mousedown 兜底
 * - 撤销 / 重做执行后按钮会变成 disabled，disabled 元素不接收鼠标事件，
 *   双击的第二下会落到外层容器 / body 上抢走编辑器焦点
 * @param event 鼠标按下事件
 */
const preventContainerFocus = (event: React.MouseEvent) => event.preventDefault();

/**
 * 顶栏
 * - 左：工具栏（选择、分割线、图片、文本）
 * - 右：撤销/重做、操作、导出、仓库链接
 */
export const Header: FC = () => {
  const editor = useEditor();
  const { undo, redo } = useCommand();
  const { canUndo, canRedo } = useHistory();
  // 纸张尺寸变化后刷新顶栏信息
  const [, forceUpdate] = React.useReducer(v => v + 1, 0);
  useEditorEvent("CONTENT_CHANGE", forceUpdate);

  const size = editor.view.getPageSize();
  const pageNode = editor.model.getPage().data;
  const paper = pageNode.type === "page" ? pageNode.size : "A4";
  const paperLabel = typeof paper === "string" ? paper : "自定义";

  /** 导出 JSON 文件 */
  const onExportJson = () => {
    const blob = new Blob([JSON.stringify(editor.document.toJSON(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RESUME_${getTimestamp()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** 导入 JSON 文件 */
  const onImportJson = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        editor.loadDocument(JSON.parse(text));
        Message.success("导入成功");
      } catch (error) {
        Message.error("导入失败，请检查文件格式");
        console.error("[cv] import failed", error);
      }
    };
    input.click();
  };

  /** 清空画布：删除页面下所有元素，保留纸张与纸张设置 */
  const onClearCanvas = () => {
    Modal.confirm({
      title: "清空画布",
      simple: true,
      content: "确定要清空画布吗，当前的所有元素将会被删除。",
      onConfirm: () => {
        const page = editor.model.getPage();
        const ids = page.children.slice();
        if (!ids.length) {
          Message.info("画布已经是空的了");
          return;
        }
        editor.selection.clear();
        editor.command.execute({ type: "DELETE", payload: { ids } });
        Message.success("画布已清空");
      },
    });
  };

  /** 操作菜单 */
  const opMenu = (
    <Menu className="cv-menu">
      <Menu.Item key="preview" onClick={openExportPage}>
        预览
      </Menu.Item>
      <Menu.Item key="import" onClick={onImportJson}>
        导入数据
      </Menu.Item>
      <Menu.Item key="clear" onClick={() => editor.history.clear()}>
        清空历史
      </Menu.Item>
      <Menu.Item key="clear-canvas" onClick={onClearCanvas}>
        清空画布
      </Menu.Item>
    </Menu>
  );

  /** 导出菜单 */
  const exportMenu = (
    <Menu className="cv-menu">
      <Menu.Item key="pdf" onClick={openExportPage}>
        PDF
      </Menu.Item>
      <Menu.Item key="json" onClick={onExportJson}>
        JSON
      </Menu.Item>
    </Menu>
  );

  return (
    <div className="cv-header-root">
      <div className="cv-header-left">
        <NavTools />
        <span className="cv-header-meta">
          {paperLabel} · {convertPxToMm(size.width).toFixed(0)} × {convertPxToMm(size.height).toFixed(0)}{" "}
          mm
        </span>
      </div>
      <div className="cv-header-right">
        <div className="cv-history" onMouseDown={preventContainerFocus}>
          <Button
            type="text"
            size="small"
            iconOnly
            icon={<IconUndo />}
            disabled={!canUndo}
            onMouseDown={preventFocus}
            onClick={undo}
          />
          <Button
            type="text"
            size="small"
            iconOnly
            icon={<IconRedo />}
            disabled={!canRedo}
            onMouseDown={preventFocus}
            onClick={redo}
          />
        </div>
        <Dropdown droplist={opMenu} trigger="click" position="br">
          <Button size="mini" type="text">
            操作
            <IconDown />
          </Button>
        </Dropdown>
        <Dropdown droplist={exportMenu} trigger="click" position="br">
          <Button size="mini" type="text">
            导出
            <IconDown />
          </Button>
        </Dropdown>
        <a
          className="cv-github"
          target="_blank"
          rel="noreferrer"
          href="https://github.com/WindRunnerMax/ResumeBuilder"
        >
          <IconGithub />
        </a>
      </div>
    </div>
  );
};
