# Diff Pane Actions Design

## Context

The current Diff toolbar combines two unrelated concerns in one horizontal row:

- `Source / Bytecode` controls how the selected Diff tab is rendered.
- Copy, take-all, and move-hunk controls modify the left or right side.

Even after grouping the merge controls, a single right-aligned action cluster still requires users to interpret arrow direction before they can identify the target pane. This redesign separates view selection from merge actions and makes pane ownership spatially explicit.

## View Mode Switch

Move the `Source / Bytecode` segmented control from `DiffView` into the workspace tab strip.

- It appears at the far right of the tab strip when a Diff tab is active.
- It remains hidden while the Files tab is active because there is no active editor view to change.
- Existing selected, disabled, source-loading, and bytecode-loading behavior remains unchanged.
- The control changes the rendering mode of the complete active Diff tab. It is not duplicated per pane.
- View mode uses the same tab-strip placement when a Diff tab is active.

This establishes `Source / Bytecode` as tab-level navigation instead of a merge operation.

## Pane Action Bar

Replace the single `compare-actions` cluster with a two-column pane action bar directly above the two Monaco panes. Its column split must match the editor split.

The bar contains no visible `Left`, `Right`, `Left Target`, or `Right Target` text. Pane position, mirrored action order, arrow direction, and the center divider communicate ownership.

### Left pane group

The group is contained entirely inside the left half and aligned toward the left:

1. `Copy file ←`
2. `Take all ←`
3. `Move hunk ←`

`Move hunk ←` is closest to the center divider.

### Right pane group

The group is contained entirely inside the right half and aligned toward the right:

1. `Move hunk →`
2. `Take all →`
3. `Copy file →`

`Move hunk →` is closest to the center divider. The complete layout is therefore symmetrical around the pane boundary.

## Rendering Rules

- The pane action bar renders only in Compare mode and only while a Diff tab is active.
- Whole-file copy actions follow their existing selected-entry and directory enablement rules.
- Take-all and move-hunk actions render only when hunk merge is available, preserving current behavior.
- Existing callback direction, staging semantics, unsaved-buffer semantics, and tooltips remain unchanged.
- View mode renders no pane action bar and reserves no vertical space for it.
- Non-active Diff tabs do not render controls into the tab strip.

## Responsive Behavior

At desktop widths, the action bar uses two equal `minmax(0, 1fr)` columns with a center divider aligned to the Monaco split.

When a group cannot fit:

- each half scrolls horizontally inside its own pane boundary;
- the left and right groups never overlap or flow into the opposite side;
- buttons retain visible labels and directional arrows;
- the `Source / Bytecode` control remains anchored at the right end of the tab strip.

No responsive breakpoint may duplicate or collapse the two target groups into a single ambiguous cluster.

## Component Boundaries

- `WorkspaceTabs` owns the tab-level `Source / Bytecode` control and receives the existing view-mode state and callbacks from `App`.
- `DiffView` owns the pane action bar because it already owns merge callbacks, selected-entry state, and hunk-merge availability.
- `App` keeps the authoritative `viewMode` state and passes the same state to both components. No new global state or persistence key is introduced.
- Styling remains in the existing workspace visual-system section of `src/styles.css`.

## Accessibility

- The tab-level segmented control keeps the accessible group name `Diff view mode` and existing pressed states.
- The two action groups are named `Actions into left pane` and `Actions into right pane` for assistive technology only.
- Individual button labels continue to identify the target side explicitly.
- Keyboard order follows visual order: view-mode controls first, then left-pane actions, then right-pane actions.
- Hidden controls are removed from the DOM rather than disabled when they have no meaning in the active workspace state.

## Testing

Component and integration tests must prove:

- `WorkspaceTabs` shows the view-mode switch only for an active Diff tab and dispatches Source/Bytecode callbacks.
- `DiffView` renders two separate accessible pane-action groups in Compare mode.
- The left and right groups contain only actions targeting their own pane and use the approved mirrored order.
- View mode and the Files tab expose no merge action bar.
- Existing copy, take-all, move-hunk, source, and bytecode callbacks still fire with unchanged arguments.
- Rendered verification covers a populated Compare Diff, View mode, desktop width, and a compact width without overlap or page-level horizontal overflow.

## Non-goals

- Changing merge algorithms, staging, save behavior, editor orientation, or Monaco configuration.
- Supporting independent Source/Bytecode modes per pane.
- Adding permanent side labels to the editor or toolbar.
- Redesigning workspace tabs, Files navigation, search, or Preferences outside the minimum integration required for the moved control.
