# Preferences Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Preferences drawer polish regressions, clarify Monaco minimap behavior, and add compact previous/next diff-block navigation.

**Architecture:** Keep Preferences as a frontend adapter concern. `App.tsx` owns preference persistence, system-font loading, and mounted Monaco refs; `ConfigDrawer` and section components render controls; `DiffView` renders editor actions and the navigator controls passed from `App.tsx`.

**Tech Stack:** React, TypeScript, Tauri IPC, Monaco via `@monaco-editor/react`, shadcn/Radix primitives, Tailwind v4 CSS, Vitest, Testing Library, Playwright render verifier.

---

## File Map

- Modify `src/lib/preferences.ts`
  - Adjust light-mode CSS variable tokens.
  - Keep `UiPreferences` shape unchanged.
  - Preserve normalization behavior.

- Modify `src/components/ConfigDrawer.tsx`
  - Trigger system font loading once when Preferences opens and the font state is idle.
  - Keep Editor click as a defensive font-load trigger.

- Modify `src/components/preferences/EditorPreferences.tsx`
  - Rename minimap label to `Monaco minimap`.
  - Add overflow-safe class hooks to the font select.
  - Keep fallback/loading notes non-blocking.

- Modify `src/components/preferences/AppearancePreferences.tsx`
  - Add class hook for overflow-safe pattern buttons.

- Modify `src/components/preferences/MiscPreferences.tsx`
  - Add class hook for overflow-safe segmented labels.

- Modify `src/components/DiffView.tsx`
  - Pass explicit Monaco minimap options.
  - Add a `diffNavigator` prop.
  - Render compact previous/current/next diff controls in compare mode.

- Modify `src/App.tsx`
  - Compute diff-block navigation state from `diffEditorRef.current.getLineChanges()`.
  - Wire previous/next callbacks using `revealLineInCenter`.
  - Refresh navigator state after diff mount, preview changes, selection changes, cursor movement, and navigation.

- Modify `src/styles.css`
  - Consolidate duplicated Preferences drawer rules.
  - Add overflow-safe rules for Appearance, Editor font select, Misc segmented controls, and diff navigator.

- Modify tests:
  - `src/components/ConfigDrawer.test.tsx`
  - `src/components/DiffView.test.tsx`
  - `src/lib/preferences.test.ts`

- Modify `scripts/verify-frontend-render.mjs`
  - Mock long installed font families.
  - Verify Light mode, System button containment, long font select, Misc segmented control, and diff navigator geometry.

---

### Task 1: Lock Preference Regression Tests

**Files:**
- Modify: `src/components/ConfigDrawer.test.tsx`
- Modify: `src/lib/preferences.test.ts`

- [ ] **Step 1: Add ConfigDrawer tests for first-open font loading and overflow-safe labels**

Add these tests inside `describe("ConfigDrawer", () => { ... })`:

```tsx
it("requests system fonts when Preferences opens in the idle state", () => {
  const props = setup({ fontStatus: "idle" });

  expect(props.onLoadSystemFonts).toHaveBeenCalledTimes(1);
});

it("keeps Appearance, Editor, and Misc controls marked for overflow-safe layout", async () => {
  setup({
    systemFonts: [
      { family: "A Very Long Installed Developer Font Family Name That Should Not Overflow", monospaceLikely: true },
      ...FALLBACK_SYSTEM_FONTS,
    ],
  });

  const appearancePanel = screen.getByRole("region", { name: "Appearance preferences" });
  expect(appearancePanel.querySelector(".appearance-pattern-grid")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "System" })).toHaveClass("preference-choice");

  await userEvent.click(screen.getByRole("button", { name: "Editor" }));
  expect(screen.getByLabelText("Editor font family")).toHaveClass("editor-font-select-trigger");
  expect(screen.getByText("Monaco minimap")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Misc" }));
  const segmented = screen.getByRole("group", { name: "Misc preference panels" });
  expect(segmented).toHaveClass("segmented-control");
  expect(within(segmented).getByRole("button", { name: "Decompiler" })).toHaveClass("segmented-control__button");
});
```

- [ ] **Step 2: Add a light-token regression test**

