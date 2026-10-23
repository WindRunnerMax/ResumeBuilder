import { InputNumber, Tooltip } from "@arco-design/web-react";
import { IconPlus } from "@arco-design/web-react/icon";
import type { ImageNode, PaperSize, RectNode } from "@re/json";
import { useCommand, useEditor, useEditorEvent, useMode, useSelection } from "@re/react";
import type { FC } from "react";
import React, { useEffect, useReducer, useState } from "react";

/** 纸张预设 */
const PAPER_PRESETS: { label: string; value: "A4" | "A3" | "Letter" }[] = [
  { label: "A4", value: "A4" },
  { label: "A3", value: "A3" },
  { label: "Letter", value: "Letter" },
];

/** 预设的毫米尺寸 */
const SIZE_MM: Record<string, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 215.9, height: 279.4 },
};

/** 取当前纸张的毫米尺寸 */
const getPaperMm = (size: PaperSize): { width: number; height: number; preset: string } => {
  if (typeof size === "string") {
    const mm = SIZE_MM[size] || SIZE_MM.A4;
    return { width: mm.width, height: mm.height, preset: size };
  }
  return { width: size.width, height: size.height, preset: "custom" };
};

/** 类型展示名 */
const TYPE_LABEL: Record<string, string> = {
  text: "富文本",
  rect: "矩形",
  image: "图片",
  page: "纸张",
};

/**
 * 右侧属性面板
 * - 浮动卡片，位于画布右上角，可折叠，常驻显示
 * - 默认展示纸张设置（即导出的裁剪区域），选中元素时切换为元素属性
 */
