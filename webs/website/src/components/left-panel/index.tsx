import { Tabs } from "@arco-design/web-react";
import type { FC } from "react";
import React from "react";

import { Structure } from "./components/structure";
import { Template } from "./components/template";

const TabPane = Tabs.TabPane;

/**
 * 左侧面板
 * - 「模板」：简历模板缩略图，点击载入
 * - 「结构」：页面元素列表
 */
export const LeftPanel: FC = () => {
  return (
    <div className="cv-left-panel cv-panel">
      <Tabs defaultActiveTab="template" destroyOnHide>
        <TabPane key="template" title="模板">
          <Template />
        </TabPane>
        <TabPane key="structure" title="结构">
          <Structure />
        </TabPane>
      </Tabs>
    </div>
  );
};
