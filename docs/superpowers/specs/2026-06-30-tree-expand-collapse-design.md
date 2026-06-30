# Tree Expand Collapse Design

## Goal

When a compare diff is loaded, the Files tree starts collapsed so large package
hierarchies are scannable. Users can expand or collapse the entire visible tree
from the Files strip.

## Product Behavior

- After opening both compare sides or after the visible file list changes, folder
  rows are collapsed by default.
- Manual folder toggles still work exactly as before.
- Files strip exposes two compact controls in compare mode:
  - `Expand all`: expands every visible folder in the current filtered tree.
  - `Collapse all`: collapses every visible folder in the current filtered tree.
- The controls are hidden in single/view mode together with the compare-only tree
  filter.
- Nested archive rows keep lazy loading semantics: expanding all opens known
  visible tree folders but does not prefetch nested archive children that have
  not been loaded.

## Architecture

`App.tsx` owns two numeric commands, `treeExpandAllVersion` and
`treeCollapseAllVersion`, and passes them to `FileTree`. `WorkspaceTabs` renders
the expand/collapse buttons beside the tree filter and emits callbacks to bump
those commands. `FileTree` computes visible folder paths from its built tree and
reacts to command version changes by replacing its local `expanded` set.

## Verification

- Component tests pin default collapsed state, manual toggle behavior, expand
  all, collapse all, and WorkspaceTabs button placement.
- Render verification checks the populated mocked compare tree starts collapsed
  and reveals nested files only after the expand-all control is used.
