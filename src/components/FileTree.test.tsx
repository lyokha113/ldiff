import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FileTree } from "@/components/FileTree";
import type { ComparePair } from "@/lib/types";

const pairs: ComparePair[] = [
  { path: "com/example/App.class", status: "different", left: { path: "com/example/App.class", kind: "class" }, right: { path: "com/example/App.class", kind: "class" } },
  { path: "top.txt", status: "onlyLeft", left: { path: "top.txt", kind: "text" } },
];

function setup(overrides = {}) {
  const props = {
    visiblePairs: pairs, selected: undefined, stagedEntries: {}, mode: "compare" as const,
    onInspect: vi.fn(), onSelect: vi.fn(), onCopy: vi.fn(), onUnstage: vi.fn(),
    ...overrides,
  };
  render(<FileTree {...props} />);
  return props;
}

describe("FileTree", () => {
  it("renders folders and files; diff folders auto-expand to show files", () => {
    setup();
    expect(screen.getByText("com")).toBeInTheDocument();
    expect(screen.getByText("App.class")).toBeInTheDocument();
    expect(screen.getByText("top.txt")).toBeInTheDocument();
  });
  it("collapsing a folder hides its files", async () => {
    setup();
    await userEvent.click(screen.getByText("com"));
    expect(screen.queryByText("App.class")).not.toBeInTheDocument();
  });
  it("clicking a file calls onInspect with its pair", async () => {
    const props = setup();
    await userEvent.click(screen.getByText("top.txt"));
    expect(props.onInspect).toHaveBeenCalledWith(pairs[1]);
  });
  it("shows the status glyph for a file", () => {
    setup();
    expect(screen.getByLabelText("left only")).toBeInTheDocument();
    expect(screen.getByLabelText("modified")).toBeInTheDocument();
  });
});