export const RightPanel: FC = () => {
  const editor = useEditor();
  const { ids } = useSelection();
  const { mode, editingId } = useMode();
  const { execute } = useCommand();
  const [collapse, setCollapse] = useState(false);
  // 节点数据是可变对象，内容变化后强制重渲染
  const [, forceUpdate] = useReducer(v => v + 1, 0);
  useEditorEvent("CONTENT_CHANGE", forceUpdate);

  // 无选中时默认展示纸张
  const state = ids.length === 1 ? editor.model.get(ids[0]) : null;
  const node = state ? state.data : editor.model.getPage().data;
  const editing = mode === "TEXT_EDIT" && editingId === node.id;
  const isPage = node.id === editor.document.get().root;

  const revise = (key: string, value: number) => {
    if (Number.isNaN(value)) return;
    execute({ type: "REVISE", payload: { id: node.id, attrs: { [key]: value } } });
  };

  /** 选择预设纸张，尺寸由 core 换算，size 保留预设标识 */
  const selectPreset = (preset: string) => {
    execute({ type: "REVISE", payload: { id: node.id, attrs: { size: preset as PaperSize } } });
  };

  /** 自定义毫米尺寸，写入自定义尺寸对象 */
  const revisePaper = (widthMm: number, heightMm: number) => {
    if (Number.isNaN(widthMm) || Number.isNaN(heightMm) || widthMm <= 0 || heightMm <= 0) return;
    execute({
      type: "REVISE",
      payload: { id: node.id, attrs: { size: { width: widthMm, height: heightMm } } },
    });
  };

  const paper = isPage && node.type === "page" ? getPaperMm(node.size) : null;
  // 四角坐标
  const left = Math.round(node.x);
  const top = Math.round(node.y);
  const right = Math.round(node.x + node.width);
  const bottom = Math.round(node.y + node.height);

  return (
    <div className={`cv-right-panel ${collapse ? "is-collapse" : ""}`}>
      <div className="cv-right-panel__op" onClick={() => setCollapse(!collapse)}>
        <IconPlus />
      </div>
      <div className="cv-right-panel__scroll">
        <div className="cv-right-panel__matrix">
          <div className="cv-right-panel__frame" />
          <span className="cv-matrix__pos cv-matrix__pos--lt">[{left},{top}]</span>
          <span className="cv-matrix__pos cv-matrix__pos--rt">[{right},{top}]</span>
          <span className="cv-matrix__pos cv-matrix__pos--lb">[{left},{bottom}]</span>
          <span className="cv-matrix__pos cv-matrix__pos--rb">[{right},{bottom}]</span>
        </div>

        <div className="cv-right-panel__head">
          <span className="cv-right-panel__type">{TYPE_LABEL[node.type] || node.type}</span>
        </div>

        {paper ? (
          <PaperPanel
            paper={paper}
            width={node.width}
            height={node.height}
            onPreset={selectPreset}
            onCustom={revisePaper}
            onReset={() => editor.view.scrollToPaper()}
          />
        ) : (
          <>
            <div className="cv-right-panel__grid">
              <Row label="X">
                <InputNumber size="mini" value={left} onChange={v => revise("x", Number(v))} />
              </Row>
              <Row label="Y">
                <InputNumber size="mini" value={top} onChange={v => revise("y", Number(v))} />
              </Row>
              <Row label="宽">
                <InputNumber
                  size="mini"
                  value={Math.round(node.width)}
                  onChange={v => revise("width", Number(v))}
                />
              </Row>
              <Row label="高">
                <InputNumber
                  size="mini"
                  value={Math.round(node.height)}
                  onChange={v => revise("height", Number(v))}
                />
              </Row>
            </div>

            {node.type === "image" && (
              <ImagePanel
                node={node}
                onRevise={attrs => execute({ type: "REVISE", payload: { id: node.id, attrs } })}
              />
            )}
            {node.type === "rect" && (
              <RectPanel
                node={node}
                onRevise={attrs => execute({ type: "REVISE", payload: { id: node.id, attrs } })}
              />
            )}
          </>
        )}

        {!isPage && (
          <>
            <div className="cv-right-panel__section">操作</div>
            <div className="cv-right-panel__actions">
              {node.type === "text" && (
                <Tooltip content="双击快捷编辑" mini>
                  <button
                    className="cv-btn"
                    onClick={() => editor.mode.enterTextEdit(node.id)}
                  >
                    编辑
                  </button>
                </Tooltip>
              )}
              <button
                className="cv-btn"
                onClick={() => {
                  execute({ type: "DELETE", payload: { ids } });
                  editor.selection.clear();
                }}
              >
                删除
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/** 图片属性：上传与渲染模式 */
const ImagePanel: FC<{
  node: ImageNode;
  onRevise: (attrs: Record<string, unknown>) => void;
}> = props => {
  const onUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => props.onRevise({ src: String(reader.result) });
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const border = props.node.border;

  /** 更新边框，宽度为 0 时视为无边框 */
  const reviseBorder = (patch: { color?: string; width?: number }) => {
    const next = {
      width: border?.width ?? 0,
      color: border?.color || "#DADADA",
      ...patch,
    };
    props.onRevise({ border: next.width > 0 ? next : { ...next, width: 0 } });
  };

  return (
    <div className="cv-right-panel__paper">
      <div className="cv-right-panel__section">边框</div>
      <div className="cv-right-panel__row">
        <span className="cv-right-panel__label">颜色</span>
        <input
          type="color"
          className="cv-color-input"
          value={border?.color || "#DADADA"}
          onChange={e => reviseBorder({ color: e.target.value })}
        />
        <span className="cv-right-panel__label">宽度</span>
        <InputNumber
          size="mini"
          min={0}
          max={10}
          value={border?.width ?? 0}
          onChange={v => reviseBorder({ width: Number(v) || 0 })}
        />
      </div>

      <div className="cv-right-panel__section">图片</div>
      <div className="cv-right-panel__actions">
        <button className="cv-btn" onClick={onUpload}>
          上传图片
        </button>
      </div>
      <div className="cv-right-panel__section">渲染模式</div>
      <div className="cv-paper-presets">
        {(["cover", "contain", "fill"] as const).map(mode => (
          <button
            key={mode}
            className={`cv-paper-preset ${props.node.mode === mode ? "is-active" : ""}`}
            onClick={() => props.onRevise({ mode })}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
};

/** 矩形属性：填充、描边、圆角 */
const RectPanel: FC<{
  node: RectNode;
  onRevise: (attrs: Record<string, unknown>) => void;
}> = props => {
  const border = props.node.border;
  /** 更新描边字段 */
  const reviseBorder = (patch: Partial<NonNullable<RectNode["border"]>>) => {
    props.onRevise({
      border: {
        width: 1,
        color: "#E4E6EB",
        l: false,
        r: false,
        t: false,
        b: false,
        ...(props.node.border || {}),
        ...patch,
      },
    });
  };

  return (
    <div className="cv-right-panel__paper">
      <div className="cv-right-panel__section">填充色</div>
      <div className="cv-right-panel__row">
        <input
          type="color"
          className="cv-color-input"
          value={props.node.fill || "#FFFFFF"}
          onChange={e => props.onRevise({ fill: e.target.value })}
        />
        <button
          className="cv-btn"
          onClick={() => props.onRevise({ fill: null })}
          title="清除填充"
        >
          无
        </button>
      </div>

      <div className="cv-right-panel__section">描边</div>
      <div className="cv-paper-presets">
        {([["l", "左"], ["r", "右"], ["t", "上"], ["b", "下"]] as const).map(([key, label]) => (
          <button
            key={key}
            className={`cv-paper-preset ${border?.[key] ? "is-active" : ""}`}
            onClick={() => reviseBorder({ [key]: !border?.[key] })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="cv-right-panel__row" style={{ marginTop: 8 }}>
        <span className="cv-right-panel__label">颜色</span>
        <input
          type="color"
          className="cv-color-input"
          value={border?.color || "#E4E6EB"}
          onChange={e => reviseBorder({ color: e.target.value })}
        />
        <span className="cv-right-panel__label">宽度</span>
        <InputNumber
          size="mini"
          min={1}
          max={10}
          value={border?.width ?? 1}
          onChange={v => reviseBorder({ width: Number(v) || 1 })}
        />
      </div>

      <div className="cv-right-panel__section">圆角</div>
      <InputNumber
        size="mini"
        min={0}
        value={props.node.radius ?? 0}
        onChange={v => props.onRevise({ radius: Number(v) || 0 })}
      />
    </div>
  );
};

/** 纸张尺寸设置 */
const PaperPanel: FC<{
  paper: { width: number; height: number; preset: string };
  width: number;
  height: number;
  onPreset: (preset: string) => void;
  onCustom: (width: number, height: number) => void;
  onReset: () => void;
}> = props => {
  return (
    <div className="cv-right-panel__paper">
      <div className="cv-right-panel__section">纸张预设</div>
      <div className="cv-paper-presets">
        {PAPER_PRESETS.map(item => (
          <button
            key={item.label}
            className={`cv-paper-preset ${props.paper.preset === item.value ? "is-active" : ""}`}
            onClick={() => props.onPreset(item.value as string)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="cv-right-panel__section">自定义尺寸（mm）</div>
      <div className="cv-right-panel__grid">
        <Row label="宽">
          <CommitInput
            value={props.paper.width}
            min={10}
            onCommit={v => props.onCustom(v, props.paper.height)}
          />
        </Row>
        <Row label="高">
          <CommitInput
            value={props.paper.height}
            min={10}
            onCommit={v => props.onCustom(props.paper.width, v)}
          />
        </Row>
      </div>

      <div className="cv-right-panel__section">像素尺寸</div>
      <div className="cv-right-panel__grid">
        <Row label="宽">
          <span className="cv-right-panel__value">{Math.round(props.width)} px</span>
        </Row>
        <Row label="高">
          <span className="cv-right-panel__value">{Math.round(props.height)} px</span>
        </Row>
      </div>
      <div className="cv-right-panel__section">操作</div>
      <div className="cv-right-panel__actions">
        <button className="cv-btn" onClick={props.onReset}>
          定位到纸张
        </button>
      </div>
    </div>
  );
};

/**
 * 数字输入封装（基于 InputNumber）
 * - 保留内置上下步进按钮与方向键快捷加减
 * - 失焦或回车才提交，避免边输入边改纸张尺寸导致输入框被重置
 */
const CommitInput: FC<{ value: number; min?: number; onCommit: (value: number) => void }> = props => {
  const [draft, setDraft] = useState<number | undefined>(props.value);

  // 外部值变化时同步草稿
  useEffect(() => {
    setDraft(props.value);
  }, [props.value]);

  /** 校验并提交草稿，非法值回退为当前值 */
  const commit = (value: number | undefined) => {
    if (value === undefined || Number.isNaN(value) || value < (props.min ?? 0)) {
      setDraft(props.value);
      return;
    }
    setDraft(value);
    value === props.value || props.onCommit(value);
  };

  return (
    <InputNumber
      size="mini"
      min={props.min}
      value={draft}
      onChange={v => setDraft(typeof v === "number" ? v : undefined)}
      onBlur={() => commit(draft)}
      onKeyDown={e => {
        if ((e as unknown as KeyboardEvent).key === "Enter") commit(draft);
      }}
    />
  );
};

/** 属性行 */
const Row: FC<{ label: string; children?: React.ReactNode }> = props => (
  <div className="cv-right-panel__row">
    <span className="cv-right-panel__label">{props.label}</span>
    {props.children}
  </div>
);
