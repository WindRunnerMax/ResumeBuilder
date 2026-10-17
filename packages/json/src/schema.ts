import type { ResumeDoc } from "./types";

/**
 * 校验文档结构的最小约束
 * @param doc
 */
export const validateDoc = (doc: ResumeDoc): string[] => {
  const errors: string[] = [];
  const root = doc.nodes[doc.root];
  if (!root) {
    errors.push(`missing root node: ${doc.root}`);
    return errors;
  }
  if (root.type !== "page") {
    errors.push(`root node must be page, got ${root.type}`);
  }
  for (const node of Object.values(doc.nodes)) {
    if (node.parent && !doc.nodes[node.parent]) {
      errors.push(`node ${node.id} has missing parent ${node.parent}`);
    }
    for (const childId of node.children) {
      const child = doc.nodes[childId];
      if (!child) {
        errors.push(`node ${node.id} has missing child ${childId}`);
        continue;
      }
      if (child.parent !== node.id) {
        errors.push(`child ${childId} parent mismatch: ${child.parent} !== ${node.id}`);
      }
    }
  }
  return errors;
};

/** 是否为合法的简历文档 */
export const isValidDoc = (doc: ResumeDoc): boolean => validateDoc(doc).length === 0;
