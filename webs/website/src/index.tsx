import "./styles/arco.less";
import "./styles/global.scss";

import type { FC } from "react";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

import { App } from "./components/app";
import { PreviewPage } from "./components/preview-page";
import { EDITOR_ROUTE, EXPORT_ROUTE } from "./utils/constant";

/** 读取当前路由 */
const getRoute = (): "editor" | "preview" => {
  return location.hash === EXPORT_ROUTE || location.hash.startsWith(`${EXPORT_ROUTE}?`)
    ? "preview"
    : "editor";
};

/**
 * 路由容器
 * - #/ 为编辑页，#/preview 为预览导出页
 * - 预览页通过 window.open 打开新标签，避免与编辑页共享样式与状态
 */
const Router: FC = () => {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const onChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  if (route === "preview") {
    return <PreviewPage />;
  }
  return <App key={EDITOR_ROUTE} />;
};

ReactDOM.render(<Router />, document.getElementById("root"));