Append to `src/lib/preferences.test.ts`:

```ts
it("applies light appearance tokens with distinct drawer-safe surfaces", () => {
  const root = document.createElement("div");

  applyPreferencesToRoot(
    root,
    { ...DEFAULT_UI_PREFERENCES, appearance: { colorPattern: "light" } },
    false,
  );

  expect(root.dataset.effectiveColorPattern).toBe("light");
  expect(root.style.getPropertyValue("--ink-0")).not.toBe(root.style.getPropertyValue("--ink-1"));
  expect(root.style.getPropertyValue("--ink-1")).not.toBe(root.style.getPropertyValue("--ink-2"));
  expect(root.style.getPropertyValue("--line")).not.toBe("");
  expect(root.style.getPropertyValue("--text-0")).not.toBe(root.style.getPropertyValue("--text-2"));
});
```

- [ ] **Step 3: Run the focused tests and verify they fail**

Run:

```bash
rtk npm test -- src/components/ConfigDrawer.test.tsx src/lib/preferences.test.ts
```

Expected:

- ConfigDrawer test fails because `onLoadSystemFonts` is not called on open.
- Class hook assertions fail for controls that do not have the new classes.
- Minimap label assertion fails because the label still says `Minimap`.

- [ ] **Step 4: Commit failing tests**

```bash
rtk git add src/components/ConfigDrawer.test.tsx src/lib/preferences.test.ts
rtk git commit -m "test(ui): cover preferences polish regressions"
```

---

### Task 2: Fix Preferences Font Loading and Control Markup

**Files:**
- Modify: `src/components/ConfigDrawer.tsx`
- Modify: `src/components/preferences/AppearancePreferences.tsx`
- Modify: `src/components/preferences/EditorPreferences.tsx`
- Modify: `src/components/preferences/MiscPreferences.tsx`

- [ ] **Step 1: Load fonts when Preferences opens**

In `src/components/ConfigDrawer.tsx`, import `useEffect`:

```tsx
import { useEffect, useState } from "react";
```

Add this effect after local state declarations:

```tsx
  useEffect(() => {
    if (open && fontStatus === "idle") {
      onLoadSystemFonts();
    }
  }, [fontStatus, onLoadSystemFonts, open]);
```

Keep the existing Editor click behavior:

```tsx
if (item.id === "editor") onLoadSystemFonts();
```

The load helper already ignores `loading` and `ready`, so repeated calls are safe.

- [ ] **Step 2: Add overflow-safe button classes to Appearance**

In `src/components/preferences/AppearancePreferences.tsx`, add `className` to the pattern button:

```tsx
            className="preference-choice appearance-pattern-grid__button"
```

The final button opening should look like:

```tsx
          <Button
            key={pattern.id}
            type="button"
            className="preference-choice appearance-pattern-grid__button"
            variant={preferences.appearance.colorPattern === pattern.id ? "secondary" : "outline"}
            size="sm"
            aria-pressed={preferences.appearance.colorPattern === pattern.id}
            onClick={() => onPreferencesChange({
              ...preferences,
              appearance: { colorPattern: pattern.id },
            })}
          >
```

- [ ] **Step 3: Add Editor font select classes and minimap label**

In `src/components/preferences/EditorPreferences.tsx`, change the font trigger:

```tsx
        <SelectTrigger className="editor-font-select-trigger" aria-label="Editor font family">
          <SelectValue />
        </SelectTrigger>
```

Change each font item to:

```tsx
              <SelectItem className="editor-font-select-item" key={font.family} value={font.family}>
                {font.family}{font.monospaceLikely ? " · mono" : ""}
              </SelectItem>
```

Change the minimap label text from:

```tsx
        Minimap
```

to:

```tsx
        Monaco minimap
```

- [ ] **Step 4: Add Misc segmented button class**

In `src/components/preferences/MiscPreferences.tsx`, add:

```tsx
            className="segmented-control__button"
```

to the three panel buttons.

- [ ] **Step 5: Run focused tests**

Run:

