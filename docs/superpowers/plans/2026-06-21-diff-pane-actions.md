# Diff Pane Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Source/Bytecode into the active Diff tab strip and split merge actions into mirrored left- and right-pane groups without visible side labels.

**Architecture:** `App` remains the owner of `viewMode` and passes tab-level view controls to `WorkspaceTabs`; `DiffView` is reduced to editor rendering plus pane-owned merge actions. The action bar uses the same two-column geometry as Monaco so spatial position and arrow direction communicate the target side without adding text labels.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS Grid/Flexbox, Vite, Playwright rendered verification.

---

## File Map

- `src/components/WorkspaceTabs.tsx`: active-Diff-only Source/Bytecode segmented control.
- `src/components/WorkspaceTabs.test.tsx`: visibility, pressed state, disabled state, and callback coverage for the moved control.
- `src/components/DiffView.tsx`: left- and right-pane action groups; no view-mode control.
- `src/components/DiffView.test.tsx`: group ownership, mirrored ordering, View omission, and callback direction.
- `src/App.tsx`: passes authoritative view-mode state to `WorkspaceTabs` and removes obsolete `DiffView` props.
- `src/App.test.tsx`: integration coverage that the active Diff tab owns the view switch and merge callbacks remain unchanged.
- `src/styles.css`: tab-strip switch and pane-aligned action-bar geometry.
- `scripts/verify-frontend-render.mjs`: populated Compare, View, and compact-width rendered assertions.

### Task 1: Move the View Switch into WorkspaceTabs

**Files:**
- Modify: `src/components/WorkspaceTabs.test.tsx`
- Modify: `src/components/WorkspaceTabs.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add failing WorkspaceTabs tests**

Extend the test setup with these props:

```tsx
viewMode: "source" as const,
canShowSource: true,
canShowBytecode: true,
onShowSource: vi.fn(),
onShowBytecode: vi.fn(),
```

Add the tests:

```tsx
it("shows the Diff view switch for an active Diff tab", () => {
  setup({ activeId: "com/x/Foo.class" });
  expect(screen.getByRole("group", { name: "Diff view mode" })).toBeInTheDocument();
});

it("hides the Diff view switch on the Files tab", () => {
  setup({ activeId: "files" });
  expect(screen.queryByRole("group", { name: "Diff view mode" })).not.toBeInTheDocument();
});

it("dispatches Source and Bytecode view changes", async () => {
  const props = setup({ activeId: "com/x/Foo.class" });
  await userEvent.click(screen.getByRole("button", { name: "Show bytecode" }));
  await userEvent.click(screen.getByRole("button", { name: "Show source" }));
  expect(props.onShowBytecode).toHaveBeenCalledTimes(1);
  expect(props.onShowSource).toHaveBeenCalledTimes(1);
});

