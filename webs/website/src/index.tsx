import "./styles/global.scss";

import type { FC } from "react";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

import { App } from "./components/app";
import { PreviewPage } from "./components/preview-page";

/** 读取当前路由 */
const getRoute = (): "editor" | "preview" => {
  return location.hash.replace(/^#\/?/, "") === "preview" ? "preview" : "editor";
};

/**
 * 路由容器
 * - 使用 hash 路由，避免静态部署的路径问题
 * - #/ 编辑，#/preview 预览与导出
 */
const Router: FC = () => {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const onChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route === "preview" ? <PreviewPage /> : <App />;
};

ReactDOM.render(<Router />, document.getElementById("root"));
