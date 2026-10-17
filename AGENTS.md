# ResumeBuilder Agents

## 项目结构

- packages/core: 核心模块，管理整个画布的绘制、事件处理、生命周期等
- packages/json: 数据模块，定义了 json 数据模型，以及 ot-json 管理数据
- packages/utils: 工具模块，提供一些常用的工具函数
- webs/pdf: PDF 导出模块，以浏览器扩展 CDP 的形式提供 PDF 导出功能
- webs/website: web 页面，具体实现简历编辑器的 UI 和交互

## 依赖管理

- 避免使用 ^/~ 版本范围，需要具体指定绝对版本号
- 尽可能复用已有的依赖的版本号，避免引入新的依赖

## 项目架构
- 项目间类型依赖根目录的 tsconfig path alias
- 项目编译直接依赖 rspack 的 resolve.alias 实现，无需提前编译包

## 代码规范

- 函数、重要变量、类等符号要加入注释，以`/** */`形式
