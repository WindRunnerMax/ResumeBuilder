import { JSONDocument } from "../src/document";
import { createDefaultDoc, createText } from "../src/preset";

describe("JSONDocument", () => {
  it("should apply and invert ops", () => {
    const doc = createDefaultDoc();
    const textId = Object.values(doc.nodes).find(node => node.type === "text")!.id as string;
    const document = new JSONDocument(doc);
    const before = document.toJSON();
    const ops = [{ p: ["nodes", textId, "x"], na: 10 }];
    document.submit(ops);
    expect((document.getNode(textId) as { x: number }).x).toBe(
      (before.nodes[textId] as { x: number }).x + 10
    );
    const inverted = document.invert(ops);
    document.submit(inverted);
    expect((document.getNode(textId) as { x: number }).x).toBe(
      (before.nodes[textId] as { x: number }).x
    );
  });

  it("should submit delta via subtype and invert", () => {
    const text = createText({ id: "text" });
    const doc = createDefaultDoc();
    doc.nodes["text"] = text;
    doc.nodes[doc.root].children.push("text");
    text.parent = doc.root;
    const document = new JSONDocument(doc);
    const before = document.getNode("text");
    const next = [{ insert: "hello" }];
    const ops = document.submitDelta("text", next);
    const after = document.getNode("text") as { delta: unknown[] };
    expect(after.delta).toEqual(next);
    const inverted = document.invert(ops);
    document.submit(inverted);
    expect((document.getNode("text") as { delta: unknown[] }).delta).toEqual(
      (before as { delta: unknown[] }).delta
    );
  });
});
