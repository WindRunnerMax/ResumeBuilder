# ResumeBuilder Agents

## 项目结构

- packages/core: 核心模块，管理整个画布的绘制、事件处理、生命周期等
- packages/json: 数据模块，定义了 json 数据模型，以及 ot-json 管理数据
- packages/react: React 模块，定义了核心包和 React 组件的接口，以及插件组合
- packages/utils: 工具模块，提供一些常用的工具函数
- webs/pdf: PDF 导出模块，以浏览器扩展 CDP 的形式提供 PDF 导出功能
- webs/website: web 页面，具体实现简历编辑器的 UI 和交互

## 项目架构

- 项目间类型，依赖根目录的 tsconfig path alias
- 项目编译，依赖 rspack 的 resolve.alias 实现，无需提前编译包

## 依赖管理

- 避免使用 ^/~ 版本范围，需要具体指定绝对版本号
- 尽可能复用已有的依赖及其版本号，避免引入新的依赖
- 修改项目依赖后，需要重新执行 `pnpm install` 来更新 lock 文件

## 代码规范

- plan 文件放在 .plans 目录下，且变更要同步回写到 plan 文件
- 函数、重要变量、类等符号要加入注释，以`/** */`形式

## 注意事项

- 不要开启子 agent（Agent/Task 工具），所有任务由主 agent 直接完成
- 使用浏览器 CDP 通信时，优先复用系统已安装的 Chrome 浏览器
