/**
 * 把 CanvasEditor 的示例简历转换成 ResumeDoc
 * - 输入：{ x, y, width, height, deltaSetLike }
 * - 输出：{ version, root, nodes }
 * - 文本内容从 sketch 的 RichTextLines 转为 BlockKit Delta
 */
const fs = require("fs");
const path = require("path");

const SRC = path.resolve(
  process.argv[2] ||
    "/Users/czy/Project/Packages/CanvasEditor/packages/react/public/template/Czy/index.json"
);
const OUT = path.resolve(
  process.argv[3] || "/Users/czy/Project/Packages/ResumeBuilder/packages/json/src/example.json"
);

const data = JSON.parse(fs.readFileSync(SRC, "utf8"));
const deltas = data.deltaSetLike;

const PAGE_ID = "page";
const nodes = {};

/** sketch 字符样式 key → BlockKit 属性 */
const toAttributes = config => {
  const attrs = {};
  if (config.WEIGHT === "bold") attrs.bold = "true";
  if (config.STYLE === "italic") attrs.italic = "true";
  if (config.UNDERLINE) attrs.underline = "true";
  if (config.STRIKE_THROUGH) attrs.strike = "true";
  if (config.COLOR) attrs.color = config.COLOR;
  if (config.SIZE) attrs["font-size"] = String(config.SIZE);
  if (config.FAMILY) attrs["font-family"] = config.FAMILY;
  if (config.BACKGROUND) attrs.background = config.BACKGROUND;
  if (config.LINK) attrs.link = config.LINK;
  return attrs;
};

/** RichTextLines → BlockKit Delta ops */
const linesToDelta = lines => {
  const ops = [];
  for (const line of lines) {
    for (const item of line.chars) {
      const attributes = toAttributes(item.config || {});
      // 与上一片段的属性一致则合并，减小体积
      const last = ops.length ? ops[ops.length - 1] : null;
      if (
        last &&
        typeof last.insert === "string" &&
        !last.eol &&
        JSON.stringify(last.attributes || {}) === JSON.stringify(attributes)
      ) {
        last.insert += item.char;
        continue;
      }
      ops.push({
        insert: item.char,
        ...(Object.keys(attributes).length ? { attributes } : {}),
      });
    }
    // 行属性挂在换行符上
    const lineAttrs = {};
    if (line.config && line.config.LINE_HEIGHT) lineAttrs["line-height"] = line.config.LINE_HEIGHT;
    if (line.config && line.config.ORDERED_LIST_LEVEL) {
      lineAttrs["list-type"] = "ordered";
      lineAttrs["indent-level"] = String(Number(line.config.ORDERED_LIST_LEVEL) - 1);
      line.config.ORDERED_LIST_START && (lineAttrs["list-start"] = line.config.ORDERED_LIST_START);
    }
    if (line.config && line.config.UNORDERED_LIST_LEVEL) {
      lineAttrs["list-type"] = "bullet";
      lineAttrs["indent-level"] = String(Number(line.config.UNORDERED_LIST_LEVEL) - 1);
    }
    if (line.config && line.config.DIVIDING_LINE) lineAttrs["divider"] = "true";
    // 合并相邻同属性片段，减小体积
    if (ops.length) {
      const last = ops[ops.length - 1];
      if (typeof last.insert === "string" && !last.eol) {
        last.eol = lineAttrs;
        continue;
      }
    }
    ops.push({ insert: "\n", eol: lineAttrs });
  }
  if (ops.length) {
    const last = ops[ops.length - 1];
    if (!last.eol && typeof last.insert === "string") last.eol = {};
  }
  return ops;
};

// 页面
nodes[PAGE_ID] = {
  id: PAGE_ID,
  type: "page",
  parent: null,
  children: [],
  x: 0,
  y: 0,
  width: Math.round(data.width * 100) / 100,
  height: Math.round(data.height * 100) / 100,
  size: "A4",
  padding: [0, 0, 0, 0],
  background: "#FFFFFF",
};

/** 把坐标平移到页面左上角，模板中的 x/y 即为纸张左上角 */
const originX = data.x || 0;
const originY = data.y || 0;

for (const [id, delta] of Object.entries(deltas)) {
  if (delta.key === "entry") continue;
  const base = {
    id,
    parent: PAGE_ID,
    children: [],
    x: Math.round((delta.x - originX) * 100) / 100,
    y: Math.round((delta.y - originY) * 100) / 100,
    width: Math.round(delta.width * 100) / 100,
    height: Math.round(delta.height * 100) / 100,
  };
  if (delta.key === "text") {
    const lines = JSON.parse(delta.attrs.DATA || "[]");
    nodes[id] = {
      ...base,
      type: "text",
      delta: linesToDelta(lines),
      style: { family: "PingFang SC", size: 14, lineHeight: 1.5, color: "#1F2328" },
      autoHeight: false,
    };
  } else if (delta.key === "image") {
    nodes[id] = {
      ...base,
      type: "image",
      src: delta.attrs.src,
      mode: String(delta.attrs.mode || "COVER").toLowerCase(),
      border: delta.attrs["border-width"]
        ? { width: Number(delta.attrs["border-width"]), color: delta.attrs["border-color"] || "#EEEEEE" }
        : null,
    };
  } else if (delta.key === "rect") {
    nodes[id] = {
      ...base,
      type: "rect",
      fill: delta.attrs["fill-color"] || null,
      border: delta.attrs["border-color"]
        ? {
            width: Number(delta.attrs["border-width"] || 1),
            color: delta.attrs["border-color"],
            l: delta.attrs.L === "true",
            r: delta.attrs.R === "true",
            t: delta.attrs.T === "true",
            b: delta.attrs.B === "true",
          }
        : null,
      radius: 0,
    };
  } else {
    continue;
  }
  nodes[PAGE_ID].children.push(id);
}

const doc = { version: 1, root: PAGE_ID, nodes };
fs.writeFileSync(OUT, JSON.stringify(doc, null, 2));
console.log(`written ${OUT}`);
console.log(
  "nodes:",
  Object.keys(nodes).length,
  "size:",
  (fs.statSync(OUT).size / 1024).toFixed(1) + "KB"
);
