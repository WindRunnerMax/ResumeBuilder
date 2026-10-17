export type { Op, Path, Side, Snapshot, TextOp } from "@block-kit/ot-json";
export { JSONDocument } from "./document";
export { A4_SIZE, createDefaultDoc, createPage, createRect, createText, DEFAULT_PADDING, DOC_VERSION } from "./preset";
export { isValidDoc, validateDoc } from "./schema";
export type { DeltaSubOp } from "./subtype";
export { createDeltaOp, diffDelta, json } from "./subtype";
export type {
  BaseNode,
  ImageMode,
  ImageNode,
  NodeGeometry,
  NodePoint,
  NodeRect,
  NodeType,
  PageNode,
  PaperSize,
  RectBorder,
  RectNode,
  ResumeDoc,
  ResumeNode,
  TextNode,
  TextStyle,
} from "./types";
export { NODE_TYPE } from "./types";