it("preserves pressed and disabled view states", () => {
  setup({ activeId: "com/x/Foo.class", viewMode: "bytecode", canShowBytecode: false });
  expect(screen.getByRole("button", { name: "Show bytecode" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Show bytecode" })).toBeDisabled();
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
rtk npm test -- src/components/WorkspaceTabs.test.tsx
```

Expected: FAIL because `WorkspaceTabs` has no view-mode props or `Diff view mode` group.

- [ ] **Step 3: Add the view-switch contract to WorkspaceTabs**

Import `Binary`, `Code`, `Button`, and `ViewMode`. Extend `WorkspaceTabsProps`:

```tsx
viewMode: ViewMode;
canShowSource: boolean;
canShowBytecode: boolean;
onShowSource: () => void;
onShowBytecode: () => void;
```

After `.workspace-tabs-scroll`, render only when `activeId !== "files"`:

```tsx
{activeId !== "files" && (
  <div className="workspace-view-toggle" role="group" aria-label="Diff view mode">
    <Button
      variant={viewMode === "source" ? "secondary" : "ghost"}
      size="sm"
      aria-label="Show source"
      aria-pressed={viewMode === "source"}
      disabled={!canShowSource}
      onClick={onShowSource}
    >
      <Code /> Source
    </Button>
    <Button
      variant={viewMode === "bytecode" ? "secondary" : "ghost"}
      size="sm"
      aria-label="Show bytecode"
      aria-pressed={viewMode === "bytecode"}
      disabled={!canShowBytecode}
      onClick={onShowBytecode}
    >
      <Binary /> Bytecode
    </Button>
  </div>
)}
```

Pass the existing state and callbacks from `App`:

```tsx
viewMode={viewMode}
canShowSource={!!selected}
canShowBytecode={pairHasClass(selected)}
onShowSource={() => void showSource()}
onShowBytecode={() => void showBytecode()}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
rtk npm test -- src/components/WorkspaceTabs.test.tsx
```

Expected: all WorkspaceTabs tests pass.

- [ ] **Step 5: Commit the moved view switch**

```bash
rtk git add src/components/WorkspaceTabs.tsx src/components/WorkspaceTabs.test.tsx src/App.tsx
rtk git commit -m "refactor: move diff view switch into tabs"
```

### Task 2: Split Merge Actions by Target Pane

**Files:**
- Modify: `src/components/DiffView.test.tsx`
- Modify: `src/components/DiffView.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Replace the old action-cluster test with failing pane-group tests**

Remove `viewMode`, `canShowSource`, `canShowBytecode`, `onShowSource`, and `onShowBytecode` from the DiffView test setup after production props are removed. Add:

```tsx
it("separates actions into mirrored target-pane groups", () => {
  setup({ hunkMerge: true });
  const left = screen.getByRole("group", { name: "Actions into left pane" });
  const right = screen.getByRole("group", { name: "Actions into right pane" });

  expect(within(left).getAllByRole("button").map((button) => button.textContent)).toEqual([
    "Copy file ←", "Take all ←", "Move hunk ←",
  ]);
  expect(within(right).getAllByRole("button").map((button) => button.textContent)).toEqual([
    "Move hunk →", "Take all →", "Copy file →",
  ]);
  expect(screen.queryByText(/Left Target|Right Target/i)).not.toBeInTheDocument();
});

it("dispatches pane actions with unchanged target directions", async () => {
  const props = setup({ hunkMerge: true });
  await userEvent.click(screen.getByRole("button", { name: "Copy file to left" }));
  await userEvent.click(screen.getByRole("button", { name: "Take all into left" }));
  await userEvent.click(screen.getByRole("button", { name: "Move hunk into right" }));
  expect(props.onCopy).toHaveBeenCalledWith("right", "left");
  expect(props.onTakeAll).toHaveBeenCalledWith("left");
  expect(props.onMoveHunk).toHaveBeenCalledWith("right");
});

it("renders neither pane action group in View mode", () => {
  setup({ mode: "single", hunkMerge: true });
  expect(screen.queryByRole("group", { name: "Actions into left pane" })).not.toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Actions into right pane" })).not.toBeInTheDocument();
});

it("no longer owns the Diff view switch", () => {
  setup();
  expect(screen.queryByRole("group", { name: "Diff view mode" })).not.toBeInTheDocument();
});
```

Import `userEvent` in this test file.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
rtk npm test -- src/components/DiffView.test.tsx
```

Expected: FAIL because `DiffView` still has one `Compare actions` group and still owns the view switch.

- [ ] **Step 3: Implement the two-column pane action bar**

Delete the `viewMode`, `canShowSource`, `canShowBytecode`, `onShowSource`, and `onShowBytecode` props and the complete `.view-toggle` block from `DiffView`. Remove the same props from its `App` call site.

Define three local render functions immediately before `return` so direction logic stays in one place:

```tsx
const renderCopyFile = (target: Side) => {
  const intoLeft = target === "left";
  const source = intoLeft ? "right" : "left";
  const entry = selected?.[source];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button
            variant="outline"
            size="sm"
            aria-label={`Copy file to ${target}`}
            disabled={!entry || entry.kind === "directory"}
            onClick={() => onCopy(source, target)}
          >
            {intoLeft ? "Copy file ←" : "Copy file →"}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent><p>{fileMerge
        ? `Copy the entire ${source} file onto the ${target} (saved bytes on disk, ignores unsaved edits)`
        : `Copy ${source} entry to ${target}`}</p></TooltipContent>
    </Tooltip>
  );
};

const renderTakeAll = (target: Side) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline" size="sm" aria-label={`Take all into ${target}`} onClick={() => onTakeAll(target)}>
        {target === "left" ? "Take all ←" : "Take all →"}
      </Button>
    </TooltipTrigger>
    <TooltipContent><p>{target === "left"
      ? "Replace the left pane with the right pane's current content (includes unsaved edits)"
      : "Replace the right pane with the left pane's current content (includes unsaved edits)"}</p></TooltipContent>
  </Tooltip>
);

const renderMoveHunk = (target: Side) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline" size="sm" aria-label={`Move hunk into ${target}`} onClick={() => onMoveHunk(target)}>
        {target === "left" ? "Move hunk ←" : "Move hunk →"}
      </Button>
    </TooltipTrigger>
    <TooltipContent><p>{target === "left"
      ? "Move the change at the cursor into the left pane and remove it from the right"
      : "Move the change at the cursor into the right pane and remove it from the left"}</p></TooltipContent>
  </Tooltip>
);
```

Replace `.compare-actions` with:

```tsx
{mode === "compare" && (
  <div className="pane-actions" aria-label="Merge actions">
    <div className="pane-actions__side pane-actions__side--left" role="group" aria-label="Actions into left pane">
      {renderCopyFile("left")}
      {hunkMerge && renderTakeAll("left")}
      {hunkMerge && renderMoveHunk("left")}
    </div>
    <div className="pane-actions__side pane-actions__side--right" role="group" aria-label="Actions into right pane">
      {hunkMerge && renderMoveHunk("right")}
      {hunkMerge && renderTakeAll("right")}
      {renderCopyFile("right")}
    </div>
  </div>
)}
```

Do not create exported components or new files.

Replace the old toolbar CSS with:

```css
.pane-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  min-height: 2.55rem;
  border-bottom: 1px solid var(--line-soft);
  background: color-mix(in oklab, var(--ink-1) 94%, transparent);
}
.pane-actions__side {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  padding: 0.35rem 0.55rem;
  overflow-x: auto;
}
.pane-actions__side--left { justify-content: flex-start; border-right: 1px solid var(--line); }
.pane-actions__side--right { justify-content: flex-end; }
.pane-actions__side > * { flex: 0 0 auto; }
```

- [ ] **Step 4: Run focused and App behavior tests**

Run:

```bash
rtk npm test -- src/components/DiffView.test.tsx src/App.test.tsx
```

Expected: all tests pass and existing merge behavior remains unchanged.

- [ ] **Step 5: Commit pane-aligned actions**

```bash
rtk git add src/components/DiffView.tsx src/components/DiffView.test.tsx src/App.tsx src/styles.css
rtk git commit -m "refactor: align diff actions with editor panes"
```

### Task 3: Tab-Strip Styling and Rendered Verification

**Files:**
- Modify: `src/styles.css`
- Modify: `src/App.test.tsx`
- Modify: `scripts/verify-frontend-render.mjs`

- [ ] **Step 1: Add failing App integration assertions**

In the existing test that opens a Diff tab, add:

```tsx
expect(screen.getByRole("group", { name: "Diff view mode" }))
  .toBeInTheDocument();
await user.click(screen.getByRole("tab", { name: /Files/ }));
expect(screen.queryByRole("group", { name: "Diff view mode" }))
  .not.toBeInTheDocument();
```

Add a Compare toolbar integration assertion after reopening the Diff tab:

```tsx
expect(screen.getByRole("group", { name: "Actions into left pane" })).toBeInTheDocument();
expect(screen.getByRole("group", { name: "Actions into right pane" })).toBeInTheDocument();
```

- [ ] **Step 2: Run the App test and verify RED if integration wiring is incomplete**

Run:

```bash
rtk npm test -- src/App.test.tsx
```

Expected: FAIL until `App` passes the complete view-switch contract and the pane groups render on an active Diff tab.

- [ ] **Step 3: Finish tab-strip and compact responsive styling**

Add:

```css
.workspace-view-toggle {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 0.15rem;
  margin-left: auto;
  padding-left: 0.35rem;
  border-left: 1px solid var(--line-soft);
}
.workspace-view-toggle [data-slot="button"] { min-height: 1.75rem; border-radius: 0.4rem; }
```

At the existing compact breakpoint, preserve labels and allow the tab list to shrink before the switch:

```css
.workspace-tabs-scroll { flex: 1 1 auto; min-width: 3rem; }
.workspace-view-toggle { position: sticky; right: 0; background: var(--ink-1); }
```

Do not add page-level overflow. Each `.pane-actions__side` remains its own horizontal scroll boundary.

- [ ] **Step 4: Extend rendered verification**

After the mocked flow opens `App.class`, assert:

```js
await mockedPage.getByRole("group", { name: "Diff view mode" }).waitFor({ timeout: 5_000 });
await mockedPage.getByRole("group", { name: "Actions into left pane" }).waitFor({ timeout: 5_000 });
await mockedPage.getByRole("group", { name: "Actions into right pane" }).waitFor({ timeout: 5_000 });
if (await mockedPage.locator(".pane-actions").getByText("Left Target").count()) {
  throw new Error("pane action bar rendered a forbidden left target label");
}
```

After switching to Files, assert the view switch is detached. After switching to View, assert both pane groups have count zero. Reuse the existing desktop `1280x800`, compact `1024x640`, and narrow `720x520` overflow checks.

- [ ] **Step 5: Run complete verification**

Run:

```bash
rtk npm test
rtk npm run verify:all
rtk git diff --check
```

Expected: every unit test passes; build, packaging-script invariants, frontend invariants, rendered verification, documentation invariants, and whitespace checks pass.

- [ ] **Step 6: Perform Browser visual QA**

Target flows:

```text
Compare -> open a Diff tab -> Source/Bytecode appears at the right of the tab strip.
Compare Diff -> left actions stay inside the left half and right actions stay inside the right half.
Files tab -> Source/Bytecode disappears.
View Diff -> no pane action bar is present.
Compact viewport -> labels remain readable and neither group crosses the center divider.
```

Collect page identity, DOM snapshot, console health, interaction proof, desktop screenshot, and compact screenshot. Use the Browser plugin first; if its runtime cannot inject the existing Tauri mock fixture, use the repository's rendered Playwright verifier for populated Diff evidence and record that limitation.

- [ ] **Step 7: Commit verification coverage**

```bash
rtk git add src/styles.css src/App.test.tsx scripts/verify-frontend-render.mjs
rtk git commit -m "test: verify pane-aligned diff toolbar"
```