```bash
rtk npm test -- src/components/ConfigDrawer.test.tsx src/lib/preferences.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit markup and loading changes**

```bash
rtk git add src/components/ConfigDrawer.tsx src/components/preferences/AppearancePreferences.tsx src/components/preferences/EditorPreferences.tsx src/components/preferences/MiscPreferences.tsx
rtk git commit -m "fix(ui): load preference fonts predictably"
```

---

### Task 3: Consolidate Preferences CSS and Light Tokens

**Files:**
- Modify: `src/lib/preferences.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Update light-mode tokens**

In `src/lib/preferences.ts`, replace the `lightVariables` object values with:

```ts
const lightVariables: Record<string, string> = {
  "--background": "oklch(0.982 0.006 235)",
  "--foreground": "oklch(0.18 0.022 245)",
  "--card": "oklch(0.965 0.008 235)",
  "--card-foreground": "oklch(0.18 0.022 245)",
  "--popover": "oklch(0.992 0.004 235)",
  "--popover-foreground": "oklch(0.18 0.022 245)",
  "--primary": "#2f7fb8",
  "--primary-foreground": "#f7fbff",
  "--secondary": "oklch(0.925 0.012 235)",
  "--secondary-foreground": "oklch(0.22 0.022 245)",
  "--muted": "oklch(0.93 0.01 235)",
  "--muted-foreground": "oklch(0.43 0.024 245)",
  "--accent": "oklch(0.9 0.018 235)",
  "--accent-foreground": "oklch(0.2 0.024 245)",
  "--destructive": "oklch(0.55 0.19 25)",
  "--border": "oklch(0.53 0.026 245 / 28%)",
  "--input": "oklch(0.53 0.026 245 / 30%)",
  "--ring": "oklch(0.55 0.12 225 / 40%)",
  "--ink-0": "#eef3f8",
  "--ink-1": "#fbfdff",
  "--ink-2": "#e4ebf2",
  "--ink-3": "#d3dde8",
  "--line": "#c0cad6",
  "--line-soft": "#dce4ec",
  "--text-0": "#17212b",
  "--text-1": "#405060",
  "--text-2": "#687789",
  "--brass": "#2f7fb8",
  "--brass-dim": "#25658f",
  "--st-diff": "#a15c00",
  "--st-only": "#1d63b8",
  "--st-same": "#167347",
  "--danger": "#c92a2a",
};
```

- [ ] **Step 2: Remove duplicate drawer rules**

In `src/styles.css`, keep the richer absolute-position drawer block near `.config-drawer.open` and delete the later duplicate block that starts with:

```css
.config-drawer { flex: 0 0 auto; overflow-y: auto; border-left: 1px solid var(--border, #2c3a4f); transition: width 0.15s ease; }
.config-drawer.closed { width: 0; border-left: none; overflow: hidden; }
.config-drawer.open { width: 360px; padding: 0.75rem; }
.app-shell[data-drawer-width="wide"] .config-drawer.open { width: 420px; }
.preferences-drawer {
  display: grid;
}
```

Also merge any useful declarations from that duplicate block into the primary block:

```css
.preferences-drawer {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  align-content: start;
  gap: 0;
}

.preferences-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  padding-right: 0.65rem;
  border-right: 1px solid var(--line-soft);
}

.preferences-content {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 0.15rem 0.35rem 1rem;
}

.drawer-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0;
}
```

- [ ] **Step 3: Add overflow-safe control CSS**

Add this near the Preferences CSS block:

