import type { ResumeNode } from "@cv/json";
import { getElementView, registerElementView } from "../src/preset/registry";
import type { ElementViewProps } from "../src/preset/registry";

describe("element view registry", () => {
  it("should register and read views", () => {
    const View = (_props: ElementViewProps) => null;
    registerElementView("demo", View);
    expect(getElementView("demo")).toBe(View);
    expect(getElementView("missing")).toBeNull();
  });

  it("should accept node props", () => {
    const node: ResumeNode = {
      id: "a",
      type: "rect",
      parent: null,
      children: [],
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    };
    expect(node.id).toBe("a");
  });
});
