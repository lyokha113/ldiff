# Tree Expand Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make compare Files trees collapsed by default and add expand-all/collapse-all controls.

**Architecture:** Keep tree expansion state local to `FileTree`; `App.tsx` only sends monotonic command counters. `WorkspaceTabs` owns placement of the controls beside the compare tree filter.

**Tech Stack:** React, Vitest, Testing Library, Playwright render verifier.

---

### Task 1: Pin Tree Expansion Contract

**Files:**
- Modify: `src/components/FileTree.test.tsx`
- Modify: `src/components/WorkspaceTabs.test.tsx`
- Modify: `scripts/verify-frontend-render.mjs`

- [ ] Add failing FileTree tests for default collapsed state, expand-all command, and collapse-all command.
- [ ] Add failing WorkspaceTabs test proving `Expand all` and `Collapse all` buttons render after the tree filter in compare mode and are hidden in single mode.
- [ ] Add failing render-verifier assertions that populated mocked compare tree starts collapsed and expands after clicking `Expand all`.
- [ ] Run `rtk npm test -- src/components/FileTree.test.tsx src/components/WorkspaceTabs.test.tsx`.
- [ ] Run `rtk npm run verify:frontend-render`.

### Task 2: Implement Controls And Commands

**Files:**
- Modify: `src/components/FileTree.tsx`
- Modify: `src/components/WorkspaceTabs.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] Replace `defaultExpanded(tree)` with a collapsed default `new Set()`.
- [ ] Add helpers in `FileTree.tsx` to collect folder paths from the visible tree, including loaded nested archive children only.
- [ ] Add `expandAllVersion` and `collapseAllVersion` props to `FileTree`; react to version changes by setting all visible folders expanded or none expanded.
- [ ] Add `onExpandTree` and `onCollapseTree` props to `WorkspaceTabs`; render compact icon buttons beside the tree filter in compare mode.
- [ ] In `App.tsx`, hold command counters and pass callbacks/versions to the two components.
- [ ] Add CSS for a compact `.workspace-tree-actions` group so controls do not crowd the tab strip.
- [ ] Run focused tests and render verifier.

### Task 3: Full Verification And Commit

**Files:**
- Commit all modified source, tests, verifier, spec, and plan files.

- [ ] Run `rtk npm run verify:all`.
- [ ] Commit with message `feat(ui): add tree expand collapse controls`.
