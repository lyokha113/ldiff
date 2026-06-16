import { describe, expect, it } from "vitest";
import {
  classifyFocusTarget,
  matchShortcut,
  parseShortcut,
  shortcutMatches,
  type KeyboardLikeEvent,
} from "@/lib/shortcuts";

function event(overrides: Partial<KeyboardLikeEvent>): KeyboardLikeEvent {
  return {
    key: "o",
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    target: undefined,
    ...overrides,
  };
}

describe("shortcuts", () => {
  it("parses CmdOrCtrl shortcuts", () => {
    expect(parseShortcut("CmdOrCtrl+Shift+O")).toEqual({
      key: "o",
      cmdOrCtrl: true,
      shift: true,
      alt: false,
    });
  });

  it("matches CmdOrCtrl to Meta on macOS", () => {
    const shortcut = parseShortcut("CmdOrCtrl+O");
    expect(shortcutMatches(event({ key: "o", metaKey: true }), shortcut, "darwin")).toBe(true);
    expect(shortcutMatches(event({ key: "o", ctrlKey: true }), shortcut, "darwin")).toBe(false);
  });

  it("matches CmdOrCtrl to Ctrl outside macOS", () => {
    const shortcut = parseShortcut("CmdOrCtrl+O");
    expect(shortcutMatches(event({ key: "o", ctrlKey: true }), shortcut, "linux")).toBe(true);
    expect(shortcutMatches(event({ key: "o", metaKey: true }), shortcut, "linux")).toBe(false);
  });

  it("matches bracket merge shortcuts", () => {
    expect(shortcutMatches(event({ key: "[", altKey: true }), parseShortcut("Alt+["), "darwin")).toBe(true);
    expect(shortcutMatches(event({ key: "]", altKey: true, shiftKey: true }), parseShortcut("Alt+Shift+]"), "linux")).toBe(true);
  });

  it("resolves the first matching action", () => {
    const action = matchShortcut(
      event({ key: "f", metaKey: true }),
      [
        { actionId: "search.toggle", shortcut: "CmdOrCtrl+F" },
        { actionId: "file.save", shortcut: "CmdOrCtrl+S" },
      ],
      "darwin",
    );
    expect(action).toBe("search.toggle");
  });
});

describe("focus classification", () => {
  it("classifies text inputs as editable", () => {
    const input = document.createElement("input");
    expect(classifyFocusTarget(input)).toBe("editable");
  });

  it("classifies contenteditable nodes as editable", () => {
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    expect(classifyFocusTarget(div)).toBe("editable");
  });

  it("classifies Monaco editor descendants as editable", () => {
    const wrapper = document.createElement("div");
    wrapper.className = "monaco-editor";
    const child = document.createElement("span");
    wrapper.appendChild(child);
    expect(classifyFocusTarget(child)).toBe("editable");
  });

  it("classifies buttons as non-editable", () => {
    expect(classifyFocusTarget(document.createElement("button"))).toBe("none");
  });
});
