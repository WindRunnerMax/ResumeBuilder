import { registerBaseViews } from "../src/plugin/element/views";
import { registerTextBlock } from "../src/plugin/element/text";
import { getElementView } from "@re/react";

describe("element views", () => {
  it("should register built-in views", () => {
    registerBaseViews();
    expect(getElementView("page")).not.toBeNull();
    expect(getElementView("rect")).not.toBeNull();
    expect(getElementView("image")).not.toBeNull();
    expect(getElementView("text")).not.toBeNull();
  });

  it("should register text block view", () => {
    registerTextBlock();
    expect(getElementView("text")).not.toBeNull();
  });
});
