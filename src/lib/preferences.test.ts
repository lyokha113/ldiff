import { beforeEach, describe, expect, it } from "vitest";
import {
  applyPreferencesToRoot,
  DEFAULT_EDITOR_FONT_FAMILY,
  DEFAULT_UI_PREFERENCES,
  effectiveColorPattern,
  loadUiPreferences,
  mergeUiPreferences,
  normalizeUiPreferences,
  saveUiPreferences,
  UI_PREFERENCES_STORAGE_KEY,
  type UiPreferences,
} from "@/lib/preferences";

describe("UI preferences persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when storage is empty", () => {
    const preferences = loadUiPreferences();

    expect(preferences).toEqual(DEFAULT_UI_PREFERENCES);
    expect(preferences).not.toBe(DEFAULT_UI_PREFERENCES);
  });

  it("returns fresh defaults when storage contains invalid JSON", () => {
    localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, "{not json");

    const preferences = loadUiPreferences();

    expect(preferences).toEqual(DEFAULT_UI_PREFERENCES);
    expect(preferences).not.toBe(DEFAULT_UI_PREFERENCES);
  });

  it("merges old persisted shape into the new Preferences contract", () => {
    localStorage.setItem(
      UI_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        appearance: { colorMode: "light", themeId: "github-light" },
        typography: { editorFont: "systemMono", editorScale: 15 },
        editor: { wordWrap: "on" },
        search: { includeSourceByDefault: true, resultGrouping: "side" },
      }),
    );

    expect(loadUiPreferences()).toEqual({
      ...DEFAULT_UI_PREFERENCES,
      appearance: { colorPattern: "light" },
      editor: {
        ...DEFAULT_UI_PREFERENCES.editor,
        fontFamily: "ui-monospace, monospace",
        fontSize: 15,
        wordWrap: "on",
      },
      misc: {
        ...DEFAULT_UI_PREFERENCES.misc,
        search: {
          includeSourceByDefault: true,
          resultGrouping: "side",
        },
      },
    });
  });

  it("falls back to defaults for unknown enum and invalid numeric values", () => {
    expect(
      mergeUiPreferences({
        appearance: { colorPattern: "sepia" },
        editor: {
          fontFamily: "",
          fontSize: 99,
          wordWrap: "sometimes",
          lineNumbers: "maybe",
          minimap: "huge",
        },
        misc: {
          search: { includeSourceByDefault: "yes", resultGrouping: "folder" },
          decompiler: { engine: "fernflower", ignoreTrimWhitespace: "yes" },
          save: { backupEnabled: "always" },
        },
      }),
    ).toEqual(DEFAULT_UI_PREFERENCES);
  });

  it("falls back when a selected font is unavailable", () => {
    const preferences = normalizeUiPreferences(
      {
        ...DEFAULT_UI_PREFERENCES,
        editor: {
          ...DEFAULT_UI_PREFERENCES.editor,
          fontFamily: "Missing Font",
        },
      },
      ["Menlo", DEFAULT_EDITOR_FONT_FAMILY],
    );

    expect(preferences.editor.fontFamily).toBe(DEFAULT_EDITOR_FONT_FAMILY);
  });

  it("keeps a selected font when it is available", () => {
    const preferences = normalizeUiPreferences(
      {
        ...DEFAULT_UI_PREFERENCES,
        editor: {
          ...DEFAULT_UI_PREFERENCES.editor,
          fontFamily: "Menlo",
        },
      },
      ["Menlo", DEFAULT_EDITOR_FONT_FAMILY],
    );

    expect(preferences.editor.fontFamily).toBe("Menlo");
  });

  it("writes normalized preferences JSON to localStorage", () => {
    const preferences: UiPreferences = {
      ...DEFAULT_UI_PREFERENCES,
      appearance: { colorPattern: "system" },
      editor: {
        ...DEFAULT_UI_PREFERENCES.editor,
        fontSize: 16,
      },
    };

    saveUiPreferences(preferences);

    expect(JSON.parse(localStorage.getItem(UI_PREFERENCES_STORAGE_KEY) ?? "")).toEqual(
      preferences,
    );
  });

  it("computes effective color pattern from system preference", () => {
    expect(effectiveColorPattern("light", true)).toBe("light");
    expect(effectiveColorPattern("dark", false)).toBe("dark");
    expect(effectiveColorPattern("system", true)).toBe("dark");
    expect(effectiveColorPattern("system", false)).toBe("light");
  });

  it("applies only appearance variables to the app root", () => {
    const root = document.createElement("div");
    const preferences: UiPreferences = {
      ...DEFAULT_UI_PREFERENCES,
      appearance: { colorPattern: "light" },
      editor: {
        ...DEFAULT_UI_PREFERENCES.editor,
        fontFamily: "Menlo",
        fontSize: 18,
      },
    };

    applyPreferencesToRoot(root, preferences, false);

    expect(root.dataset.colorPattern).toBe("light");
    expect(root.dataset.effectiveColorPattern).toBe("light");
    expect(root.style.getPropertyValue("--background")).not.toBe("");
    expect(root.style.getPropertyValue("--font-mono")).toBe("");
    expect(root.style.getPropertyValue("--ldiff-editor-font-size")).toBe("");
  });
});
