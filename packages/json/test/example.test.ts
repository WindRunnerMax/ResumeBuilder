import type { ResumeDoc } from "@re/json";
import { createExampleDoc } from "@re/json";

describe("example doc", () => {
  const doc: ResumeDoc = createExampleDoc();

  it("should have a page root", () => {
    const root = doc.nodes[doc.root];
    expect(root.type).toBe("page");
    expect(root.parent).toBeNull();
    expect(root.children.length).toBeGreaterThan(0);
  });

  it("should have consistent children and parent", () => {
    for (const node of Object.values(doc.nodes)) {
      for (const childId of node.children) {
        expect(doc.nodes[childId]).toBeTruthy();
        expect(doc.nodes[childId].parent).toBe(node.id);
      }
    }
  });

  it("should keep elements inside the page", () => {
    const page = doc.nodes[doc.root];
    for (const node of Object.values(doc.nodes)) {
      if (node.type === "page") continue;
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width).toBeLessThanOrEqual(page.width + 1);
    }
  });

  it("should convert text to block delta", () => {
    const texts = Object.values(doc.nodes).filter(node => node.type === "text");
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      if (text.type !== "text") continue;
      expect(text.delta.length).toBeGreaterThan(0);
      expect(text.delta.some(op => typeof op.insert === "string")).toBe(true);
    }
  });
});