```css
.preference-choice,
.segmented-control__button,
.editor-font-select-trigger {
  min-width: 0;
}

.preference-choice,
.segmented-control__button {
  overflow: hidden;
  text-overflow: ellipsis;
}

.appearance-pattern-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
}

.appearance-pattern-grid__button {
  min-height: 2.2rem;
  justify-content: flex-start;
}

.segmented-control {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.35rem;
}

.segmented-control__button {
  justify-content: center;
}

.editor-font-select-trigger {
  width: 100%;
  max-width: 100%;
}

.editor-font-select-trigger [data-slot="select-value"],
.editor-font-select-item [data-slot="select-item-text"] {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

If `SelectPrimitive.ItemText` does not emit `data-slot="select-item-text"`, Task 4 will add that data slot.

- [ ] **Step 4: Run tests and style smoke**

Run:

```bash
rtk npm test -- src/components/ConfigDrawer.test.tsx src/lib/preferences.test.ts
rtk npm run verify:frontend
```

Expected: PASS.

- [ ] **Step 5: Commit CSS/token changes**

```bash
rtk git add src/lib/preferences.ts src/styles.css
rtk git commit -m "fix(ui): harden preferences layout tokens"
```

---

### Task 4: Make Select Text Ellipsis Reliable

**Files:**
- Modify: `src/components/ui/select.tsx`

- [ ] **Step 1: Add a stable data slot to select item text**

In `src/components/ui/select.tsx`, change:

```tsx
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
```

to:

```tsx
      <SelectPrimitive.ItemText>
        <span data-slot="select-item-text">{children}</span>
      </SelectPrimitive.ItemText>
```

- [ ] **Step 2: Tighten select item layout**

In the `SelectItem` class list, append:

```tsx
"min-w-0"
```

and ensure the item-text span can shrink by keeping the CSS from Task 3:

```css
.editor-font-select-item [data-slot="select-item-text"] {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 3: Run component tests**

Run:

```bash
rtk npm test -- src/components/ConfigDrawer.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit select ellipsis support**

```bash
rtk git add src/components/ui/select.tsx src/styles.css
rtk git commit -m "fix(ui): constrain long select labels"
```

---

### Task 5: Add Diff Navigator Tests

**Files:**
- Modify: `src/components/DiffView.test.tsx`

- [ ] **Step 1: Extend test props with diff navigator**

In `renderDiffView`, add defaults:

```tsx
    diffNavigator: {
      current: 0,
      total: 0,
      canGoPrevious: false,
      canGoNext: false,
      onPrevious: vi.fn(),
      onNext: vi.fn(),
    },
```

Add the override type:

```tsx
    diffNavigator: {
      current: number;
      total: number;
      canGoPrevious: boolean;
      canGoNext: boolean;
      onPrevious: () => void;
      onNext: () => void;
    };
```

- [ ] **Step 2: Add minimap option test**

Append:

```tsx
it("passes explicit Monaco minimap options when enabled", () => {
  const preferences: UiPreferences = {
    ...DEFAULT_UI_PREFERENCES,
    editor: {
      ...DEFAULT_UI_PREFERENCES.editor,
      minimap: "on",
    },
  };

  renderDiffView("compare", preferences);

  expect(diffEditorMock.mock.calls[0]?.[0]).toMatchObject({
    options: {
      minimap: {
        enabled: true,
        side: "right",
        size: "proportional",
        showSlider: "mouseover",
      },
    },
  });
});
```

- [ ] **Step 3: Add navigator render and callback tests**

Append:

```tsx
it("renders compact diff navigator in compare mode", () => {
  const onPrevious = vi.fn();
  const onNext = vi.fn();

  renderDiffView("compare", DEFAULT_UI_PREFERENCES, "dark", {
    diffNavigator: {
      current: 3,
      total: 12,
      canGoPrevious: true,
      canGoNext: true,
      onPrevious,
      onNext,
    },
  });

  const navigator = screen.getByRole("group", { name: "Diff block navigation" });
  expect(within(navigator).getByText("3/12")).toBeInTheDocument();

  fireEvent.click(within(navigator).getByRole("button", { name: "Previous diff block" }));
  fireEvent.click(within(navigator).getByRole("button", { name: "Next diff block" }));

  expect(onPrevious).toHaveBeenCalledTimes(1);
  expect(onNext).toHaveBeenCalledTimes(1);
});

it("disables diff navigator when no diff blocks exist", () => {
  renderDiffView("compare", DEFAULT_UI_PREFERENCES);

  const navigator = screen.getByRole("group", { name: "Diff block navigation" });
  expect(within(navigator).getByText("0/0")).toBeInTheDocument();
  expect(within(navigator).getByRole("button", { name: "Previous diff block" })).toBeDisabled();
  expect(within(navigator).getByRole("button", { name: "Next diff block" })).toBeDisabled();
});

it("hides diff navigator in single mode", () => {
  renderDiffView("single", DEFAULT_UI_PREFERENCES);

  expect(screen.queryByRole("group", { name: "Diff block navigation" })).not.toBeInTheDocument();
});
```

- [ ] **Step 4: Run tests and verify they fail**

Run:

```bash
rtk npm test -- src/components/DiffView.test.tsx
```

Expected:

- Fails because `DiffView` has no `diffNavigator` prop.
- Fails because minimap options are currently only `{ enabled: true }`.
- Fails because navigator UI does not exist.

- [ ] **Step 5: Commit failing diff tests**

```bash
rtk git add src/components/DiffView.test.tsx
rtk git commit -m "test(ui): cover diff navigator"
```

---

### Task 6: Render Diff Navigator UI and Explicit Minimap Options

**Files:**
- Modify: `src/components/DiffView.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add DiffNavigatorProps**

In `src/components/DiffView.tsx`, add:

```tsx
interface DiffNavigatorProps {
  current: number;
  total: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}
```

Add to `DiffViewProps`:

```tsx
  diffNavigator: DiffNavigatorProps;
```

Destructure it from props:

```tsx
  fileMerge, hunkMerge, onDiffEditEither, onTakeAll, onMoveHunk, diffNavigator,
```

- [ ] **Step 2: Use explicit minimap options**

Replace:

```tsx
    minimap: { enabled: preferences.editor.minimap === "on" },
```

with:

```tsx
    minimap: preferences.editor.minimap === "on"
      ? { enabled: true, side: "right", size: "proportional", showSlider: "mouseover" }
      : { enabled: false },
```

- [ ] **Step 3: Add navigator render helper**

Add inside `DiffView` before `return`:

```tsx
  const renderDiffNavigator = () => {
    if (mode !== "compare") return null;
    return (
      <div className="diff-navigator" role="group" aria-label="Diff block navigation">
        <Button
          variant="outline"
          size="sm"
          aria-label="Previous diff block"
          disabled={!diffNavigator.canGoPrevious}
          onClick={diffNavigator.onPrevious}
        >
          ↑
        </Button>
        <span className="diff-navigator__count" aria-label="Current diff block">
          {diffNavigator.current}/{diffNavigator.total}
        </span>
        <Button
          variant="outline"
          size="sm"
          aria-label="Next diff block"
          disabled={!diffNavigator.canGoNext}
          onClick={diffNavigator.onNext}
        >
          ↓
        </Button>
      </div>
    );
  };
```

- [ ] **Step 4: Place navigator at the right edge of merge actions**

Change the compare-mode actions wrapper from two groups to a grid with a center/right navigator:

```tsx
      {mode === "compare" && (
        <div className="merge-actions">
          <div className="pane-actions pane-actions-left" role="group" aria-label="Actions into left pane">
            {renderCopyButton("left")}
            {hunkMerge && renderTakeAllButton("left")}
            {hunkMerge && renderMoveHunkButton("left")}
          </div>
          {renderDiffNavigator()}
          <div className="pane-actions pane-actions-right" role="group" aria-label="Actions into right pane">
            {hunkMerge && renderMoveHunkButton("right")}
            {hunkMerge && renderTakeAllButton("right")}
            {renderCopyButton("right")}
          </div>
        </div>
      )}
```

- [ ] **Step 5: Add navigator CSS**

In `src/styles.css`, add near editor/merge action rules:

```css
.merge-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 0.5rem;
}

.diff-navigator {
  display: inline-grid;
  grid-template-columns: 1.75rem minmax(2.6rem, auto) 1.75rem;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  min-width: 0;
}

.diff-navigator [data-slot="button"] {
  width: 1.75rem;
  height: 1.65rem;
  padding: 0;
}

.diff-navigator__count {
  min-width: 2.6rem;
  color: var(--text-1);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  text-align: center;
  white-space: nowrap;
}
```

If an existing `.merge-actions` rule already exists, merge these declarations rather than duplicating the selector.

- [ ] **Step 6: Run DiffView tests**

Run:

```bash
rtk npm test -- src/components/DiffView.test.tsx
```

Expected: PASS for the isolated `DiffView` component tests. Do not run the full frontend verifier yet because `App.tsx` does not pass the new required prop until Task 7.

- [ ] **Step 7: Leave DiffView changes unstaged for Task 7**

Do not commit here. Task 7 wires `App.tsx`, then commits the complete navigator slice together so the repository does not contain an intermediate commit that fails full frontend typechecking.

---

### Task 7: Wire Diff Navigator State in App

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add navigator state type near editor refs**

Add near existing type definitions or refs:

```ts
interface DiffNavigatorState {
  current: number;
  total: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

const EMPTY_DIFF_NAVIGATOR: DiffNavigatorState = {
  current: 0,
  total: 0,
  canGoPrevious: false,
  canGoNext: false,
};
```

Add React state near `fontStatus`:

```ts
  const [diffNavigatorState, setDiffNavigatorState] = useState<DiffNavigatorState>(EMPTY_DIFF_NAVIGATOR);
```

- [ ] **Step 2: Add helper functions for line changes**

Add below `loadSystemFonts` or near hunk helpers:

```ts
  function currentDiffLine(): number {
    const diffEditor = diffEditorRef.current;
    if (!diffEditor) return 1;
    const originalLine = diffEditor.getOriginalEditor().getPosition()?.lineNumber;
    const modifiedLine = diffEditor.getModifiedEditor().getPosition()?.lineNumber;
    return modifiedLine ?? originalLine ?? 1;
  }

  function validDiffLine(change: NonNullable<ReturnType<DiffCodeEditor["getLineChanges"]>>[number], side: Side): number {
    if (side === "left") {
      return change.originalEndLineNumber === 0
        ? Math.max(1, change.originalStartLineNumber)
        : change.originalStartLineNumber;
    }
    return change.modifiedEndLineNumber === 0
      ? Math.max(1, change.modifiedStartLineNumber)
      : change.modifiedStartLineNumber;
  }

  function focusedDiffSide(): Side {
    const diffEditor = diffEditorRef.current;
    if (!diffEditor) return "right";
    if (diffEditor.getOriginalEditor().hasTextFocus()) return "left";
    return "right";
  }
```

If the `DiffCodeEditor["getLineChanges"]` return type is awkward, define:

```ts
type MonacoLineChange = NonNullable<ReturnType<DiffCodeEditor["getLineChanges"]>>[number];
```

and use `MonacoLineChange`.

- [ ] **Step 3: Add navigator state refresh**

Add:

```ts
  const refreshDiffNavigator = useCallback(() => {
    const diffEditor = diffEditorRef.current;
    const changes = diffEditor?.getLineChanges() ?? [];
    if (!diffEditor || changes.length === 0) {
      setDiffNavigatorState(EMPTY_DIFF_NAVIGATOR);
      return;
    }

    const line = currentDiffLine();
    const activeIndex = Math.max(
      0,
      changes.findIndex((change) => {
        const start = change.modifiedStartLineNumber;
        const end = change.modifiedEndLineNumber === 0 ? start : change.modifiedEndLineNumber;
        return line >= start && line <= end;
      }),
    );
    const resolvedIndex = activeIndex === -1 ? 0 : activeIndex;

    setDiffNavigatorState({
      current: resolvedIndex + 1,
      total: changes.length,
      canGoPrevious: changes.length > 0,
      canGoNext: changes.length > 0,
    });
  }, []);
```

If TypeScript flags `activeIndex` as impossible to be `-1` after `Math.max`, use:

```ts
    const foundIndex = changes.findIndex(...);
    const resolvedIndex = foundIndex < 0 ? 0 : foundIndex;
```

- [ ] **Step 4: Add reveal helper and callbacks**

Add:

```ts
  const revealDiffBlock = useCallback((direction: -1 | 1) => {
    const diffEditor = diffEditorRef.current;
    const changes = diffEditor?.getLineChanges() ?? [];
    if (!diffEditor || changes.length === 0) {
      setDiffNavigatorState(EMPTY_DIFF_NAVIGATOR);
      return;
    }

    const line = currentDiffLine();
    const foundIndex = changes.findIndex((change) => {
      const start = change.modifiedStartLineNumber;
      const end = change.modifiedEndLineNumber === 0 ? start : change.modifiedEndLineNumber;
      return line >= start && line <= end;
    });
    const currentIndex = foundIndex < 0 ? 0 : foundIndex;
    const nextIndex = (currentIndex + direction + changes.length) % changes.length;
    const side = focusedDiffSide();
    const targetEditor = side === "left" ? diffEditor.getOriginalEditor() : diffEditor.getModifiedEditor();
    targetEditor.revealLineInCenter(validDiffLine(changes[nextIndex], side));
    targetEditor.focus();

    setDiffNavigatorState({
      current: nextIndex + 1,
      total: changes.length,
      canGoPrevious: true,
      canGoNext: true,
    });
  }, []);
```

Then create the prop object:

```ts
  const diffNavigator = useMemo(
    () => ({
      ...diffNavigatorState,
      onPrevious: () => revealDiffBlock(-1),
      onNext: () => revealDiffBlock(1),
    }),
    [diffNavigatorState, revealDiffBlock],
  );
```

- [ ] **Step 5: Refresh state after mount and content changes**

Change `handleDiffMount` to:

```ts
  const handleDiffMount = useCallback<DiffOnMount>((editor, monaco) => {
    diffEditorRef.current = editor;
    monacoRef.current = monaco;
    refreshDiffNavigator();
    const originalCursor = editor.getOriginalEditor().onDidChangeCursorPosition(refreshDiffNavigator);
    const modifiedCursor = editor.getModifiedEditor().onDidChangeCursorPosition(refreshDiffNavigator);
    editor.onDidDispose(() => {
      originalCursor.dispose();
      modifiedCursor.dispose();
    });
  }, [refreshDiffNavigator]);
```

Add effect:

```ts
  useEffect(() => {
    if (mode !== "compare") {
      setDiffNavigatorState(EMPTY_DIFF_NAVIGATOR);
      return;
    }
    window.requestAnimationFrame(refreshDiffNavigator);
  }, [mode, preview.left?.content, preview.right?.content, selected?.path, refreshDiffNavigator]);
```

- [ ] **Step 6: Pass navigator to DiffView**

At the `DiffView` callsite, add:

```tsx
                diffNavigator={diffNavigator}
```

- [ ] **Step 7: Run frontend type/test checks**

Run:

```bash
rtk npm test -- src/components/DiffView.test.tsx
rtk npm run verify:frontend
```

Expected: PASS.

- [ ] **Step 8: Commit the complete navigator slice**

```bash
rtk git add src/App.tsx src/components/DiffView.tsx src/styles.css
rtk git commit -m "feat(ui): wire diff block navigation"
```

---

### Task 8: Add Render Verification Coverage

**Files:**
- Modify: `scripts/verify-frontend-render.mjs`

- [ ] **Step 1: Mock long system fonts**

Find the `list_system_fonts` mock. Replace the empty array response:

```js
        if (cmd === "list_system_fonts") return [];
```

with:

```js
        if (cmd === "list_system_fonts") {
          return [
            { family: "A Very Long Installed Developer Font Family Name That Should Truncate Safely", monospaceLikely: true },
            { family: "JetBrains Mono Variable", monospaceLikely: true },
            { family: "Inter", monospaceLikely: false },
          ];
        }
```

- [ ] **Step 2: Verify Light mode and Appearance containment**

After opening Preferences and before switching to Misc, add:

```js
  await preferencesDrawer.getByRole("button", { name: "Light" }).click();
  const systemButtonBox = await preferencesDrawer.getByRole("button", { name: "System" }).boundingBox();
  const appearancePanelBox = await preferencesDrawer.getByRole("region", { name: "Appearance preferences" }).boundingBox();
  if (!systemButtonBox || !appearancePanelBox || systemButtonBox.x + systemButtonBox.width > appearancePanelBox.x + appearancePanelBox.width + 1) {
    throw new Error("System appearance button overflows its Preferences section");
  }
```

- [ ] **Step 3: Verify long font select containment**

After clicking Editor:

```js
  await preferencesDrawer.getByRole("button", { name: "Editor" }).click();
  const fontTrigger = preferencesDrawer.getByRole("combobox", { name: "Editor font family" });
  await fontTrigger.waitFor({ timeout: 5_000 });
  const fontTriggerBox = await fontTrigger.boundingBox();
  const preferencesContentBox = await preferencesDrawer.locator(".preferences-content").boundingBox();
  if (!fontTriggerBox || !preferencesContentBox || fontTriggerBox.x + fontTriggerBox.width > preferencesContentBox.x + preferencesContentBox.width + 1) {
    throw new Error("editor font select overflows Preferences content");
  }
  await preferencesDrawer.getByText("Monaco minimap").waitFor({ timeout: 5_000 });
```

- [ ] **Step 4: Verify Misc segmented containment**

After clicking Misc:

```js
  await preferencesDrawer.getByRole("button", { name: "Misc" }).click();
  const segmentedBox = await preferencesDrawer.locator(".segmented-control").boundingBox();
  const miscPanelBox = await preferencesDrawer.getByRole("region", { name: "Misc preferences" }).boundingBox();
  if (!segmentedBox || !miscPanelBox || segmentedBox.x + segmentedBox.width > miscPanelBox.x + miscPanelBox.width + 1) {
    throw new Error("Misc segmented control overflows Preferences content");
  }
```

- [ ] **Step 5: Verify diff navigator geometry**

After the verifier opens/selects a changed diff entry and the DiffEditor is visible, add:

```js
  const diffNavigator = mockedPage.getByRole("group", { name: "Diff block navigation" });
  await diffNavigator.waitFor({ timeout: 5_000 });
  const navigatorBox = await diffNavigator.boundingBox();
  const mergeActionsBox = await mockedPage.locator(".merge-actions").boundingBox();
  if (!navigatorBox || !mergeActionsBox) {
    throw new Error("diff navigator geometry is unavailable");
  }
  if (
    navigatorBox.x < mergeActionsBox.x ||
    navigatorBox.x + navigatorBox.width > mergeActionsBox.x + mergeActionsBox.width + 1 ||
    navigatorBox.y < mergeActionsBox.y ||
    navigatorBox.y + navigatorBox.height > mergeActionsBox.y + mergeActionsBox.height + 1
  ) {
    throw new Error("diff navigator overflows merge action row");
  }
```

- [ ] **Step 6: Run render verifier**

Run:

```bash
rtk npm run verify:frontend
```

Expected: PASS.

- [ ] **Step 7: Commit verifier coverage**

```bash
rtk git add scripts/verify-frontend-render.mjs
rtk git commit -m "test(ui): verify preferences and diff navigator render"
```

---

### Task 9: Final Verification

**Files:**
- No code changes expected.

- [ ] **Step 1: Run focused tests**

Run:

```bash
rtk npm test -- src/lib/preferences.test.ts src/lib/system-fonts.test.ts src/components/ConfigDrawer.test.tsx src/components/DiffView.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run frontend verification**

Run:

```bash
rtk npm run verify:frontend
```

Expected: PASS.

- [ ] **Step 3: Run umbrella gate**

Run:

```bash
rtk npm run verify:all
```

Expected: PASS.

- [ ] **Step 4: Check git status**

Run:

```bash
rtk git status --short --branch
```

Expected:

- Implementation files are clean after task commits.
- Pre-existing unrelated `platform-validation/*.md` deletions may still be present and must remain unstaged unless the user explicitly asks to handle them.

---

## Spec Coverage Self-Review

- Preferences CSS consolidation: Task 3.
- Light mode token cleanup: Task 3.
- Appearance `System` overflow: Tasks 1, 2, 3, 8.
- Predictable system font loading: Tasks 1, 2.
- Long font select overflow: Tasks 1, 2, 3, 4, 8.
- Misc segmented overflow: Tasks 1, 2, 3, 8.
- Monaco minimap clarity: Tasks 2, 5, 6.
- Diff block navigator: Tasks 5, 6, 7, 8.
- Verification ladder: Task 9.
